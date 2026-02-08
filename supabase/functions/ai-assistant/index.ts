import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userMessage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch context data
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch relevant data for context
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parallel data fetching
    const [
      employeesRes,
      feriasRes,
      faltasRes,
      tacsRes,
      avaliacoesRes,
      setoresRes,
      empresasRes
    ] = await Promise.all([
      supabase.from("employees").select("id, nome_completo, cargo, setor, status, data_admissao, empresa_id").eq("status", "ativo"),
      supabase.from("ferias").select("*, employees(nome_completo, setor)").gte("periodo_gozo_fim", threeMonthsAgo),
      supabase.from("faltas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
      supabase.from("tacs").select("*, employees(nome_completo, setor)").gte("data_ocorrencia", threeMonthsAgo),
      supabase.from("avaliacoes_desempenho").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(100),
      supabase.from("setores").select("id, nome"),
      supabase.from("empresas").select("id, nome")
    ]);

    // Build context string
    const employees = employeesRes.data || [];
    const ferias = feriasRes.data || [];
    const faltas = faltasRes.data || [];
    const tacs = tacsRes.data || [];
    const avaliacoes = avaliacoesRes.data || [];
    const setores = setoresRes.data || [];
    const empresas = empresasRes.data || [];

    const contextData = `
DADOS DO SISTEMA DE RH (${today}):

RESUMO GERAL:
- Total de funcionários ativos: ${employees.length}
- Setores: ${setores.map(s => s.nome).join(", ")}
- Empresas: ${empresas.map(e => e.nome).join(", ")}

FUNCIONÁRIOS ATIVOS:
${employees.slice(0, 50).map(e => `- ${e.nome_completo} (${e.cargo}, ${e.setor})`).join("\n")}
${employees.length > 50 ? `... e mais ${employees.length - 50} funcionários` : ""}

FÉRIAS RECENTES/ATUAIS:
${ferias.slice(0, 20).map(f => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais} dias)`).join("\n") || "Nenhuma férias registrada"}

FALTAS (últimos 90 dias):
${faltas.slice(0, 20).map(f => `- ${f.employees?.nome_completo}: ${f.data} - ${f.justificada ? "Justificada" : "Não justificada"} ${f.motivo ? `(${f.motivo})` : ""}`).join("\n") || "Nenhuma falta registrada"}

TACs (últimos 90 dias):
${tacs.slice(0, 20).map(t => `- ${t.employees?.nome_completo}: ${t.tipo} - ${t.titulo} (${t.status})`).join("\n") || "Nenhum TAC registrado"}

AVALIAÇÕES RECENTES:
${avaliacoes.slice(0, 20).map(a => `- ${a.employees?.nome_completo}: Nota ${a.nota_final || "pendente"} (${a.tipo}, ${a.status})`).join("\n") || "Nenhuma avaliação registrada"}

ESTATÍSTICAS:
- Funcionários de férias no período: ${ferias.filter(f => f.periodo_gozo_inicio <= today && f.periodo_gozo_fim >= today).length}
- Faltas não justificadas: ${faltas.filter(f => !f.justificada).length}
- TACs pendentes: ${tacs.filter(t => t.status === 'pendente').length}
- Avaliações pendentes: ${avaliacoes.filter(a => a.status === 'pendente').length}
`;

    const systemPrompt = `Você é um assistente de RH inteligente e prestativo. Você tem acesso aos dados do sistema de gestão de RH e pode responder perguntas sobre funcionários, férias, faltas, avaliações, TACs e mais.

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Seja objetivo e claro
- Use os dados fornecidos para responder com precisão
- Se não tiver informação suficiente, diga que precisa de mais dados
- Formate as respostas de forma legível (use listas, negrito quando apropriado)
- Ao listar dados, seja organizado
- Ofereça insights e sugestões quando apropriado

${contextData}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
          ...(userMessage ? [{ role: "user", content: userMessage }] : [])
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos no Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
