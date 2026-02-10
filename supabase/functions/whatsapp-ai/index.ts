import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatForWhatsApp(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "") // remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, "*$1*") // **bold** → *bold*
    .replace(/__(.*?)__/g, "_$1_") // __italic__ → _italic_
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim()) // remove code fences
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url) → link
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Evolution API webhook format
    const event = body.event;
    if (event && event !== "messages.upsert") {
      return new Response(JSON.stringify({ status: "ignored", reason: "not a message event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message data - support both wrapped and direct formats
    const data = body.data || body;
    const key = data.key;
    const message = data.message;

    if (!key || !message) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no message data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignore messages from the bot itself
    if (key.fromMe) {
      return new Response(JSON.stringify({ status: "ignored", reason: "own message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignore group messages
    const remoteJid = key.remoteJid || "";
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ status: "ignored", reason: "group message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract phone number
    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "");

    // Check allowed numbers
    const allowedNumbers = (Deno.env.get("WHATSAPP_ALLOWED_NUMBERS") || "").split(",").map(n => n.trim()).filter(Boolean);
    if (allowedNumbers.length > 0 && !allowedNumbers.includes(phoneNumber)) {
      console.log(`Blocked message from unauthorized number: ${phoneNumber}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text content
    const userMessage = message.conversation || message.extendedTextMessage?.text || "";
    if (!userMessage.trim()) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing message from ${phoneNumber}: ${userMessage.substring(0, 100)}`);

    // Get environment variables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error("Evolution API credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch system data (same logic as ai-assistant)
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    const [
      employeesRes, setoresRes, empresasRes, funcoesRes,
      feriasRes, feriasPlanejadasRes, folgasRes,
      faltasRes, registrosPontoRes, bancoHorasRes,
      folhaPagamentoRes, adiantamentosRes, reajustesSalariaisRes,
      tacsRes, avaliacoesRes,
      estoqueEpisRes, estoqueUniformesRes,
      vagasRes, candidaturasRes,
      cursosRes,
      eventosRes, avisosRes,
      encaminhamentosRes, afastamentosRes,
      checklistsFuncionarioRes,
    ] = await Promise.all([
      supabase.from("employees").select("id, nome_completo, cargo, setor, status, data_admissao, salario, tipo_contrato").eq("status", "ativo"),
      supabase.from("setores").select("id, nome"),
      supabase.from("empresas").select("id, nome"),
      supabase.from("funcoes").select("id, nome"),
      supabase.from("ferias").select("*, employees(nome_completo, setor)").gte("periodo_gozo_fim", threeMonthsAgo),
      supabase.from("ferias_planejadas").select("*, employees(nome_completo, setor)").gte("periodo_fim", today),
      supabase.from("folgas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
      supabase.from("faltas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
      supabase.from("registros_ponto").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo).order("data", { ascending: false }).limit(200),
      supabase.from("banco_horas").select("*, employees(nome_completo, setor)"),
      supabase.from("folha_pagamento").select("*, employees(nome_completo, setor), folha_pagamento_itens(valor, variavel_id, variaveis_folha(nome, tipo))").eq("ano", currentYear).order("mes", { ascending: false }),
      supabase.from("adiantamentos").select("*, employees(nome_completo, setor)").eq("ano", currentYear),
      supabase.from("historico_reajustes_salariais").select("*, employees(nome_completo, setor, cargo)").gte("aplicado_em", threeMonthsAgo),
      supabase.from("tacs").select("*, employees(nome_completo, setor)").gte("data_ocorrencia", threeMonthsAgo),
      supabase.from("avaliacoes_desempenho").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(100),
      supabase.from("estoque_epis").select("*"),
      supabase.from("estoque_uniformes").select("*"),
      supabase.from("vagas").select("*, empresas(nome), setores(nome), funcoes(nome)"),
      supabase.from("candidaturas").select("*, vagas(titulo)").order("created_at", { ascending: false }).limit(100),
      supabase.from("cursos").select("*, setores(nome), funcoes(nome)").eq("ativo", true),
      supabase.from("eventos").select("*").gte("data_fim", today).order("data_inicio", { ascending: true }).limit(20),
      supabase.from("avisos").select("*").gte("data_expiracao", today),
      supabase.from("encaminhamentos_medicos").select("*, employees(nome_completo, setor), empresas(nome)").order("data_encaminhamento", { ascending: false }).limit(50),
      supabase.from("afastamentos").select("*, employees(nome_completo, setor)").gte("data_fim", threeMonthsAgo),
      supabase.from("plano_checklist_funcionario").select("*, employees(nome_completo, setor), plano_checklist_funcionario_itens(concluido, titulo)").in("status", ["em_andamento", "pendente"]),
    ]);

    const employees = employeesRes.data || [];
    const setores = setoresRes.data || [];
    const empresas = empresasRes.data || [];
    const funcoes = funcoesRes.data || [];
    const ferias = feriasRes.data || [];
    const feriasPlanejadasData = feriasPlanejadasRes.data || [];
    const folgas = folgasRes.data || [];
    const faltas = faltasRes.data || [];
    const bancoHoras = bancoHorasRes.data || [];
    const folhaPagamento = folhaPagamentoRes.data || [];
    const adiantamentos = adiantamentosRes.data || [];
    const tacs = tacsRes.data || [];
    const avaliacoes = avaliacoesRes.data || [];
    const estoqueEpis = estoqueEpisRes.data || [];
    const estoqueUniformes = estoqueUniformesRes.data || [];
    const vagas = vagasRes.data || [];
    const candidaturas = candidaturasRes.data || [];
    const cursos = cursosRes.data || [];
    const eventos = eventosRes.data || [];
    const avisos = avisosRes.data || [];
    const encaminhamentos = encaminhamentosRes.data || [];
    const afastamentos = afastamentosRes.data || [];
    const checklists = checklistsFuncionarioRes.data || [];

    // Calculate statistics
    const feriasAtuais = ferias.filter((f: any) => f.periodo_gozo_inicio <= today && f.periodo_gozo_fim >= today);
    const faltasNaoJustificadas = faltas.filter((f: any) => !f.justificada);
    const tacsPendentes = tacs.filter((t: any) => t.status === "pendente");
    const avaliacoesPendentes = avaliacoes.filter((a: any) => a.status === "pendente");
    const episBaixoEstoque = estoqueEpis.filter((e: any) => e.quantidade_estoque <= (e.quantidade_minima || 10));
    const uniformesBaixoEstoque = estoqueUniformes.filter((u: any) => u.quantidade_estoque <= (u.quantidade_minima || 10));
    const vagasAbertas = vagas.filter((v: any) => v.status === "aberta");
    const candidaturasPendentes = candidaturas.filter((c: any) => c.status === "pendente" || c.status === "em_analise");
    const examesPendentes = encaminhamentos.filter((e: any) => e.status === "pendente" || e.status === "agendado");
    const afastamentosAtivos = afastamentos.filter((a: any) => a.data_inicio <= today && a.data_fim >= today);
    const checklistsPendentes = checklists.filter((c: any) => c.status === "pendente" || c.status === "em_andamento");
    const bancoHorasPositivo = bancoHoras.filter((b: any) => b.saldo_horas > 0);
    const bancoHorasNegativo = bancoHoras.filter((b: any) => b.saldo_horas < 0);
    const folhaMesAtual = folhaPagamento.filter((f: any) => f.mes === currentMonthNum);
    const totalProventos = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.total_proventos || 0), 0);
    const totalDescontos = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.total_descontos || 0), 0);
    const totalLiquido = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.valor_liquido || 0), 0);
    const totalAdiantamentos = adiantamentos.filter((a: any) => a.mes === currentMonthNum).reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

    const contextData = `
DADOS DO SISTEMA DE RH (${today}):

=== RESUMO ===
- Funcionários ativos: ${employees.length}
- Empresas: ${empresas.map((e: any) => e.nome).join(", ") || "Nenhuma"}
- Setores: ${setores.map((s: any) => s.nome).join(", ") || "Nenhum"}

=== FUNCIONÁRIOS ===
${employees.slice(0, 50).map((e: any) => `- ${e.nome_completo} | ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Salário: R$ ${e.salario?.toFixed(2) || "N/A"}`).join("\n")}

=== FÉRIAS ===
De férias agora (${feriasAtuais.length}):
${feriasAtuais.slice(0, 20).map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim}`).join("\n") || "Nenhum"}
Férias planejadas: ${feriasPlanejadasData.length}
Folgas (90 dias): ${folgas.length}

=== FALTAS ===
Total (90 dias): ${faltas.length} | Não justificadas: ${faltasNaoJustificadas.length}

=== PONTO ===
Banco horas positivo: ${bancoHorasPositivo.length} | Negativo: ${bancoHorasNegativo.length}

=== FOLHA (${currentMonthNum}/${currentYear}) ===
Processadas: ${folhaMesAtual.length} | Proventos: R$ ${totalProventos.toFixed(2)} | Descontos: R$ ${totalDescontos.toFixed(2)} | Líquido: R$ ${totalLiquido.toFixed(2)} | Adiantamentos: R$ ${totalAdiantamentos.toFixed(2)}

=== TACs ===
Pendentes: ${tacsPendentes.length} | Total (90 dias): ${tacs.length}

=== AVALIAÇÕES ===
Pendentes: ${avaliacoesPendentes.length}

=== ESTOQUE ===
EPIs em falta: ${episBaixoEstoque.length} | Uniformes em falta: ${uniformesBaixoEstoque.length}

=== RECRUTAMENTO ===
Vagas abertas: ${vagasAbertas.length} | Candidaturas pendentes: ${candidaturasPendentes.length}

=== TREINAMENTOS ===
Cursos ativos: ${cursos.length}

=== EVENTOS ===
Próximos: ${eventos.filter((e: any) => !e.concluido).length}
Avisos ativos: ${avisos.length}

=== SAÚDE ===
Exames pendentes: ${examesPendentes.length} | Afastados: ${afastamentosAtivos.length}

=== CHECKLISTS ===
Pendentes: ${checklistsPendentes.length}
`;

    const systemPrompt = `Você é um assistente de RH inteligente respondendo via WhatsApp. Seja conciso e direto pois é uma conversa por mensagem.

INSTRUÇÕES:
- Responda em português brasileiro
- Seja objetivo (WhatsApp = respostas curtas e diretas)
- Use os dados fornecidos
- Use formatação simples: *negrito*, _itálico_, listas com -
- Não use headers com #
- Limite respostas a no máximo 3000 caracteres

${contextData}`;

    // Call AI (non-streaming)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";
    const formattedText = formatForWhatsApp(aiText);

    // Send response via Evolution API
    const sendUrl = `${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    console.log(`Sending response to ${phoneNumber} via ${sendUrl}`);

    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: formattedText,
      }),
    });

    if (!sendResponse.ok) {
      const sendError = await sendResponse.text();
      console.error("Evolution API send error:", sendResponse.status, sendError);
      throw new Error(`Failed to send WhatsApp message: ${sendResponse.status}`);
    }

    const sendResult = await sendResponse.json();
    console.log("Message sent successfully:", JSON.stringify(sendResult).substring(0, 200));

    return new Response(JSON.stringify({ status: "ok", message: "Response sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
