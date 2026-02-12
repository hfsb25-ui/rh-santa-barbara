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

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch today's events
    const { data: eventos } = await supabase
      .from("eventos")
      .select("*")
      .gte("data_inicio", `${today}T00:00:00`)
      .lt("data_inicio", `${tomorrow}T00:00:00`)
      .eq("concluido", false)
      .order("data_inicio", { ascending: true });

    // Fetch employees on vacation today
    const { data: feriasHoje } = await supabase
      .from("ferias")
      .select("*, employees(nome_completo, setor)")
      .lte("periodo_gozo_inicio", today)
      .gte("periodo_gozo_fim", today);

    // Fetch absences today
    const { data: afastamentosHoje } = await supabase
      .from("afastamentos")
      .select("*, employees(nome_completo, setor)")
      .lte("data_inicio", today)
      .gte("data_fim", today);

    // Fetch time off today
    const { data: folgasHoje } = await supabase
      .from("folgas")
      .select("*, employees(nome_completo, setor)")
      .eq("data", today);

    // Fetch birthdays today
    const { data: allEmployees } = await supabase
      .from("employees")
      .select("nome_completo, data_nascimento, setor")
      .eq("status", "ativo");

    const aniversariantes = (allEmployees || []).filter((e: any) => {
      if (!e.data_nascimento) return false;
      const [, m, d] = e.data_nascimento.split("-");
      const [, tm, td] = today.split("-");
      return m === tm && d === td;
    });

    // Fetch pending checklists
    const { data: checklistsPendentes } = await supabase
      .from("plano_checklist_funcionario")
      .select("*, employees(nome_completo)")
      .in("status", ["pendente", "em_andamento"]);

    // Fetch pending exams
    const { data: examesPendentes } = await supabase
      .from("encaminhamentos_medicos")
      .select("*, employees(nome_completo)")
      .in("status", ["pendente", "agendado"])
      .lte("data_agendamento", today);

    // Build context for AI
    const context = `
DADOS PARA LEMBRETE MATINAL (${today}):

EVENTOS DE HOJE (${(eventos || []).length}):
${(eventos || []).map((e: any) => {
  const hora = e.data_inicio ? new Date(e.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "sem horário";
  return `- ${hora} - ${e.titulo} ${e.local ? `(${e.local})` : ""} | Tipo: ${e.tipo || "geral"}`;
}).join("\n") || "Nenhum evento hoje."}

FUNCIONÁRIOS DE FÉRIAS HOJE (${(feriasHoje || []).length}):
${(feriasHoje || []).map((f: any) => `- ${f.employees?.nome_completo} (${f.employees?.setor || "N/A"}) até ${f.periodo_gozo_fim}`).join("\n") || "Nenhum"}

AFASTADOS HOJE (${(afastamentosHoje || []).length}):
${(afastamentosHoje || []).map((a: any) => `- ${a.employees?.nome_completo}: ${a.motivo}`).join("\n") || "Nenhum"}

FOLGAS HOJE (${(folgasHoje || []).length}):
${(folgasHoje || []).map((f: any) => `- ${f.employees?.nome_completo}: ${f.motivo}`).join("\n") || "Nenhum"}

ANIVERSARIANTES DO DIA (${aniversariantes.length}):
${aniversariantes.map((a: any) => `- ${a.nome_completo} (${a.setor || "N/A"})`).join("\n") || "Nenhum"}

CHECKLISTS PENDENTES (${(checklistsPendentes || []).length}):
${(checklistsPendentes || []).slice(0, 5).map((c: any) => `- ${c.employees?.nome_completo}: ${c.tipo}`).join("\n") || "Nenhum"}

EXAMES MÉDICOS PENDENTES PARA HOJE (${(examesPendentes || []).length}):
${(examesPendentes || []).slice(0, 5).map((e: any) => `- ${e.employees?.nome_completo}: ${e.tipo_exame}`).join("\n") || "Nenhum"}
`;

    // Get conversation history for this number
    const { data: history } = await supabase
      .from("whatsapp_conversas")
      .select("role, content")
      .eq("phone_number", numero_lembrete)
      .order("created_at", { ascending: false })
      .limit(10);

    const historyContext = (history || []).length > 0
      ? `\n\nHISTÓRICO RECENTE DE CONVERSAS (para contexto):\n${(history || []).reverse().map((h: any) => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content.substring(0, 200)}`).join("\n")}`
      : "";

    const systemPrompt = `Você é um assistente de RH inteligente enviando o lembrete matinal diário via WhatsApp.

INSTRUÇÕES:
- Comece com uma saudação amigável (Bom dia! 🌅)
- Resuma os compromissos do dia de forma clara e objetiva
- Destaque eventos importantes, quem está ausente (férias/afastamento/folga)
- Mencione aniversariantes se houver
- Alerte sobre pendências importantes
- Use formatação WhatsApp: *negrito*, _itálico_, listas com - ou emojis
- Seja conciso mas completo
- Máximo 2000 caracteres
- Se não houver nada relevante, envie uma mensagem curta positiva

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
          { role: "user", content: "Gere o lembrete matinal de hoje." },
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
        number: numero_lembrete,
        text: formattedText,
      }),
    });

    if (!sendResponse.ok) {
      const sendError = await sendResponse.text();
      throw new Error(`Failed to send reminder: ${sendResponse.status} - ${sendError}`);
    }

    // Save the reminder as conversation
    await supabase.from("whatsapp_conversas").insert([
      { phone_number: numero_lembrete, role: "assistant", content: formattedText },
    ]);

    console.log("Daily reminder sent successfully to", numero_lembrete);

    return new Response(JSON.stringify({ status: "ok", message: "Reminder sent" }), {
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
