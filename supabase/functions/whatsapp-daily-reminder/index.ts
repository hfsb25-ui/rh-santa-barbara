import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatForWhatsApp(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    .replace(/__(.*?)__/g, "_$1_")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get WhatsApp config
    const { data: config } = await supabase
      .from("configuracoes_whatsapp")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!config || !config.lembrete_ativo || !config.numero_lembrete) {
      return new Response(JSON.stringify({ status: "skipped", reason: "reminder not configured or disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { evolution_api_url, evolution_api_key, evolution_instance_name, numero_lembrete } = config;

    if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
      throw new Error("Evolution API credentials not configured");
    }

    // Parse multiple numbers (comma-separated)
    const numeros = numero_lembrete
      .split(",")
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    if (numeros.length === 0) {
      return new Response(JSON.stringify({ status: "skipped", reason: "no reminder numbers configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const results: { number: string; status: string; error?: string }[] = [];

    // Send personalized reminder to each number
    for (const numero of numeros) {
      try {
        // Fetch ONLY this person's events (created via WhatsApp by this number)
        const { data: eventosDoUsuario } = await supabase
          .from("eventos")
          .select("*")
          .eq("whatsapp_phone", numero)
          .gte("data_inicio", `${today}T00:00:00`)
          .lt("data_inicio", `${tomorrow}T00:00:00`)
          .eq("concluido", false)
          .order("data_inicio", { ascending: true });

        // Also fetch general events (no whatsapp_phone, visible to all)
        const { data: eventosGerais } = await supabase
          .from("eventos")
          .select("*")
          .is("whatsapp_phone", null)
          .gte("data_inicio", `${today}T00:00:00`)
          .lt("data_inicio", `${tomorrow}T00:00:00`)
          .eq("concluido", false)
          .order("data_inicio", { ascending: true });

        // Get conversation history for context
        const { data: history } = await supabase
          .from("whatsapp_conversas")
          .select("role, content")
          .eq("phone_number", numero)
          .order("created_at", { ascending: false })
          .limit(10);

        const historyContext = (history || []).length > 0
          ? `\n\nHISTÓRICO RECENTE DE CONVERSAS (para contexto):\n${(history || []).reverse().map((h: any) => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content.substring(0, 200)}`).join("\n")}`
          : "";

        // Build personalized context
        const context = `
DADOS PARA LEMBRETE MATINAL PERSONALIZADO (${today}):
DESTINATÁRIO: ${numero}

COMPROMISSOS PESSOAIS DE HOJE (${(eventosDoUsuario || []).length}):
${(eventosDoUsuario || []).map((e: any) => {
  const hora = e.data_inicio ? new Date(e.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "sem horário";
  return `- ${hora} - ${e.titulo} ${e.local ? `(${e.local})` : ""} | Tipo: ${e.tipo || "geral"}`;
}).join("\n") || "Nenhum compromisso pessoal hoje."}

EVENTOS GERAIS DA EMPRESA (${(eventosGerais || []).length}):
${(eventosGerais || []).map((e: any) => {
  const hora = e.data_inicio ? new Date(e.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "sem horário";
  return `- ${hora} - ${e.titulo} ${e.local ? `(${e.local})` : ""} | Tipo: ${e.tipo || "geral"}`;
}).join("\n") || "Nenhum evento geral hoje."}
`;

        const systemPrompt = `Você é um assistente de RH inteligente enviando o lembrete matinal diário via WhatsApp.

INSTRUÇÕES:
- Comece com uma saudação amigável (Bom dia! 🌅)
- Foque PRINCIPALMENTE nos compromissos PESSOAIS desta pessoa
- Se houver eventos gerais da empresa, mencione-os separadamente como "Eventos Gerais"
- Use formatação WhatsApp: *negrito*, _itálico_, listas com - ou emojis
- Seja conciso mas completo
- Máximo 2000 caracteres
- Se não houver nenhum compromisso pessoal nem evento geral, envie uma mensagem curta positiva desejando um bom dia

${historyContext}

${context}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Gere o lembrete matinal personalizado de hoje." },
            ],
            stream: false,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content || "Bom dia! Não há compromissos para hoje. 🌟";
        const formattedText = formatForWhatsApp(aiText);

        // Send via Evolution API
        const sendUrl = `${evolution_api_url.replace(/\/$/, "")}/message/sendText/${evolution_instance_name}`;
        const sendResponse = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evolution_api_key,
          },
          body: JSON.stringify({
            number: numero,
            text: formattedText,
          }),
        });

        if (!sendResponse.ok) {
          const sendError = await sendResponse.text();
          throw new Error(`Failed to send: ${sendResponse.status} - ${sendError}`);
        }

        // Save the reminder as conversation
        await supabase.from("whatsapp_conversas").insert([
          { phone_number: numero, role: "assistant", content: formattedText },
        ]);

        console.log("Daily reminder sent successfully to", numero);
        results.push({ number: numero, status: "ok" });
      } catch (numError) {
        console.error(`Error sending reminder to ${numero}:`, numError);
        results.push({ number: numero, status: "error", error: numError instanceof Error ? numError.message : "Unknown error" });
      }
    }

    return new Response(JSON.stringify({ status: "ok", results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily reminder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
