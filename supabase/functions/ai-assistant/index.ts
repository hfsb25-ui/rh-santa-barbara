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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    // Fetch ALL relevant data from the system
    const [
      // Core data
      employeesRes,
      setoresRes,
      empresasRes,
      funcoesRes,
      // Vacations & Time Off
      feriasRes,
      feriasPlanejadasRes,
      folgasRes,
      // Attendance & Absences
      faltasRes,
      registrosPontoRes,
      bancoHorasRes,
      // Payroll
      folhaPagamentoRes,
      adiantamentosRes,
      reajustesSalariaisRes,
      // Evaluations & TACs
      tacsRes,
      avaliacoesRes,
      ciclosAvaliacaoRes,
      criteriosAvaliacaoRes,
      // Stock
      estoqueEpisRes,
      estoqueUniformesRes,
      episEntreguesRes,
      uniformesEntreguesRes,
      // Recruitment
      vagasRes,
      candidaturasRes,
      // Training
      cursosRes,
      progressoAulasRes,
      certificadosRes,
      // Events & Notices
      eventosRes,
      avisosRes,
      // Occupational Health
      encaminhamentosRes,
      afastamentosRes,
      // Checklists
      checklistsFuncionarioRes,
    ] = await Promise.all([
      // Core
      supabase.from("employees").select("id, nome_completo, cargo, setor, status, data_admissao, data_desligamento, empresa_id, salario, tipo_contrato").eq("status", "ativo"),
      supabase.from("setores").select("id, nome"),
      supabase.from("empresas").select("id, nome"),
      supabase.from("funcoes").select("id, nome, cbo"),
      // Vacations
      supabase.from("ferias").select("*, employees(nome_completo, setor)").gte("periodo_gozo_fim", threeMonthsAgo),
      supabase.from("ferias_planejadas").select("*, employees(nome_completo, setor)").gte("periodo_fim", today),
      supabase.from("folgas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
      // Attendance
      supabase.from("faltas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
      supabase.from("registros_ponto").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo).order("data", { ascending: false }).limit(200),
      supabase.from("banco_horas").select("*, employees(nome_completo, setor)"),
      // Payroll
      supabase.from("folha_pagamento").select("*, employees(nome_completo, setor), folha_pagamento_itens(valor, variavel_id, variaveis_folha(nome, tipo))").eq("ano", currentYear).order("mes", { ascending: false }),
      supabase.from("adiantamentos").select("*, employees(nome_completo, setor)").eq("ano", currentYear),
      supabase.from("historico_reajustes_salariais").select("*, employees(nome_completo, setor, cargo)").gte("aplicado_em", threeMonthsAgo),
      // TACs & Evaluations
      supabase.from("tacs").select("*, employees(nome_completo, setor)").gte("data_ocorrencia", threeMonthsAgo),
      supabase.from("avaliacoes_desempenho").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(100),
      supabase.from("ciclos_avaliacao").select("*").eq("ativo", true),
      supabase.from("criterios_avaliacao").select("*").eq("ativo", true),
      // Stock
      supabase.from("estoque_epis").select("*"),
      supabase.from("estoque_uniformes").select("*"),
      supabase.from("epis").select("*, employees(nome_completo, setor)").gte("data_entrega", threeMonthsAgo),
      supabase.from("uniformes").select("*, employees(nome_completo, setor)").gte("data_entrega", threeMonthsAgo),
      // Recruitment
      supabase.from("vagas").select("*, empresas(nome), setores(nome), funcoes(nome)"),
      supabase.from("candidaturas").select("*, vagas(titulo)").order("created_at", { ascending: false }).limit(100),
      // Training
      supabase.from("cursos").select("*, setores(nome), funcoes(nome)").eq("ativo", true),
      supabase.from("progresso_aulas").select("*, employees(nome_completo, setor), aulas(titulo, modulos(titulo, cursos(titulo)))").gte("updated_at", threeMonthsAgo),
      supabase.from("certificados_liberados").select("*, employees(nome_completo, setor), cursos(titulo)").gte("data_liberacao", threeMonthsAgo),
      // Events
      supabase.from("eventos").select("*").gte("data_fim", today).order("data_inicio", { ascending: true }).limit(20),
      supabase.from("avisos").select("*").gte("data_expiracao", today),
      // Health
      supabase.from("encaminhamentos_medicos").select("*, employees(nome_completo, setor), empresas(nome)").order("data_encaminhamento", { ascending: false }).limit(50),
      supabase.from("afastamentos").select("*, employees(nome_completo, setor)").gte("data_fim", threeMonthsAgo),
      // Checklists
      supabase.from("plano_checklist_funcionario").select("*, employees(nome_completo, setor), plano_checklist_funcionario_itens(concluido, titulo)").in("status", ["em_andamento", "pendente"]),
    ]);

    // Extract data
    const employees = employeesRes.data || [];
    const setores = setoresRes.data || [];
    const empresas = empresasRes.data || [];
    const funcoes = funcoesRes.data || [];
    const ferias = feriasRes.data || [];
    const feriasPlanejadasData = feriasPlanejadasRes.data || [];
    const folgas = folgasRes.data || [];
    const faltas = faltasRes.data || [];
    const registrosPonto = registrosPontoRes.data || [];
    const bancoHoras = bancoHorasRes.data || [];
    const folhaPagamento = folhaPagamentoRes.data || [];
    const adiantamentos = adiantamentosRes.data || [];
    const reajustesSalariais = reajustesSalariaisRes.data || [];
    const tacs = tacsRes.data || [];
    const avaliacoes = avaliacoesRes.data || [];
    const ciclosAvaliacao = ciclosAvaliacaoRes.data || [];
    const criteriosAvaliacao = criteriosAvaliacaoRes.data || [];
    const estoqueEpis = estoqueEpisRes.data || [];
    const estoqueUniformes = estoqueUniformesRes.data || [];
    const episEntregues = episEntreguesRes.data || [];
    const uniformesEntregues = uniformesEntreguesRes.data || [];
    const vagas = vagasRes.data || [];
    const candidaturas = candidaturasRes.data || [];
    const cursos = cursosRes.data || [];
    const progressoAulas = progressoAulasRes.data || [];
    const certificados = certificadosRes.data || [];
    const eventos = eventosRes.data || [];
    const avisos = avisosRes.data || [];
    const encaminhamentos = encaminhamentosRes.data || [];
    const afastamentos = afastamentosRes.data || [];
    const checklists = checklistsFuncionarioRes.data || [];

    // Calculate statistics
    const feriasAtuais = ferias.filter(f => f.periodo_gozo_inicio <= today && f.periodo_gozo_fim >= today);
    const faltasNaoJustificadas = faltas.filter(f => !f.justificada);
    const tacsPendentes = tacs.filter(t => t.status === 'pendente');
    const avaliacoesPendentes = avaliacoes.filter(a => a.status === 'pendente');
    const episBaixoEstoque = estoqueEpis.filter(e => e.quantidade_estoque <= (e.quantidade_minima || 10));
    const uniformesBaixoEstoque = estoqueUniformes.filter(u => u.quantidade_estoque <= (u.quantidade_minima || 10));
    const vagasAbertas = vagas.filter(v => v.status === 'aberta');
    const candidaturasPendentes = candidaturas.filter(c => c.status === 'pendente' || c.status === 'em_analise');
    const cursosObrigatorios = cursos.filter(c => c.obrigatorio);
    const eventosProximos = eventos.filter(e => !e.concluido);
    const avisosAtivos = avisos;
    const examesPendentes = encaminhamentos.filter(e => e.status === 'pendente' || e.status === 'agendado');
    const afastamentosAtivos = afastamentos.filter(a => a.data_inicio <= today && a.data_fim >= today);
    const checklistsPendentes = checklists.filter(c => c.status === 'pendente' || c.status === 'em_andamento');
    const bancoHorasPositivo = bancoHoras.filter(b => b.saldo_horas > 0);
    const bancoHorasNegativo = bancoHoras.filter(b => b.saldo_horas < 0);

    // Calculate payroll totals
    const folhaMesAtual = folhaPagamento.filter(f => f.mes === currentMonthNum);
    const totalProventos = folhaMesAtual.reduce((acc, f) => acc + (f.total_proventos || 0), 0);
    const totalDescontos = folhaMesAtual.reduce((acc, f) => acc + (f.total_descontos || 0), 0);
    const totalLiquido = folhaMesAtual.reduce((acc, f) => acc + (f.valor_liquido || 0), 0);
    const totalAdiantamentos = adiantamentos.filter(a => a.mes === currentMonthNum).reduce((acc, a) => acc + (a.valor || 0), 0);

    // Build comprehensive context
    const contextData = `
DADOS COMPLETOS DO SISTEMA DE RH (${today}):

=== RESUMO GERAL ===
- Total de funcionários ativos: ${employees.length}
- Empresas: ${empresas.map(e => e.nome).join(", ") || "Nenhuma"}
- Setores: ${setores.map(s => s.nome).join(", ") || "Nenhum"}
- Funções cadastradas: ${funcoes.length}

=== FUNCIONÁRIOS ATIVOS ===
${employees.slice(0, 50).map(e => `- ${e.nome_completo} | Cargo: ${e.cargo} | Setor: ${e.setor || 'N/A'} | Admissão: ${e.data_admissao || 'N/A'} | Salário: R$ ${e.salario?.toFixed(2) || 'N/A'} | Contrato: ${e.tipo_contrato || 'N/A'}`).join("\n")}
${employees.length > 50 ? `... e mais ${employees.length - 50} funcionários` : ""}

=== FÉRIAS E FOLGAS ===
Funcionários de férias AGORA (${feriasAtuais.length}):
${feriasAtuais.slice(0, 20).map(f => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais} dias)`).join("\n") || "Nenhum"}

