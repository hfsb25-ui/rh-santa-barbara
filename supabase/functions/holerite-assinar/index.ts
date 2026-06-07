// Edge function: assinatura digital de holerite
// Recebe PDF do holerite, selfie, assinatura manuscrita, geo e consentimento.
// Valida ownership server-side, computa hashes SHA-256, gera protocolo único,
// faz upload no Storage e cria/atualiza o registro em holerite_assinaturas
// com trilha de auditoria.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AssinarPayload {
  folha_pagamento_id: string;
  pdf_holerite_base64: string;
  selfie_base64: string;
  assinatura_base64: string;
  geo?: { lat: number; lng: number; consentimento: boolean } | null;
  user_agent?: string;
  navegador?: string;
  sistema_operacional?: string;
}

function base64ToBytes(b64: string): Uint8Array {
  // remove data:...;base64,
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function gerarProtocolo(mes: number, ano: number): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HOL-${ano}${String(mes).padStart(2, "0")}-${ts}-${rand}`;
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
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const payload = (await req.json()) as AssinarPayload;
    if (
      !payload.folha_pagamento_id ||
      !payload.pdf_holerite_base64 ||
      !payload.selfie_base64 ||
      !payload.assinatura_base64
    ) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar folha e verificar ownership
    const { data: folha, error: folhaErr } = await supa
      .from("folha_pagamento")
      .select("id, employee_id, empresa_id, mes, ano")
      .eq("id", payload.folha_pagamento_id)
      .single();
    if (folhaErr || !folha) {
      return new Response(JSON.stringify({ error: "Folha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: employee, error: empErr } = await supa
      .from("employees")
      .select("id, user_id, nome_completo, cpf")
      .eq("id", folha.employee_id)
      .single();
    if (empErr || !employee) {
      return new Response(JSON.stringify({ error: "Funcionário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica que o usuário logado é o dono daquele funcionário
    if (employee.user_id !== userId) {
      // Permitir admin? Admin não deveria assinar pelo funcionário.
      return new Response(
        JSON.stringify({ error: "Você só pode assinar seu próprio holerite" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verificar se já existe assinatura concluída
    const { data: existing } = await supa
      .from("holerite_assinaturas")
      .select("id, status, protocolo")
      .eq("folha_pagamento_id", folha.id)
      .eq("employee_id", employee.id)
      .maybeSingle();

    if (existing?.status === "assinado") {
      return new Response(
        JSON.stringify({
          error: "Este holerite já foi assinado",
          protocolo: existing.protocolo,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Bytes dos arquivos
    const pdfBytes = base64ToBytes(payload.pdf_holerite_base64);
    const selfieBytes = base64ToBytes(payload.selfie_base64);
    const assinaturaBytes = base64ToBytes(payload.assinatura_base64);

    // Hash do documento (PDF original)
    const hashDocumento = await sha256Hex(pdfBytes);

    // Captura IP
    const fwd =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";
    const ip = fwd.split(",")[0].trim() || "desconhecido";
    const userAgent = req.headers.get("user-agent") || payload.user_agent || "";

    // Protocolo (reaproveita se já houver um pendente)
    const protocolo =
      existing?.protocolo ?? gerarProtocolo(folha.mes, folha.ano);

    const dataAssinatura = new Date().toISOString();

    // Hash da assinatura (concatena evidências)
    const evidencia = new TextEncoder().encode(
      [
        protocolo,
        hashDocumento,
        employee.id,
        employee.cpf || "",
        ip,
        userAgent,
        dataAssinatura,
      ].join("|"),
    );
    const hashAssinaturaBase = await sha256Hex(evidencia);
    // Mistura com hash da imagem da assinatura
    const hashSig = await sha256Hex(assinaturaBytes);
    const hashAssinatura = await sha256Hex(
      new TextEncoder().encode(hashAssinaturaBase + hashSig),
    );

    // Upload dos arquivos
    const basePath = `${employee.id}/${protocolo}`;
    const pdfPath = `${basePath}/holerite.pdf`;
    const selfiePath = `${basePath}/selfie.jpg`;
    const assinaturaPath = `${basePath}/assinatura.png`;

    const uploadOpts = { upsert: true };

    const [up1, up2, up3] = await Promise.all([
      supa.storage
        .from("holerites-assinados")
        .upload(pdfPath, pdfBytes, { contentType: "application/pdf", ...uploadOpts }),
      supa.storage
        .from("holerites-assinados")
        .upload(selfiePath, selfieBytes, { contentType: "image/jpeg", ...uploadOpts }),
      supa.storage
        .from("holerites-assinados")
        .upload(assinaturaPath, assinaturaBytes, {
          contentType: "image/png",
          ...uploadOpts,
        }),
    ]);
    if (up1.error || up2.error || up3.error) {
      console.error("Upload error", up1.error, up2.error, up3.error);
      return new Response(
        JSON.stringify({ error: "Falha no upload dos arquivos" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const record = {
      folha_pagamento_id: folha.id,
      employee_id: employee.id,
      empresa_id: folha.empresa_id,
      protocolo,
      hash_documento: hashDocumento,
      hash_assinatura: hashAssinatura,
      nome_completo: (employee.nome_completo || "").toUpperCase(),
      cpf: employee.cpf,
      matricula: employee.matricula,
      pdf_original_path: pdfPath,
      selfie_path: selfiePath,
      assinatura_imagem_path: assinaturaPath,
      ip_publico: ip,
      user_agent: userAgent,
      navegador: payload.navegador || null,
      sistema_operacional: payload.sistema_operacional || null,
      geo_latitude: payload.geo?.consentimento ? payload.geo.lat : null,
      geo_longitude: payload.geo?.consentimento ? payload.geo.lng : null,
      geo_consentimento: payload.geo?.consentimento || false,
      data_visualizacao: existing ? undefined : dataAssinatura,
      data_assinatura: dataAssinatura,
      status: "assinado",
    };

    let assinaturaId: string;
    if (existing) {
      // Antes do trigger bloquear precisamos atualizar para 'assinado' em uma única transação
      const { data: upd, error: updErr } = await supa
        .from("holerite_assinaturas")
        .update(record)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updErr || !upd) {
        console.error("Update error", updErr);
        return new Response(
          JSON.stringify({ error: "Falha ao salvar assinatura" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      assinaturaId = upd.id;
    } else {
      const { data: ins, error: insErr } = await supa
        .from("holerite_assinaturas")
        .insert(record)
        .select("id")
        .single();
      if (insErr || !ins) {
        console.error("Insert error", insErr);
        return new Response(
          JSON.stringify({ error: "Falha ao salvar assinatura" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      assinaturaId = ins.id;
    }

    // Eventos de auditoria
    await supa.from("holerite_eventos_auditoria").insert([
      {
        assinatura_id: assinaturaId,
        tipo_evento: "capturou_selfie",
        ip,
        user_agent: userAgent,
        geo_latitude: payload.geo?.consentimento ? payload.geo.lat : null,
        geo_longitude: payload.geo?.consentimento ? payload.geo.lng : null,
      },
      {
        assinatura_id: assinaturaId,
        tipo_evento: "assinou",
        ip,
        user_agent: userAgent,
        geo_latitude: payload.geo?.consentimento ? payload.geo.lat : null,
        geo_longitude: payload.geo?.consentimento ? payload.geo.lng : null,
        metadata: {
          hash_documento: hashDocumento,
          hash_assinatura: hashAssinatura,
          protocolo,
        },
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        protocolo,
        hash_documento: hashDocumento,
        hash_assinatura: hashAssinatura,
        assinatura_id: assinaturaId,
        data_assinatura: dataAssinatura,
        pdf_path: pdfPath,
        selfie_path: selfiePath,
        assinatura_path: assinaturaPath,
        ip,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Erro em holerite-assinar:", e);
    return new Response(
      JSON.stringify({ error: String((e as Error).message || e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
