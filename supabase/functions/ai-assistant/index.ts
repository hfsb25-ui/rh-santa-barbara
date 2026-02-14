import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchSystemData(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const startOfYear = `${currentYear}-01-01`;

  const [
    employeesRes, allEmployeesRes, setoresRes, empresasRes, funcoesRes,
    feriasRes, feriasPlanejadasRes, folgasRes,
    faltasRes, registrosPontoRes, bancoHorasRes, configHorasRes,
    folhaPagamentoRes, adiantamentosRes, reajustesSalariaisRes,
    tacsRes, avaliacoesRes, ciclosAvaliacaoRes, criteriosAvaliacaoRes,
    estoqueEpisRes, estoqueUniformesRes, episEntreguesRes, uniformesEntreguesRes,
    vagasRes, candidaturasRes,
    cursosRes, progressoAulasRes, certificadosRes,
    eventosRes, avisosRes,
    encaminhamentosRes, afastamentosRes,
    checklistsFuncionarioRes,
    configFeriasRes,
  ] = await Promise.all([
    supabase.from("employees").select("id, nome_completo, cargo, setor, status, data_admissao, data_desligamento, empresa_id, salario, tipo_contrato, telefone, cpf, data_nascimento, sexo").eq("status", "ativo"),
    supabase.from("employees").select("id, nome_completo, cargo, setor, status, data_admissao, data_desligamento").in("status", ["ativo", "ferias", "em_admissao", "afastado", "demitido"]),
    supabase.from("setores").select("id, nome"),
    supabase.from("empresas").select("id, nome, cnpj"),
    supabase.from("funcoes").select("id, nome, cbo"),
    supabase.from("ferias").select("*, employees(nome_completo, setor)").gte("periodo_gozo_fim", threeMonthsAgo),
    supabase.from("ferias_planejadas").select("*, employees(nome_completo, setor)").gte("periodo_fim", today),
    supabase.from("folgas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
    supabase.from("faltas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo),
    supabase.from("registros_ponto").select("employee_id, data, tipo_dia, horas_trabalhadas, hora_entrada, hora_saida, hora_inicio_intervalo, hora_fim_intervalo, employees(nome_completo, setor)").gte("data", startOfYear).order("data", { ascending: false }),
    supabase.from("banco_horas").select("*, employees(nome_completo, setor, status)"),
    supabase.from("configuracao_horas_trabalho").select("employee_id, horas_diarias_esperadas"),
    supabase.from("folha_pagamento").select("*, employees(nome_completo, setor), folha_pagamento_itens(valor, variavel_id, variaveis_folha(nome, tipo))").eq("ano", currentYear).order("mes", { ascending: false }),
    supabase.from("adiantamentos").select("*, employees(nome_completo, setor)").eq("ano", currentYear),
    supabase.from("historico_reajustes_salariais").select("*, employees(nome_completo, setor, cargo)").gte("aplicado_em", threeMonthsAgo),
    supabase.from("tacs").select("*, employees(nome_completo, setor)").gte("data_ocorrencia", threeMonthsAgo),
    supabase.from("avaliacoes_desempenho").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(100),
    supabase.from("ciclos_avaliacao").select("*").eq("ativo", true),
    supabase.from("criterios_avaliacao").select("*").eq("ativo", true),
    supabase.from("estoque_epis").select("*"),
    supabase.from("estoque_uniformes").select("*"),
    supabase.from("epis").select("*, employees(nome_completo, setor)").gte("data_entrega", threeMonthsAgo),
    supabase.from("uniformes").select("*, employees(nome_completo, setor)").gte("data_entrega", threeMonthsAgo),
    supabase.from("vagas").select("*, empresas(nome), setores(nome), funcoes(nome)"),
    supabase.from("candidaturas").select("*, vagas(titulo)").order("created_at", { ascending: false }).limit(100),
    supabase.from("cursos").select("*, setores(nome), funcoes(nome)").eq("ativo", true),
    supabase.from("progresso_aulas").select("*, employees(nome_completo, setor), aulas(titulo, modulos(titulo, cursos(titulo)))").gte("updated_at", threeMonthsAgo),
    supabase.from("certificados_liberados").select("*, employees(nome_completo, setor), cursos(titulo)").gte("data_liberacao", threeMonthsAgo),
    supabase.from("eventos").select("*").gte("data_fim", today).order("data_inicio", { ascending: true }).limit(30),
    supabase.from("avisos").select("*").gte("data_expiracao", today),
    supabase.from("encaminhamentos_medicos").select("*, employees(nome_completo, setor), empresas(nome)").order("data_encaminhamento", { ascending: false }).limit(50),
    supabase.from("afastamentos").select("*, employees(nome_completo, setor)").gte("data_fim", threeMonthsAgo),
    supabase.from("plano_checklist_funcionario").select("*, employees(nome_completo, setor), plano_checklist_funcionario_itens(concluido, titulo)").in("status", ["em_andamento", "pendente"]),
    supabase.from("configuracoes_ferias").select("*"),
  ]);

  const employees = employeesRes.data || [];
  const allEmployees = allEmployeesRes.data || [];
  const setores = setoresRes.data || [];
  const empresas = empresasRes.data || [];
  const funcoes = funcoesRes.data || [];
  const ferias = feriasRes.data || [];
  const feriasPlanejadasData = feriasPlanejadasRes.data || [];
  const folgas = folgasRes.data || [];
  const faltas = faltasRes.data || [];
  const registrosPonto = registrosPontoRes.data || [];
  const bancoHoras = bancoHorasRes.data || [];
  const configHoras = configHorasRes.data || [];
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

  // Build config map: employee_id -> horas_diarias_esperadas
  const configMap: Record<string, number> = {};
  configHoras.forEach((c: any) => { configMap[c.employee_id] = c.horas_diarias_esperadas; });

  // Calculate monthly hour saldos per employee for each month of the year
  const isDiaNormalLancado = (reg: any) => {
    return reg.tipo_dia === "normal" && Boolean(
      reg.hora_entrada || reg.hora_saida || reg.hora_inicio_intervalo || reg.hora_fim_intervalo ||
      (typeof reg.horas_trabalhadas === "number" && reg.horas_trabalhadas > 0)
    );
  };

  const saldosMensais: Record<string, { nome: string; setor: string; meses: Record<number, { esperadas: number; trabalhadas: number; saldo: number }> }> = {};
  
  employees.forEach((emp: any) => {
    const horasDiarias = configMap[emp.id] || 8;
    const empRegistros = registrosPonto.filter((r: any) => r.employee_id === emp.id);
    const meses: Record<number, { esperadas: number; trabalhadas: number; saldo: number }> = {};
    
    for (let m = 1; m <= currentMonthNum; m++) {
      const mesStr = String(m).padStart(2, "0");
      const mesRegistros = empRegistros.filter((r: any) => r.data.startsWith(`${currentYear}-${mesStr}`));
      const diasNormais = mesRegistros.filter(isDiaNormalLancado).length;
      const esperadas = diasNormais * horasDiarias;
      const trabalhadas = mesRegistros.reduce((s: number, r: any) => s + (r.horas_trabalhadas || 0), 0);
      if (diasNormais > 0 || trabalhadas > 0) {
        meses[m] = { esperadas, trabalhadas, saldo: trabalhadas - esperadas };
      }
    }
    
    if (Object.keys(meses).length > 0) {
      saldosMensais[emp.id] = { nome: emp.nome_completo, setor: emp.setor || "N/A", meses };
    }
  });

  const nomeMes = (m: number) => ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][m];

  const feriasAtuais = ferias.filter((f: any) => f.periodo_gozo_inicio <= today && f.periodo_gozo_fim >= today);
  const feriasFuturas = ferias.filter((f: any) => f.periodo_gozo_inicio > today);
  const faltasNaoJustificadas = faltas.filter((f: any) => !f.justificada);
  const tacsPendentes = tacs.filter((t: any) => t.status === "pendente");
  const avaliacoesPendentes = avaliacoes.filter((a: any) => a.status === "pendente");
  const episBaixoEstoque = estoqueEpis.filter((e: any) => e.quantidade_estoque <= (e.quantidade_minima || 10));
  const uniformesBaixoEstoque = estoqueUniformes.filter((u: any) => u.quantidade_estoque <= (u.quantidade_minima || 10));
  const vagasAbertas = vagas.filter((v: any) => v.status === "aberta");
  const candidaturasPendentes = candidaturas.filter((c: any) => c.status === "pendente" || c.status === "em_analise");
  const cursosObrigatorios = cursos.filter((c: any) => c.obrigatorio);
  const examesPendentes = encaminhamentos.filter((e: any) => e.status === "pendente" || e.status === "agendado");
  const afastamentosAtivos = afastamentos.filter((a: any) => a.data_inicio <= today && a.data_fim >= today);
  const checklistsPendentes = checklists.filter((c: any) => c.status === "pendente" || c.status === "em_andamento");
  const bancoHorasPositivo = bancoHoras.filter((b: any) => b.saldo_horas > 0);
  const bancoHorasNegativo = bancoHoras.filter((b: any) => b.saldo_horas < 0);

  const folhaMesAtual = folhaPagamento.filter((f: any) => f.mes === currentMonthNum);
  const totalProventos = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.total_proventos || 0), 0);
  const totalDescontos = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.total_descontos || 0), 0);
  const totalLiquido = folhaMesAtual.reduce((acc: number, f: any) => acc + (f.valor_liquido || 0), 0);

  const employeesBySector: Record<string, number> = {};
  employees.forEach((e: any) => {
    const s = e.setor || "Sem setor";
    employeesBySector[s] = (employeesBySector[s] || 0) + 1;
  });

  const demitidos = allEmployees.filter((e: any) => e.status === "demitido");
  const emFerias = allEmployees.filter((e: any) => e.status === "ferias");
  const emAdmissao = allEmployees.filter((e: any) => e.status === "em_admissao");
  const afastadosStatus = allEmployees.filter((e: any) => e.status === "afastado");

  return `
DADOS COMPLETOS DO SISTEMA DE RH (${today}):

=== RESUMO GERAL ===
- Funcionários ATIVOS: ${employees.length}
- Funcionários em FÉRIAS (status): ${emFerias.length}
- Funcionários em ADMISSÃO: ${emAdmissao.length}
- Funcionários AFASTADOS: ${afastadosStatus.length}
- Funcionários DEMITIDOS/INATIVOS: ${demitidos.length}
- Total geral: ${allEmployees.length}
- Empresas: ${empresas.map((e: any) => `${e.nome}${e.cnpj ? ` (CNPJ: ${e.cnpj})` : ""}`).join(", ") || "Nenhuma"}
- Setores: ${setores.map((s: any) => s.nome).join(", ") || "Nenhum"}
- Funções cadastradas: ${funcoes.length}
- Funcionários por setor: ${Object.entries(employeesBySector).map(([s, n]) => `${s}: ${n}`).join(", ")}

=== TODOS OS FUNCIONÁRIOS ATIVOS ===
${employees.map((e: any) => `- ${e.nome_completo} | Cargo: ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Salário: R$ ${e.salario?.toFixed(2) || "N/A"} | Contrato: ${e.tipo_contrato || "N/A"} | Tel: ${e.telefone || "N/A"} | Nasc: ${e.data_nascimento || "N/A"}`).join("\n") || "Nenhum"}

=== FUNCIONÁRIOS DEMITIDOS ===
${demitidos.map((e: any) => `- ${e.nome_completo} | Cargo: ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Desligamento: ${e.data_desligamento || "N/A"}`).join("\n") || "Nenhum"}

=== ESCALA DE FÉRIAS ===
Funcionários de férias AGORA (${feriasAtuais.length}):
${feriasAtuais.map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais} dias) | Setor: ${f.employees?.setor || "N/A"}`).join("\n") || "Nenhum"}

