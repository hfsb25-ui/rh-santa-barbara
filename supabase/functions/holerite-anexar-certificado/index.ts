// Upload do PDF do certificado de assinatura, gerado no client após assinar.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { data: claimsData } = await supaUser.auth.getClaims(token);
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { assinatura_id, pdf_certificado_base64 } = await req.json();
    if (!assinatura_id || !pdf_certificado_base64) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ass, error } = await supa
      .from("holerite_assinaturas")
      .select("id, employee_id, protocolo, pdf_certificado_path, employees:employee_id(user_id)")
      .eq("id", assinatura_id)
      .single();
    if (error || !ass) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const empUserId = (ass as any).employees?.user_id;
    if (empUserId !== userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ass.pdf_certificado_path) {
      return new Response(
        JSON.stringify({ success: true, already: true, path: ass.pdf_certificado_path }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const path = `${ass.employee_id}/${ass.protocolo}/certificado.pdf`;
    const { error: upErr } = await supa.storage
      .from("holerites-assinados")
      .upload(path, base64ToBytes(pdf_certificado_base64), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza só o campo pdf_certificado_path; trigger permite por ser único campo "vazio"
    await supa
      .from("holerite_assinaturas")
      .update({ pdf_certificado_path: path })
      .eq("id", assinatura_id);

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