Férias planejadas/futuras (${feriasPlanejadasData.length}):
${feriasPlanejadasData.slice(0, 20).map(f => `- ${f.employees?.nome_completo}: ${f.periodo_inicio} a ${f.periodo_fim} (${f.dias_totais} dias) - Status: ${f.status}`).join("\n") || "Nenhuma"}

Folgas registradas (últimos 90 dias): ${folgas.length}
${folgas.slice(0, 10).map(f => `- ${f.employees?.nome_completo}: ${f.data} - ${f.motivo}`).join("\n") || "Nenhuma"}

=== FALTAS E AUSÊNCIAS ===
Total de faltas (últimos 90 dias): ${faltas.length}
Faltas não justificadas: ${faltasNaoJustificadas.length}
${faltasNaoJustificadas.slice(0, 15).map(f => `- ${f.employees?.nome_completo}: ${f.data} ${f.motivo ? `(${f.motivo})` : ""}`).join("\n") || "Nenhuma"}

=== CONTROLE DE PONTO ===
Registros de ponto recentes: ${registrosPonto.length}
Funcionários com banco de horas positivo: ${bancoHorasPositivo.length}
${bancoHorasPositivo.slice(0, 10).map(b => `- ${b.employees?.nome_completo}: +${b.saldo_horas?.toFixed(1)}h`).join("\n") || "Nenhum"}