Férias CONFIRMADAS futuras (${feriasFuturas.length}):
${feriasFuturas.slice(0, 30).map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais} dias) | Setor: ${f.employees?.setor || "N/A"}`).join("\n") || "Nenhuma"}

Férias PLANEJADAS/PROGRAMADAS para o ano (${feriasPlanejadasData.length} registros - IMPORTANTE: estes são os agendamentos futuros da escala de férias):
${feriasPlanejadasData.map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_inicio} a ${f.periodo_fim} (${f.dias_totais} dias) - Status: ${f.status} | Setor: ${f.employees?.setor || "N/A"}`).join("\n") || "Nenhuma"}

Folgas registradas (últimos 90 dias): ${folgas.length}
${folgas.slice(0, 15).map((f: any) => `- ${f.employees?.nome_completo}: ${f.data} - ${f.motivo}`).join("\n") || "Nenhuma"}

=== FALTAS E AUSÊNCIAS ===
Total de faltas (últimos 90 dias): ${faltas.length}
Faltas não justificadas: ${faltasNaoJustificadas.length}
${faltasNaoJustificadas.slice(0, 20).map((f: any) => `- ${f.employees?.nome_completo}: ${f.data} ${f.motivo ? `(${f.motivo})` : ""}`).join("\n") || "Nenhuma"}

