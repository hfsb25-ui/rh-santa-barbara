// Edge function: extrai holerites de um PDF usando Gemini Vision
// Não persiste nada. Devolve a estrutura para o admin revisar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  pdf_base64: string;
  mes_default?: number;
  ano_default?: number;
  empresa_id_default?: string;
}

const EXTRACT_PROMPT = `Você recebe um PDF que pode conter um ou vários holerites (recibos de pagamento) de funcionários brasileiros. Sua tarefa é EXTRAIR cada holerite individual em JSON estruturado.

Para cada holerite identificado, retorne um objeto com:
- pagina: número da página onde o holerite está (1-indexed)
- cpf: CPF do funcionário, APENAS DÍGITOS (11 caracteres). Se não encontrar, retorne null.
- nome: nome completo do funcionário em UPPERCASE
- mes: número do mês de referência (1-12)
- ano: ano de referência (4 dígitos)
- tipo_folha: "salario" | "adiantamento" | "decimo_terceiro" | "rescisao" | "complementar"
- empresa_nome: nome da empresa pagadora (se identificável) ou null
- proventos: array de { codigo, descricao, valor } - valor em número positivo (reais)
- descontos: array de { codigo, descricao, valor } - valor em número positivo (reais)
- valor_bruto: soma dos proventos (número)
- descontos_total: soma dos descontos (número)
- valor_liquido: valor líquido a receber (número)

REGRAS:
- Nomes SEMPRE em UPPERCASE
- Valores sempre em ponto decimal (ex: 1234.56)
- Não invente dados. Se um campo não existir no holerite, use null.
- Se a página não for um holerite (capa, índice, etc), ignore.
- codigo é o código numérico da rubrica quando aparece no holerite (ex: "001", "INSS"). Pode ser null.

Retorne APENAS JSON válido no formato:
{ "holerites": [ {...}, {...} ] }`;

async function callGeminiOnce(pdfBase64: string, apiKey: string, modelName: string): Promise<any> {
  const clean = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACT_PROMPT },
          { inline_data: { mime_type: "application/pdf", data: clean } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 32768,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await resp.text();
  if (!resp.ok) {
    const err: any = new Error(`Gemini error ${resp.status} (${modelName}): ${raw.slice(0, 500)}`);
    err.status = resp.status;
    throw err;
  }

  let json: any;
  try { json = JSON.parse(raw); } catch { throw new Error("Gemini retornou resposta não-JSON"); }
  const finishReason = json?.candidates?.[0]?.finishReason;
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") || "";
  if (!text) throw new Error("Gemini retornou conteúdo vazio. Verifique se o PDF não está protegido/escaneado.");

  const truncated = finishReason && finishReason !== "STOP";
  if (truncated) {
    console.warn(`[holerite-importar-pdf] resposta truncada (finishReason=${finishReason}) - tentando reparar JSON`);
  }

  return parseLooseJson(text, !!truncated);
}

function parseLooseJson(text: string, truncated: boolean): any {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  const candidate = m ? m[0] : text;
  try { return JSON.parse(candidate); } catch {}
  const repaired = repairJson(candidate);
  try { return JSON.parse(repaired); } catch (e: any) {
    if (truncated) throw new Error(`Resposta da IA foi truncada e não pôde ser reparada (PDF muito grande). Divida o PDF em arquivos menores. Detalhe: ${e?.message}`);
    throw new Error(`Resposta da IA não é JSON válido: ${e?.message}`);
  }
}

