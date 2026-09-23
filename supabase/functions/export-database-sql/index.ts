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
      return jsonResponse({ error: "Apenas gestores podem exportar o banco de dados" }, 403);
    }

    const { data: tables, error: tablesError } = await adminClient.rpc("export_sql_tables", {
      _requesting_user_id: user.id,
    });
    if (tablesError) throw tablesError;

    const generatedAt = new Date().toISOString();
    const statements: string[] = [
      "-- RH Santa Bárbara - exportação de dados",
      `-- Gerado em ${generatedAt}`,
      "-- Importe após criar a estrutura do banco no destino.",
      "-- Não inclui usuários de acesso, arquivos armazenados ou segredos.",
      "",
      "SET client_encoding = 'UTF8';",
      "BEGIN;",
      "SET session_replication_role = replica;",
      "",
    ];

    const tableList = (tables ?? []) as Array<{ table_name: string; total_rows: number }>;
    const chunkSize = 250;

    for (const table of tableList) {
      statements.push(`-- Tabela: public.${table.table_name} (${table.total_rows} registros)`);

      for (let offset = 0; offset < table.total_rows; offset += chunkSize) {
        const { data: rows, error: rowsError } = await adminClient.rpc("export_sql_table_chunk", {
          _table_name: table.table_name,
          _offset: offset,
          _limit: chunkSize,
          _requesting_user_id: user.id,
        });

        if (rowsError) throw rowsError;
        statements.push(...((rows ?? []) as string[]));
      }

      statements.push("");
    }

    statements.push(
      "SET session_replication_role = origin;",
      "",
      "-- Atualiza sequências associadas a colunas automáticas.",
      "DO $export$",
      "DECLARE sequence_record record; maximum_value bigint;",
      "BEGIN",
      "  FOR sequence_record IN",
      "    SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name,",
      "           pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS sequence_name",
      "    FROM pg_class c",
      "    JOIN pg_namespace n ON n.oid = c.relnamespace",
      "    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped",
      "    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')",
      "  LOOP",
      "    IF sequence_record.sequence_name IS NOT NULL THEN",
      "      EXECUTE format('SELECT max(%I) FROM %I.%I', sequence_record.column_name, sequence_record.schema_name, sequence_record.table_name) INTO maximum_value;",
      "      IF maximum_value IS NOT NULL THEN",
      "        PERFORM setval(sequence_record.sequence_name, maximum_value, true);",
      "      END IF;",
      "    END IF;",
      "  END LOOP;",
      "END",
      "$export$;",
      "",
      "COMMIT;",
      "",
    );

    const fileName = `backup-rh-${generatedAt.slice(0, 16).replaceAll(":", "-")}.sql`;
    return new Response(statements.join("\n"), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao exportar SQL:", error);
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar a exportação SQL";
    return jsonResponse({ error: message }, 500);
  }
});