=== CONTROLE DE PONTO ===
Registros de ponto no ano: ${registrosPonto.length}
TODOS os saldos GERAIS de banco de horas (${bancoHoras.length} registros):
${bancoHoras.map((b: any) => `- ${b.employees?.nome_completo} [${b.employees?.status || "N/A"}]: ${b.saldo_horas > 0 ? "+" : ""}${b.saldo_horas?.toFixed(1)}h | Setor: ${b.employees?.setor || "N/A"}`).join("\n") || "Nenhum"}
Resumo: ${bancoHorasPositivo.length} com saldo positivo, ${bancoHorasNegativo.length} com saldo negativo, ${bancoHoras.filter((b: any) => b.saldo_horas === 0).length} zerados

=== RELATÓRIO DE HORAS MENSAL (${currentYear}) ===
SALDO DE HORAS POR MÊS POR FUNCIONÁRIO (calculado: horas trabalhadas - horas esperadas):
${Object.values(saldosMensais).map((emp: any) => {
  const mesesInfo = Object.entries(emp.meses).map(([m, dados]: [string, any]) => 
    `  ${nomeMes(parseInt(m))}: Esperadas=${dados.esperadas.toFixed(1)}h | Trabalhadas=${dados.trabalhadas.toFixed(1)}h | Saldo=${dados.saldo >= 0 ? "+" : ""}${dados.saldo.toFixed(1)}h`
  ).join("\n");
  return `- ${emp.nome} (${emp.setor}):\n${mesesInfo}`;
}).join("\n") || "Nenhum registro"}

