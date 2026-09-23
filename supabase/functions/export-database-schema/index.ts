import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const jsonResponse = (body: Record<string, string>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração interna indisponível" }, 500);
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Sessão inválida ou expirada" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "gestor")
      .maybeSingle();

    if (roleError || !roleData) {
      return jsonResponse({ error: "Apenas gestores podem exportar a estrutura do banco de dados" }, 403);
    }

    const { data, error } = await adminClient.rpc("export_sql_schema", {
      _requesting_user_id: user.id,
    });
    if (error) throw error;

    const statements = (data ?? []) as string[];
    const sqlContent = statements.join("\n");
    if (!sqlContent.includes("BEGIN;") || !sqlContent.includes("COMMIT;")) {
      throw new Error("A estrutura SQL não foi gerada corretamente");
    }

    const generatedAt = new Date().toISOString();
    const fileName = `estrutura-rh-${generatedAt.slice(0, 16).replaceAll(":", "-")}.sql`;

    return new Response(sqlContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao exportar estrutura SQL:", error);
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar a estrutura SQL";
    return jsonResponse({ error: message }, 500);
  }
});