function repairJson(input: string): string {
  let str = input.trim();
  // Walk: drop last incomplete element by truncating to the last completed item inside the outermost array
  const stack: string[] = [];
  let inStr = false, esc = false;
  let lastItemEnd = -1;
  let rootArrayDepth = -1;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{" || c === "[") {
      stack.push(c);
      if (c === "[" && rootArrayDepth === -1) rootArrayDepth = stack.length;
    } else if (c === "}" || c === "]") {
      stack.pop();
      if (rootArrayDepth !== -1 && stack.length === rootArrayDepth) {
        // we just completed an element inside the root array
        lastItemEnd = i;
      }
    }
  }
  if (lastItemEnd > 0) {
    str = str.slice(0, lastItemEnd + 1);
  }
  str = str.replace(/,\s*$/, "");
  // close remaining brackets
  const stack2: string[] = [];
  inStr = false; esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{" || c === "[") stack2.push(c);
    else if (c === "}" || c === "]") stack2.pop();
  }
  while (stack2.length) {
    const open = stack2.pop();
    str += open === "{" ? "}" : "]";
  }
  return str;
}

const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

async function callGemini(pdfBase64: string, apiKey: string, model: string): Promise<any> {
  const primary = model || "gemini-2.0-flash";
  const chain = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastErr: any;
  for (const m of chain) {
    try {
      console.log(`[holerite-importar-pdf] tentando modelo ${m}`);
      return await callGeminiOnce(pdfBase64, apiKey, m);
    } catch (e: any) {
      lastErr = e;
      const status = e?.status;
      const msg = String(e?.message || "");
      const isQuota = status === 429 || /quota|rate.?limit|exceeded/i.test(msg);
      if (!isQuota) throw e;
      console.warn(`[holerite-importar-pdf] modelo ${m} sem cota (429), tentando próximo...`);
    }
  }
  throw new Error(`Todos os modelos Gemini falharam por cota. Último erro: ${lastErr?.message || lastErr}`);
}


function cleanCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;



    const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supaUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // valida role
    const { data: rolesData } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesData || []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("gestor")) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body.pdf_base64) {
      return new Response(JSON.stringify({ error: "pdf_base64 obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria job e processa em background (evita timeout 504 em PDFs grandes)
    const { data: job, error: errJob } = await supa
      .from("holerite_import_jobs")
      .insert({ user_id: userId, status: "processando" })
      .select("id")
      .single();
    if (errJob || !job) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar job: ${errJob?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processar = async () => {
      try {
        // 1) carrega configuração de IA do usuário (Gemini direto)
        const { data: cfg } = await supa
          .from("configuracoes_ia")
          .select("google_gemini_api_key, modelo, provedor")
          .limit(1)
          .maybeSingle();
        const geminiKey = (cfg as any)?.google_gemini_api_key || Deno.env.get("GOOGLE_GEMINI_API_KEY");
        if (!geminiKey) {
          throw new Error("Chave do Google Gemini não configurada em Configurações > IA.");
        }
        const modelo = (cfg as any)?.provedor === "gemini" ? ((cfg as any)?.modelo || "gemini-2.0-flash") : "gemini-2.0-flash";
        const extracted = await callGemini(body.pdf_base64, geminiKey, modelo);

        const holerites: any[] = Array.isArray(extracted?.holerites)
          ? extracted.holerites
          : [];

        // 2) busca employees + variaveis + empresas para matching
        const [{ data: employees }, { data: variaveis }, { data: empresas }] =
          await Promise.all([
            supa.from("employees").select("id, nome_completo, cpf, empresa_id").not("cpf", "is", null),
            supa.from("variaveis_folha").select("id, nome, codigo, tipo, empresa_id").eq("ativo", true),
            supa.from("empresas").select("id, nome"),
          ]);

        const empByCpf = new Map<string, any>();
        (employees || []).forEach((e: any) => {
          const c = cleanCpf(e.cpf);
          if (c) empByCpf.set(c, e);
        });

        const empresaByNome = new Map<string, any>();
        (empresas || []).forEach((e: any) => {
          empresaByNome.set(normalizeStr(e.nome), e);
        });

        function findVariavel(rubrica: { codigo?: string; descricao?: string }, tipo: "provento" | "desconto", empresaId: string | null) {
          const pool = (variaveis || []).filter((v: any) => v.tipo === tipo && (!v.empresa_id || v.empresa_id === empresaId));
          if (rubrica.codigo) {
            const byCode = pool.find((v: any) => (v.codigo || "").toLowerCase() === String(rubrica.codigo).toLowerCase());
            if (byCode) return byCode;
          }
          if (rubrica.descricao) {
            const target = normalizeStr(rubrica.descricao);
            const exact = pool.find((v: any) => normalizeStr(v.nome) === target);
            if (exact) return exact;
            const partial = pool.find((v: any) => normalizeStr(v.nome).includes(target) || target.includes(normalizeStr(v.nome)));
            if (partial) return partial;
          }
          return null;
        }

        // 3) processa cada holerite
        const resultado: any[] = [];
        for (const h of holerites) {
          const cpfClean = cleanCpf(h.cpf);
          const employee = cpfClean ? empByCpf.get(cpfClean) : null;

          let empresaId: string | null = null;
          if (h.empresa_nome) {
            const norm = normalizeStr(h.empresa_nome);
            const found = empresaByNome.get(norm) || Array.from(empresaByNome.entries()).find(([k]) => k.includes(norm) || norm.includes(k))?.[1];
            if (found) empresaId = found.id;
          }
          if (!empresaId && employee?.empresa_id) empresaId = employee.empresa_id;
          if (!empresaId) empresaId = body.empresa_id_default || null;

          const mes = h.mes || body.mes_default || null;
          const ano = h.ano || body.ano_default || null;

          // verifica duplicidade
          let jaExiste = false;
          if (employee && mes && ano) {
            const { data: existing } = await supa
              .from("folha_pagamento")
              .select("id")
              .eq("employee_id", employee.id)
              .eq("mes", mes)
              .eq("ano", ano)
              .eq("tipo_folha", h.tipo_folha || "salario")
              .maybeSingle();
            if (existing) jaExiste = true;
          }

          // mapeia rubricas
          const proventosMapped = (h.proventos || []).map((p: any) => {
            const variavel = findVariavel(p, "provento", empresaId);
            return { ...p, variavel_id: variavel?.id || null, variavel_nome: variavel?.nome || null };
          });
          const descontosMapped = (h.descontos || []).map((d: any) => {
            const variavel = findVariavel(d, "desconto", empresaId);
            return { ...d, variavel_id: variavel?.id || null, variavel_nome: variavel?.nome || null };
          });

          let status: "ok" | "sem_cpf" | "cpf_nao_encontrado" | "ja_existe" | "sem_periodo" = "ok";
          if (!cpfClean) status = "sem_cpf";
          else if (!employee) status = "cpf_nao_encontrado";
          else if (!mes || !ano) status = "sem_periodo";
          else if (jaExiste) status = "ja_existe";

          resultado.push({
            pagina: h.pagina,
            cpf: cpfClean,
            cpf_raw: h.cpf,
            nome: (h.nome || "").toUpperCase(),
            mes,
            ano,
            tipo_folha: h.tipo_folha || "salario",
            empresa_nome: h.empresa_nome,
            empresa_id: empresaId,
            employee_id: employee?.id || null,
            employee_nome: employee?.nome_completo || null,
            valor_bruto: Number(h.valor_bruto) || 0,
            descontos_total: Number(h.descontos_total) || 0,
            valor_liquido: Number(h.valor_liquido) || 0,
            proventos: proventosMapped,
            descontos: descontosMapped,
            status,
          });
        }

        await supa
          .from("holerite_import_jobs")
          .update({
            status: "concluido",
            resultado: { total: resultado.length, holerites: resultado },
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      } catch (e: any) {
        console.error("[holerite-importar-pdf] job error", e);
        await supa
          .from("holerite_import_jobs")
          .update({
            status: "erro",
            erro: e?.message || "Erro interno",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
    };

    // @ts-ignore EdgeRuntime disponível no edge-runtime
    EdgeRuntime.waitUntil(processar());

    return new Response(
      JSON.stringify({ job_id: job.id, status: "processando" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[holerite-importar-pdf]", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