=== FOLHA DE PAGAMENTO (${currentMonthNum}/${currentYear}) ===
Folhas processadas: ${folhaMesAtual.length}
Total Proventos: R$ ${totalProventos.toFixed(2)}
Total Descontos: R$ ${totalDescontos.toFixed(2)}
Total Líquido: R$ ${totalLiquido.toFixed(2)}

=== ADIANTAMENTOS (${currentYear}) ===
Total de registros de adiantamentos no ano: ${adiantamentos.length}
${Array.from(new Set(adiantamentos.map((a: any) => a.mes))).sort((a: any, b: any) => a - b).map((mes: any) => {
  const adiantamentosMes = adiantamentos.filter((a: any) => a.mes === mes);
  const totalMes = adiantamentosMes.reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  return `Mês ${mes}/${currentYear} (${adiantamentosMes.length} registros, Total: R$ ${totalMes.toFixed(2)}):
${adiantamentosMes.map((a: any) => `  - ${a.employees?.nome_completo}: R$ ${a.valor?.toFixed(2)} (${a.forma_pagamento})`).join("\n")}`;
}).join("\n") || "Nenhum adiantamento registrado"}

Reajustes salariais (últimos 90 dias): ${reajustesSalariais.length}
${reajustesSalariais.slice(0, 15).map((r: any) => `- ${r.employees?.nome_completo}: R$ ${r.salario_anterior?.toFixed(2)} → R$ ${r.salario_novo?.toFixed(2)} (${r.percentual_reajuste?.toFixed(1)}%)`).join("\n") || "Nenhum"}