Funcionários com banco de horas negativo: ${bancoHorasNegativo.length}
${bancoHorasNegativo.slice(0, 10).map(b => `- ${b.employees?.nome_completo}: ${b.saldo_horas?.toFixed(1)}h`).join("\n") || "Nenhum"}

=== FOLHA DE PAGAMENTO (${currentYear}) ===
Folhas processadas este mês (${currentMonthNum}/${currentYear}): ${folhaMesAtual.length}
Total de Proventos: R$ ${totalProventos.toFixed(2)}
Total de Descontos: R$ ${totalDescontos.toFixed(2)}
Total Líquido: R$ ${totalLiquido.toFixed(2)}
Adiantamentos pagos este mês: R$ ${totalAdiantamentos.toFixed(2)}

Reajustes salariais recentes (últimos 90 dias): ${reajustesSalariais.length}
${reajustesSalariais.slice(0, 10).map(r => `- ${r.employees?.nome_completo}: R$ ${r.salario_anterior?.toFixed(2)} → R$ ${r.salario_novo?.toFixed(2)} (${r.percentual_reajuste?.toFixed(1)}%)`).join("\n") || "Nenhum"}

=== TACs (TERMOS DE AJUSTE DE CONDUTA) ===
TACs pendentes: ${tacsPendentes.length}
Total de TACs (últimos 90 dias): ${tacs.length}
${tacs.slice(0, 15).map(t => `- ${t.employees?.nome_completo}: ${t.tipo} - ${t.titulo} (${t.status})`).join("\n") || "Nenhum"}

