// Edge function: Exporta pacote ZIP de holerites assinados para fiscalização
// Apenas gestores/admin_parcial podem invocar. Empacota PDFs, certificados, selfies
// e registra trilha de auditoria imutável da exportação.

import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExportPayload {
  mes: number;
  ano: number;
  empresa_id?: string | null;
  tipo_contrato?: string | null;
  setor?: string | null;
  status?: string | null; // 'assinado' | 'pendente' | 'visualizado' | 'all'
  incluir_selfies?: boolean;
  incluir_certificados?: boolean;
  incluir_holerites?: boolean;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitize(s: string): string {
  return (s || "SEM_NOME")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toUpperCase()
    .slice(0, 60);
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
    const jwt = authHeader.slice(7);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // valida role
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("gestor") && !userRoles.includes("admin_parcial")) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ExportPayload = await req.json();
    const {
      mes, ano,
      empresa_id, tipo_contrato, setor, status,
      incluir_selfies = true,
      incluir_certificados = true,
      incluir_holerites = true,
    } = payload;

    if (!mes || !ano) {
      return new Response(JSON.stringify({ error: "mes e ano obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) buscar folhas do período
    let folhaQ = admin
      .from("folha_pagamento")
      .select("id, employee_id, empresa_id, mes, ano, valor_bruto, valor_liquido, tipo_folha")
      .eq("mes", mes)
      .eq("ano", ano);
    if (empresa_id) folhaQ = folhaQ.eq("empresa_id", empresa_id);
    const { data: folhas, error: fErr } = await folhaQ;
    if (fErr) throw fErr;

    if (!folhas || folhas.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum holerite no periodo" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const empIds = [...new Set(folhas.map((f: any) => f.employee_id))];
    const { data: emps } = await admin
      .from("employees")
      .select("id, nome_completo, cpf, cargo, setor, tipo_contrato, empresa_id")
      .in("id", empIds);
    const empMap = new Map((emps || []).map((e: any) => [e.id, e]));

    const empresaIds = [...new Set(folhas.map((f: any) => f.empresa_id).filter(Boolean))];
    const { data: empresasData } = await admin
      .from("empresas")
      .select("id, nome")
      .in("id", empresaIds.length ? empresaIds : ["00000000-0000-0000-0000-000000000000"]);
    const empresaMap = new Map((empresasData || []).map((e: any) => [e.id, e.nome]));

    // aplica filtros employee-level
    let folhasFiltradas = folhas.filter((f: any) => {
      const e: any = empMap.get(f.employee_id);
      if (!e) return false;
      if (tipo_contrato && e.tipo_contrato !== tipo_contrato) return false;
      if (setor && e.setor !== setor) return false;
      return true;
    });

    // 2) buscar assinaturas
    const folhaIds = folhasFiltradas.map((f: any) => f.id);
    const { data: assinaturas } = await admin
      .from("holerite_assinaturas")
      .select("*")
      .in("folha_pagamento_id", folhaIds.length ? folhaIds : ["00000000-0000-0000-0000-000000000000"]);
    const assMap = new Map((assinaturas || []).map((a: any) => [a.folha_pagamento_id, a]));

    // aplica filtro status
    if (status && status !== "all") {
      if (status === "nao_enviado") {
        folhasFiltradas = folhasFiltradas.filter((f: any) => !assMap.has(f.id));
      } else {
        folhasFiltradas = folhasFiltradas.filter((f: any) => {
          const a: any = assMap.get(f.id);
          return a && a.status === status;
        });
      }
    }

    // 3) montar ZIP
    const zip = new JSZip();
    let assinadosCount = 0;

    // dados para índice e planilha
    const linhas: any[] = [];

    for (const folha of folhasFiltradas as any[]) {
      const emp: any = empMap.get(folha.employee_id) || {};
      const ass: any = assMap.get(folha.id);
      const slug = `${sanitize(emp.nome_completo || "")}_${(emp.cpf || "").replace(/\D/g, "")}`;
      if (ass?.status === "assinado") assinadosCount++;

      const linha: any = {
        funcionario: emp.nome_completo || "",
        cpf: emp.cpf || "",
        empresa: empresaMap.get(folha.empresa_id) || "",
        contrato: emp.tipo_contrato || "",
        setor: emp.setor || "",
        cargo: emp.cargo || "",
        mes_ano: `${String(folha.mes).padStart(2, "0")}/${folha.ano}`,
        tipo_folha: folha.tipo_folha || "",
        valor_bruto: folha.valor_bruto,
        valor_liquido: folha.valor_liquido,
        status: ass?.status || "nao_enviado",
        protocolo: ass?.protocolo || "",
        data_assinatura: ass?.data_assinatura || "",
        ip: ass?.ip_publico || "",
        navegador: ass?.navegador || "",
        sistema: ass?.sistema_operacional || "",
        geo: ass?.geo_consentimento && ass?.geo_latitude
          ? `${ass.geo_latitude}, ${ass.geo_longitude}`
          : "Nao autorizada",
        hash_documento: ass?.hash_documento || "",
        hash_assinatura: ass?.hash_assinatura || "",
      };
      linhas.push(linha);

      // baixar arquivos
      if (ass) {
        if (incluir_holerites && ass.pdf_original_path) {
          const { data: file } = await admin.storage
            .from("holerites-assinados")
            .download(ass.pdf_original_path);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            zip.file(`holerites/${slug}_holerite.pdf`, buf);
          }
        }
        if (incluir_certificados && ass.pdf_certificado_path) {
          const { data: file } = await admin.storage
            .from("holerites-assinados")
            .download(ass.pdf_certificado_path);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            zip.file(`certificados/${slug}_certificado.pdf`, buf);
          }
        }
        if (incluir_selfies && ass.selfie_path) {
          const { data: file } = await admin.storage
            .from("holerites-assinados")
            .download(ass.selfie_path);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            zip.file(`evidencias/${slug}_selfie.jpg`, buf);
          }
        }
        if (incluir_selfies && ass.assinatura_imagem_path) {
          const { data: file } = await admin.storage
            .from("holerites-assinados")
            .download(ass.assinatura_imagem_path);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            zip.file(`evidencias/${slug}_assinatura.png`, buf);
          }
        }
      }
    }

    // 4) gerar CSV (mais leve que xlsx no servidor)
    const headers = Object.keys(linhas[0] || { funcionario: "" });
    const csvRows = [
      headers.join(";"),
      ...linhas.map((l) =>
        headers.map((h) => `"${String(l[h] ?? "").replace(/"/g, '""')}"`).join(";")
      ),
    ];
    zip.file(`_AUDITORIA.csv`, "\ufeff" + csvRows.join("\n"));

    // 5) índice em texto/HTML simples (PDF gerado no client a partir do JSON)
    const totalGeral = folhasFiltradas.length;
    const empresasNomes = [...new Set(folhasFiltradas.map((f: any) => empresaMap.get(f.empresa_id)).filter(Boolean))];
    const indice = {
      gerado_em: new Date().toISOString(),
      gerado_por: { id: user.id, email: user.email, nome: user.user_metadata?.nome_completo || user.email },
      periodo: `${String(mes).padStart(2, "0")}/${ano}`,
      empresas: empresasNomes,
      filtros: { mes, ano, empresa_id, tipo_contrato, setor, status },
      totais: {
        holerites: totalGeral,
        assinados: assinadosCount,
        pendentes: totalGeral - assinadosCount,
        percentual_assinatura: totalGeral > 0 ? Math.round((assinadosCount / totalGeral) * 100) : 0,
      },
      base_legal: [
        "Lei nº 14.063/2020 — Assinaturas eletrônicas",
        "CLT art. 464 — Comprovante de pagamento",
        "LGPD — Lei nº 13.709/2018",
      ],
      linhas,
    };
    zip.file(`_INDICE.json`, JSON.stringify(indice, null, 2));

    // README explicativo
    const readme = `PACOTE DE FISCALIZACAO - HOLERITES ASSINADOS
================================================
Periodo: ${String(mes).padStart(2, "0")}/${ano}
Gerado em: ${new Date().toLocaleString("pt-BR")}
Gerado por: ${user.email}
Empresas: ${empresasNomes.join(", ") || "Todas"}

Conteudo:
  _INDICE.json         -> Metadados completos (resumo + linhas + base legal)
  _AUDITORIA.csv       -> Planilha auditoria (Excel/LibreOffice)
  holerites/           -> PDFs originais assinados
  certificados/        -> Certificados de assinatura digital
  evidencias/          -> Selfies e imagens de assinatura manuscrita

Totais:
  Total de holerites: ${totalGeral}
  Assinados:          ${assinadosCount}
  Pendentes:          ${totalGeral - assinadosCount}

Base legal:
  - Lei nº 14.063/2020 (Assinaturas eletronicas)
  - CLT art. 464 (Comprovante de pagamento)
  - LGPD Lei nº 13.709/2018

Validacao publica:
  Cada protocolo pode ser verificado em:
  /validar-holerite/{protocolo}
`;
    zip.file(`README.txt`, readme);

    // 6) gerar bytes
    const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const hashPacote = await sha256Hex(zipBytes);

    // 7) registrar trilha (imutavel)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await admin.from("holerite_exportacoes_fiscalizacao").insert({
      exportado_por: user.id,
      nome_exportador: user.user_metadata?.nome_completo || user.email,
      email_exportador: user.email,
      filtros_aplicados: { mes, ano, empresa_id, tipo_contrato, setor, status },
      quantidade_holerites: totalGeral,
      quantidade_assinados: assinadosCount,
      hash_pacote: hashPacote,
      tamanho_bytes: zipBytes.length,
      ip,
      user_agent: ua,
    });

    return new Response(zipBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="fiscalizacao_${ano}${String(mes).padStart(2, "0")}.zip"`,
        "X-Hash-Pacote": hashPacote,
        "X-Total-Holerites": String(totalGeral),
        "X-Total-Assinados": String(assinadosCount),
      },
    });
  } catch (err: any) {
    console.error("[holerite-export-fiscalizacao]", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