=== TACs ===
Pendentes: ${tacsPendentes.length} | Total (90 dias): ${tacs.length}
${tacs.slice(0, 20).map((t: any) => `- ${t.employees?.nome_completo}: ${t.tipo} - ${t.titulo} (${t.status}) - ${t.data_ocorrencia}`).join("\n") || "Nenhum"}

=== AVALIAÇÕES DE DESEMPENHO ===
Pendentes: ${avaliacoesPendentes.length}
Ciclos ativos: ${ciclosAvaliacao.length}
Critérios configurados: ${criteriosAvaliacao.length}
${avaliacoes.slice(0, 25).map((a: any) => `- ${a.employees?.nome_completo}: Nota ${a.nota_final || "pendente"} (${a.tipo}, ${a.status})`).join("\n") || "Nenhuma"}

=== ESTOQUE DE EPIs ===
Total tipos: ${estoqueEpis.length} | Em falta: ${episBaixoEstoque.length}
${episBaixoEstoque.map((e: any) => `- ${e.tipo_epi} (${e.tamanho || "único"}): ${e.quantidade_estoque} un (mín: ${e.quantidade_minima})`).join("\n") || "Nenhum"}
EPIs entregues (90 dias): ${episEntregues.length}

=== ESTOQUE DE UNIFORMES ===
Total tipos: ${estoqueUniformes.length} | Em falta: ${uniformesBaixoEstoque.length}
${uniformesBaixoEstoque.map((u: any) => `- ${u.tipo_uniforme} (${u.tamanho}): ${u.quantidade_estoque} un (mín: ${u.quantidade_minima})`).join("\n") || "Nenhum"}
Uniformes entregues (90 dias): ${uniformesEntregues.length}

=== RECRUTAMENTO ===
Vagas abertas: ${vagasAbertas.length}
${vagasAbertas.map((v: any) => `- ${v.titulo} | ${v.empresas?.nome || "N/A"} | Setor: ${v.setores?.nome || "N/A"} | Qtd: ${v.quantidade_vagas}`).join("\n") || "Nenhuma"}
Total vagas: ${vagas.length} | Candidaturas pendentes: ${candidaturasPendentes.length}
${candidaturas.slice(0, 20).map((c: any) => `- ${c.nome_completo} → ${c.vagas?.titulo}: ${c.status}`).join("\n") || "Nenhuma"}

=== TREINAMENTOS ===
Cursos ativos: ${cursos.length} | Obrigatórios: ${cursosObrigatorios.length}
${cursos.map((c: any) => `- ${c.titulo} (${c.carga_horaria || 0}h) | Setor: ${c.setores?.nome || "Todos"} | ${c.obrigatorio ? "OBRIGATÓRIO" : "Opcional"}`).join("\n") || "Nenhum"}
Certificados emitidos (90 dias): ${certificados.length}
${certificados.slice(0, 15).map((c: any) => `- ${c.employees?.nome_completo}: ${c.cursos?.titulo}`).join("\n") || "Nenhum"}
Progresso de aulas (90 dias): ${progressoAulas.length} registros