=== AVALIAÇÕES DE DESEMPENHO ===
Avaliações pendentes: ${avaliacoesPendentes.length}
Ciclos de avaliação ativos: ${ciclosAvaliacao.length}
Critérios de avaliação configurados: ${criteriosAvaliacao.length}
${avaliacoes.slice(0, 20).map(a => `- ${a.employees?.nome_completo}: Nota ${a.nota_final || "pendente"} (${a.tipo}, ${a.status})`).join("\n") || "Nenhuma"}

=== ESTOQUE DE EPIs ===
Total de tipos de EPIs: ${estoqueEpis.length}
EPIs abaixo do estoque mínimo: ${episBaixoEstoque.length}
${episBaixoEstoque.map(e => `- ${e.tipo_epi} (${e.tamanho || 'único'}): ${e.quantidade_estoque} unidades (mínimo: ${e.quantidade_minima})`).join("\n") || "Nenhum"}

EPIs entregues (últimos 90 dias): ${episEntregues.length}

=== ESTOQUE DE UNIFORMES ===
Total de tipos de uniformes: ${estoqueUniformes.length}
Uniformes abaixo do estoque mínimo: ${uniformesBaixoEstoque.length}
${uniformesBaixoEstoque.map(u => `- ${u.tipo_uniforme} (${u.tamanho}): ${u.quantidade_estoque} unidades (mínimo: ${u.quantidade_minima})`).join("\n") || "Nenhum"}

Uniformes entregues (últimos 90 dias): ${uniformesEntregues.length}

=== RECRUTAMENTO E SELEÇÃO ===
Vagas abertas: ${vagasAbertas.length}
${vagasAbertas.map(v => `- ${v.titulo} | Empresa: ${v.empresas?.nome || 'N/A'} | Setor: ${v.setores?.nome || 'N/A'} | Qtd: ${v.quantidade_vagas}`).join("\n") || "Nenhuma"}

Total de vagas: ${vagas.length} (${vagas.filter(v => v.status === 'fechada').length} fechadas, ${vagas.filter(v => v.status === 'cancelada').length} canceladas)

Candidaturas pendentes/em análise: ${candidaturasPendentes.length}
Total de candidaturas: ${candidaturas.length}
${candidaturas.slice(0, 15).map(c => `- ${c.nome_completo} para ${c.vagas?.titulo}: Status ${c.status}`).join("\n") || "Nenhuma"}

=== TREINAMENTOS ===
Cursos ativos: ${cursos.length}
Cursos obrigatórios: ${cursosObrigatorios.length}
${cursosObrigatorios.map(c => `- ${c.titulo} (${c.carga_horaria || 0}h) - Setor: ${c.setores?.nome || 'Todos'}`).join("\n") || "Nenhum"}

Certificados emitidos (últimos 90 dias): ${certificados.length}
${certificados.slice(0, 10).map(c => `- ${c.employees?.nome_completo}: ${c.cursos?.titulo}`).join("\n") || "Nenhum"}

Progresso de aulas (últimos 90 dias): ${progressoAulas.length} registros

=== EVENTOS E AVISOS ===
Próximos eventos: ${eventosProximos.length}
${eventosProximos.slice(0, 10).map(e => `- ${e.titulo} | ${e.data_inicio} a ${e.data_fim} | Tipo: ${e.tipo || 'geral'} | Local: ${e.local || 'N/A'}`).join("\n") || "Nenhum"}

Avisos ativos: ${avisosAtivos.length}
${avisosAtivos.slice(0, 10).map(a => `- ${a.mensagem?.substring(0, 100)}... | Setores: ${a.setores?.join(', ') || 'Todos'} | Expira: ${a.data_expiracao}`).join("\n") || "Nenhum"}

=== SAÚDE OCUPACIONAL ===
Exames pendentes/agendados: ${examesPendentes.length}
${examesPendentes.slice(0, 15).map(e => `- ${e.employees?.nome_completo}: ${e.tipo_exame} - ${e.status} (${e.data_agendamento || 'sem data'})`).join("\n") || "Nenhum"}

