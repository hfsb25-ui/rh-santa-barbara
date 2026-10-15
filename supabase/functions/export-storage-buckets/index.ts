import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type StorageEntry = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ExportFile = {
  bucket: string;
  path: string;
  signedUrl: string;
};

const PAGE_SIZE = 1000;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function listFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`${bucket}: ${error.message}`);

    const entries = (data || []) as StorageEntry[];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = !entry.id && entry.metadata == null;
      if (isFolder) files.push(...await listFiles(admin, bucket, path));
      else files.push(path);
    }

    if (entries.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return files;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração indisponível");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice(7);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleError) throw roleError;
    if (!(roles || []).some((item) => item.role === "gestor")) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas gestores podem exportar os arquivos." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    const files: ExportFile[] = [];
    const emptyBuckets: string[] = [];
    for (const bucket of buckets || []) {
      const paths = await listFiles(admin, bucket.id);
      if (paths.length === 0) {
        emptyBuckets.push(bucket.id);
        continue;
      }

      for (let index = 0; index < paths.length; index += 100) {
        const batch = paths.slice(index, index + 100);
        const { data: signed, error: signedError } = await admin.storage
          .from(bucket.id)
          .createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);
        if (signedError) throw new Error(`${bucket.id}: ${signedError.message}`);
        for (const item of signed || []) {
          if (item.error || !item.signedUrl) {
            throw new Error(`${bucket.id}/${item.path}: ${item.error || "não foi possível preparar o arquivo"}`);
          }
          files.push({ bucket: bucket.id, path: item.path, signedUrl: item.signedUrl });
        }
      }
    }

    return new Response(JSON.stringify({ files, emptyBuckets }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[export-storage-buckets]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});