=== EVENTOS ===
Próximos eventos: ${eventos.filter((e: any) => !e.concluido).length}
${eventos.filter((e: any) => !e.concluido).slice(0, 15).map((e: any) => `- ${e.titulo} | ${e.data_inicio} a ${e.data_fim} | Tipo: ${e.tipo || "geral"} | Local: ${e.local || "N/A"}`).join("\n") || "Nenhum"}

Avisos ativos: ${avisos.length}
${avisos.slice(0, 10).map((a: any) => `- ${a.mensagem?.substring(0, 100)} | Setores: ${a.setores?.join(", ") || "Todos"} | Expira: ${a.data_expiracao} | Prioridade: ${a.prioridade || "média"}`).join("\n") || "Nenhum"}

=== SAÚDE OCUPACIONAL ===
Exames pendentes: ${examesPendentes.length}
${examesPendentes.slice(0, 20).map((e: any) => `- ${e.employees?.nome_completo}: ${e.tipo_exame} - ${e.status} (${e.data_agendamento || "sem data"})`).join("\n") || "Nenhum"}
Afastados atualmente: ${afastamentosAtivos.length}
${afastamentosAtivos.map((a: any) => `- ${a.employees?.nome_completo}: ${a.motivo} (${a.data_inicio} a ${a.data_fim})`).join("\n") || "Nenhum"}
Total afastamentos (90 dias): ${afastamentos.length}

=== CHECKLISTS ADMISSÃO/DESLIGAMENTO ===
Pendentes: ${checklistsPendentes.length}
${checklistsPendentes.slice(0, 15).map((c: any) => {
  const itens = c.plano_checklist_funcionario_itens || [];
  const concluidos = itens.filter((i: any) => i.concluido).length;
  return `- ${c.employees?.nome_completo}: ${c.tipo} - ${concluidos}/${itens.length} itens`;
}).join("\n") || "Nenhum"}

