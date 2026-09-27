import { createClient, corsHeaders } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { z } from "npm:zod@3.25.76";

const HoleriteSchema = z.object({
  pagina: z.number().int().positive(),
  employee_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
  tipo_folha: z.string().min(1).max(50).default("salario"),
});

const BodySchema = z.object({
  holerites: z.array(HoleriteSchema).min(1).max(500),
  pdf_base64: z.string().min(100),
  nome_arquivo: z.string().min(1).max(255),
  sobrescrever: z.boolean().optional().default(false),
});

function base64ToBytes(value: string): Uint8Array {
  const clean = value.includes(",") ? value.split(",")[1] : value;
  const binary = atob(clean);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function safeName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function extractReceipt(source: PDFDocument, pageNumber: number, position: number, count: number) {
  const output = await PDFDocument.create();
  const sourceIndex = pageNumber - 1;
  if (sourceIndex < 0 || sourceIndex >= source.getPageCount()) throw new Error(`Página ${pageNumber} não existe no PDF`);
  const [page] = await output.copyPages(source, [sourceIndex]);
  const { width, height } = page.getSize();
  if (count > 1) {
    const segmentHeight = height / count;
    const y = height - ((position + 1) * segmentHeight);
    page.setMediaBox(0, y, width, segmentHeight);
    page.setCropBox(0, y, width, segmentHeight);
  }
  output.addPage(page);
  return output.save({ useObjectStreams: false });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.slice(7);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = String(claimsData.claims.sub);
    const admin = createClient(url, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles || []).some((item: { role: string }) => item.role === "gestor" || item.role === "admin_parcial")) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { holerites, pdf_base64, nome_arquivo, sobrescrever } = parsed.data;
    const source = await PDFDocument.load(base64ToBytes(pdf_base64), { ignoreEncryption: true });
    const counts = new Map<number, number>();
    holerites.forEach((item) => counts.set(item.pagina, (counts.get(item.pagina) || 0) + 1));
    const positions = new Map<number, number>();
    let vinculados = 0;
    let sobrescritos = 0;
    let pulados = 0;
    const erros: string[] = [];

    for (const item of holerites) {
      try {
        const { data: existing, error: existingError } = await admin
          .from("holerite_documentos")
          .select("id, status, arquivo_path")
          .eq("employee_id", item.employee_id)
          .eq("mes", item.mes)
          .eq("ano", item.ano)
          .eq("tipo_folha", item.tipo_folha)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing?.status === "assinado" || (existing && !sobrescrever)) {
          pulados++;
          continue;
        }

        const position = positions.get(item.pagina) || 0;
        positions.set(item.pagina, position + 1);
        const bytes = await extractReceipt(source, item.pagina, position, counts.get(item.pagina) || 1);
        const path = `${item.employee_id}/${item.ano}/${String(item.mes).padStart(2, "0")}/${crypto.randomUUID()}-${safeName(nome_arquivo)}`;
        const { error: uploadError } = await admin.storage.from("holerites-importados").upload(path, bytes, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw uploadError;

        if (existing) {
          const { error: updateError } = await admin.from("holerite_documentos").update({
            empresa_id: item.empresa_id,
            arquivo_nome: nome_arquivo,
            arquivo_path: path,
            status: "pendente",
            protocolo: null,
            hash_documento: null,
            hash_assinatura: null,
            pdf_assinado_path: null,
            selfie_path: null,
            assinatura_imagem_path: null,
            data_visualizacao: null,
            data_assinatura: null,
          }).eq("id", existing.id);
          if (updateError) throw updateError;
          await admin.storage.from("holerites-importados").remove([existing.arquivo_path]);
          sobrescritos++;
        } else {
          const { error: insertError } = await admin.from("holerite_documentos").insert({
            employee_id: item.employee_id,
            empresa_id: item.empresa_id,
            mes: item.mes,
            ano: item.ano,
            tipo_folha: item.tipo_folha,
            arquivo_nome: nome_arquivo,
            arquivo_path: path,
            status: "pendente",
            created_by: userId,
          });
          if (insertError) throw insertError;
          vinculados++;
        }
      } catch (error) {
        erros.push(error instanceof Error ? error.message : "Erro ao disponibilizar holerite");
      }
    }

    return new Response(JSON.stringify({ vinculados: vinculados + sobrescritos, criados: vinculados, sobrescritos, liberados: vinculados + sobrescritos, pulados, total_erros: erros.length, erros }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});