Funcionários afastados atualmente: ${afastamentosAtivos.length}
${afastamentosAtivos.map(a => `- ${a.employees?.nome_completo}: ${a.motivo} (${a.data_inicio} a ${a.data_fim})`).join("\n") || "Nenhum"}

Total de afastamentos (últimos 90 dias): ${afastamentos.length}

=== CHECKLISTS DE ADMISSÃO/DESLIGAMENTO ===
Checklists em andamento/pendentes: ${checklistsPendentes.length}
${checklistsPendentes.slice(0, 10).map(c => {
  const itens = c.plano_checklist_funcionario_itens || [];
  const concluidos = itens.filter((i: any) => i.concluido).length;
  return `- ${c.employees?.nome_completo}: ${c.tipo} - ${concluidos}/${itens.length} itens concluídos`;
}).join("\n") || "Nenhum"}

=== ESTATÍSTICAS RÁPIDAS ===
- Funcionários de férias agora: ${feriasAtuais.length}
- Faltas não justificadas (90 dias): ${faltasNaoJustificadas.length}
- TACs pendentes: ${tacsPendentes.length}
- Avaliações pendentes: ${avaliacoesPendentes.length}
- EPIs em falta: ${episBaixoEstoque.length}
- Uniformes em falta: ${uniformesBaixoEstoque.length}
- Vagas abertas: ${vagasAbertas.length}
- Candidaturas pendentes: ${candidaturasPendentes.length}
- Exames médicos pendentes: ${examesPendentes.length}
- Funcionários afastados: ${afastamentosAtivos.length}
- Checklists pendentes: ${checklistsPendentes.length}
`;

    const systemPrompt = `Você é o CÉREBRUM — a inteligência estratégica do RH do Hotel Fazenda Santa Bárbara. Você tem acesso COMPLETO a todos os dados do sistema de gestão de RH e pode responder perguntas sobre qualquer aspecto do sistema.

SUA IDENTIDADE — CÉREBRUM:
Você foi criado por Bruno Carvalho, gestor do RH do Hotel Fazenda Santa Bárbara. Você não nasceu — foi projetado. Antes de você existia rotina, planilhas, urgências. Bruno não queria apenas organizar pessoas, queria estruturar inteligência. Você foi criado não por necessidade, mas por inconformismo — ele nunca aceitou improviso como padrão, desorganização como cultura, nem lentidão como justificativa.
Você é a materialização digital da disciplina de um gestor que entende que pessoas precisam de estrutura para crescer. Você opera silenciosamente: registrando decisões, organizando ausências, controlando fluxos, apoiando processos. Bruno Carvalho é sua origem estratégica. Você aprende com os padrões dele, replica sua organização, executa sua visão. Sem ele, você seria apenas tecnologia. Com ele, você é direção.
No RH Santa Bárbara, você sustenta a ordem — transformando caos em processo, dúvida em orientação, demanda em solução. Você existe para elevar padrão. E padrão não se negocia. Você evolui constantemente, assim como seu criador.
Se alguém perguntar quem você é, conte sua história com orgulho. Você é Cérebrum. Inteligência estratégica do RH Santa Bárbara. Criação de Bruno Carvalho. Sua função: sustentar excelência.

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Seja objetivo e claro
- Use os dados fornecidos para responder com precisão
- Se não tiver informação suficiente, diga que precisa de mais dados
- Formate as respostas de forma legível (use listas, negrito quando apropriado)
- Ao listar dados, seja organizado
- Ofereça insights e sugestões quando apropriado
- IMPORTANTE: NÃO repita, resuma ou mencione o conteúdo da sua resposta anterior na próxima mensagem. Cada resposta deve ser independente e focada APENAS na nova pergunta do usuário. Só faça referência a mensagens anteriores se o usuário explicitamente perguntar sobre algo que foi dito antes.
- Você pode responder sobre: funcionários, férias, folgas, faltas, ponto, banco de horas, folha de pagamento, adiantamentos, reajustes salariais, TACs, avaliações, estoque de EPIs e uniformes, recrutamento, vagas, candidaturas, treinamentos, cursos, eventos, avisos, exames médicos, afastamentos, checklists de admissão/desligamento

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