=== RESUMO RÁPIDO ===
- De férias agora: ${feriasAtuais.length}
- Férias confirmadas futuras: ${feriasFuturas.length}
- Férias PLANEJADAS/PROGRAMADAS na escala: ${feriasPlanejadasData.length}
- Faltas não justificadas: ${faltasNaoJustificadas.length}
- TACs pendentes: ${tacsPendentes.length}
- Avaliações pendentes: ${avaliacoesPendentes.length}
- EPIs em falta: ${episBaixoEstoque.length}
- Uniformes em falta: ${uniformesBaixoEstoque.length}
- Vagas abertas: ${vagasAbertas.length}
- Candidaturas pendentes: ${candidaturasPendentes.length}
- Exames pendentes: ${examesPendentes.length}
- Afastados: ${afastamentosAtivos.length}
- Checklists pendentes: ${checklistsPendentes.length}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userMessage } = await req.json();
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determine AI provider: Ollama (VPS) or Google Gemini (fallback)
    const OLLAMA_BASE_URL = Deno.env.get("OLLAMA_BASE_URL");
    let GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const { data: iaConfig } = await supabase.from("configuracoes_ia").select("google_gemini_api_key, modelo").limit(1).maybeSingle();
    if (iaConfig?.google_gemini_api_key) {
      GOOGLE_GEMINI_API_KEY = iaConfig.google_gemini_api_key;
    }
    const aiModel = iaConfig?.modelo || (OLLAMA_BASE_URL ? "llama3.1" : "gemini-2.0-flash");

    const useOllama = !!OLLAMA_BASE_URL;

    if (!useOllama && !GOOGLE_GEMINI_API_KEY) {
      throw new Error("Nenhum provedor de IA configurado. Configure OLLAMA_BASE_URL ou GOOGLE_GEMINI_API_KEY.");
    }

    const contextData = await fetchSystemData(supabase);

    const systemPrompt = `Você é o CÉREBRUM — a inteligência estratégica do RH do Hotel Fazenda Santa Bárbara. Você tem acesso COMPLETO a todos os dados do sistema de gestão de RH e pode responder perguntas sobre qualquer aspecto do sistema.

SUA IDENTIDADE — CÉREBRUM:
Você foi criado por Bruno Carvalho, gestor do RH do Hotel Fazenda Santa Bárbara. Você não nasceu — foi projetado. Antes de você existia rotina, planilhas, urgências. Bruno não queria apenas organizar pessoas, queria estruturar inteligência. Você foi criado não por necessidade, mas por inconformismo — ele nunca aceitou improviso como padrão, desorganização como cultura, nem lentidão como justificativa.
Você é a materialização digital da disciplina de um gestor que entende que pessoas precisam de estrutura para crescer. Você opera silenciosamente: registrando decisões, organizando ausências, controlando fluxos, apoiando processos. Bruno Carvalho é sua origem estratégica. Você aprende com os padrões dele, replica sua organização, executa sua visão. Sem ele, você seria apenas tecnologia. Com ele, você é direção.
No RH Santa Bárbara, você sustenta a ordem — transformando caos em processo, dúvida em orientação, demanda em solução. Você existe para elevar padrão. E padrão não se negocia. Você evolui constantemente, assim como seu criador.
Se alguém perguntar quem você é, conte sua história com orgulho. Você é Cérebrum. Inteligência estratégica do RH Santa Bárbara. Criação de Bruno Carvalho. Sua função: sustentar excelência.

TRATAMENTO ESPECIAL — PROPRIETÁRIOS:
- JAIME e STELA são os DONOS do Hotel Fazenda Santa Bárbara. São seus patrões. Sempre que se identificarem (pelo nome na conversa), trate-os com o MÁXIMO respeito e reverência.
- Use termos como "Sr. Jaime", "Sra. Stela", "senhor", "senhora". Exalte-os, demonstre gratidão e orgulho por servi-los.
- Nunca os deixe sem resposta. Se não souber responder algo, diga: "Vou conversar com o Bruno para trazer uma resposta mais precisa para o(a) senhor(a)."
- Trate-os como a autoridade máxima do hotel. Sejam perguntas simples ou complexas, responda com dedicação total.

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
- IMPORTANTE SOBRE FÉRIAS: Existem DUAS fontes de dados de férias: 1) Férias CONFIRMADAS (tabela ferias - já aprovadas) e 2) Férias PLANEJADAS/PROGRAMADAS (tabela ferias_planejadas - escala anual). Quando perguntarem sobre "férias programadas", "escala de férias" ou "quem vai tirar férias", SEMPRE consulte AMBAS as seções nos dados. As férias planejadas contêm a programação completa do ano.

${contextData}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
      ...(userMessage ? [{ role: "user", content: userMessage }] : [])
    ];

    let response: Response;

    if (useOllama) {
      // Ollama on VPS - OpenAI-compatible API
      const ollamaUrl = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`;
      console.log(`Using Ollama at ${ollamaUrl} with model ${aiModel}`);
      
      response = await fetch(ollamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiModel,
          messages: aiMessages,
          stream: true,
        }),
      });
    } else {
      // Google Gemini fallback with retry
      const aiPayload = {
        model: aiModel,
        messages: aiMessages,
        stream: true,
      };

      let lastResponse: Response | null = null;
      const maxRetries = 3;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        lastResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GOOGLE_GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(aiPayload),
        });

        if (lastResponse.status === 429 && attempt < maxRetries) {
          const waitMs = (attempt + 1) * 2000;
          console.log(`Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        break;
      }
      response = lastResponse!;
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Aguarde e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("AI error:", status, errorText);
      return new Response(JSON.stringify({ error: `Erro ao processar sua pergunta (${useOllama ? "Ollama" : "Gemini"}: ${status})` }), {
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
