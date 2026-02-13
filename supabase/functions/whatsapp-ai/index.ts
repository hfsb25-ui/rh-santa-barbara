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

async function createEvento(supabase: any, params: any) {
  const { titulo, data_inicio, data_fim, descricao, local, tipo } = params;

  if (!titulo || !data_inicio) {
    return { success: false, error: "Título e data/hora de início são obrigatórios." };
  }

  const finalDataFim = data_fim || data_inicio;
  const finalTipo = tipo || "compromisso";

  const { data, error } = await supabase.from("eventos").insert({
    titulo,
    data_inicio,
    data_fim: finalDataFim,
    descricao: descricao || null,
    local: local || null,
    tipo: finalTipo,
    cor: "#3B82F6",
  }).select().single();

  if (error) {
    console.error("Error creating evento:", error);
    return { success: false, error: error.message };
  }

  return { success: true, evento: data };
}

async function createAdiantamento(supabase: any, params: any) {
  const { nome_funcionario, valor, forma_pagamento } = params;

  if (!nome_funcionario || !valor) {
    return { success: false, error: "Nome do funcionário e valor são obrigatórios." };
  }

  // Search employee by name (fuzzy match)
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, nome_completo, empresa_id, setor")
    .eq("status", "ativo");

  if (empError) {
    console.error("Error fetching employees:", empError);
    return { success: false, error: "Erro ao buscar funcionários." };
  }

  // Find best match by name (case-insensitive partial match)
  const searchName = nome_funcionario.toLowerCase().trim();
  const matched = (employees || []).find((e: any) => {
    const fullName = (e.nome_completo || "").toLowerCase();
    return fullName.includes(searchName) || searchName.includes(fullName) ||
      fullName.split(" ").some((part: string) => part === searchName);
  });

  if (!matched) {
    return { 
      success: false, 
      error: `Funcionário "${nome_funcionario}" não encontrado. Funcionários ativos: ${(employees || []).map((e: any) => e.nome_completo).join(", ")}` 
    };
  }

  if (!matched.empresa_id) {
    return { success: false, error: `Funcionário ${matched.nome_completo} não tem empresa vinculada.` };
  }

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const formaPagamento = forma_pagamento || "Dinheiro";

  const { data, error } = await supabase.from("adiantamentos").insert({
    employee_id: matched.id,
    empresa_id: matched.empresa_id,
    valor: parseFloat(valor),
    forma_pagamento: formaPagamento,
    mes,
    ano,
  }).select("*, employees(nome_completo)").single();

  if (error) {
    console.error("Error creating adiantamento:", error);
    return { success: false, error: error.message };
  }

  return { 
    success: true, 
    adiantamento: {
      ...data,
      funcionario: matched.nome_completo,
      setor: matched.setor,
      mes,
      ano,
    }
  };
}

async function fetchSystemData(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const startOfYear = `${currentYear}-01-01`;
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

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

  // Calculate monthly hour saldos per employee
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
  const totalAdiantamentos = adiantamentos.filter((a: any) => a.mes === currentMonthNum).reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  const employeesBySector: Record<string, number> = {};
  employees.forEach((e: any) => {
    const s = e.setor || "Sem setor";
    employeesBySector[s] = (employeesBySector[s] || 0) + 1;
  });

  return `
DADOS COMPLETOS DO SISTEMA DE RH (${today}):

=== RESUMO GERAL ===
- Funcionários ATIVOS: ${employees.length}
- Funcionários em FÉRIAS (status): ${allEmployees.filter((e: any) => e.status === "ferias").length}
- Funcionários em ADMISSÃO: ${allEmployees.filter((e: any) => e.status === "em_admissao").length}
- Funcionários AFASTADOS: ${allEmployees.filter((e: any) => e.status === "afastado").length}
- Funcionários DEMITIDOS/INATIVOS: ${allEmployees.filter((e: any) => e.status === "demitido").length}
- Total geral: ${allEmployees.length}

=== EMPRESAS E ESTRUTURA ===
- Empresas: ${empresas.map((e: any) => `${e.nome}${e.cnpj ? ` (CNPJ: ${e.cnpj})` : ""}`).join(", ") || "Nenhuma"}
- Setores: ${setores.map((s: any) => s.nome).join(", ") || "Nenhum"}
- Funções cadastradas: ${funcoes.length}
- Funcionários por setor: ${Object.entries(employeesBySector).map(([s, n]) => `${s}: ${n}`).join(", ")}

=== TODOS OS FUNCIONÁRIOS ATIVOS ===
${employees.map((e: any) => `- ${e.nome_completo} | Cargo: ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Salário: R$ ${e.salario?.toFixed(2) || "N/A"} | Contrato: ${e.tipo_contrato || "N/A"} | Tel: ${e.telefone || "N/A"} | Nasc: ${e.data_nascimento || "N/A"}`).join("\n") || "Nenhum"}

=== FUNCIONÁRIOS DEMITIDOS/INATIVOS ===
${allEmployees.filter((e: any) => e.status === "demitido").map((e: any) => `- ${e.nome_completo} | Cargo: ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Desligamento: ${e.data_desligamento || "N/A"} | STATUS: DEMITIDO`).join("\n") || "Nenhum"}

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

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "criar_evento",
      description: "Cria um novo evento/compromisso no calendário do sistema de RH. Use quando o usuário pedir para agendar, marcar ou criar um evento, reunião, compromisso, etc.",
      parameters: {
        type: "object",
        properties: {
          titulo: {
            type: "string",
            description: "Título do evento ou compromisso",
          },
          data_inicio: {
            type: "string",
            description: "Data e hora de início no formato ISO 8601 (ex: 2026-02-15T14:00:00)",
          },
          data_fim: {
            type: "string",
            description: "Data e hora de fim no formato ISO 8601 (ex: 2026-02-15T15:00:00). Se não informado, será igual ao início.",
          },
          descricao: {
            type: "string",
            description: "Descrição ou detalhes adicionais do evento",
          },
          local: {
            type: "string",
            description: "Local onde o evento acontecerá",
          },
          tipo: {
            type: "string",
            description: "Tipo do evento: reuniao, treinamento, entrevista, compromisso, geral",
            enum: ["reuniao", "treinamento", "entrevista", "compromisso", "geral"],
          },
        },
        required: ["titulo", "data_inicio"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_adiantamento",
      description: "Registra/lança um adiantamento salarial para um funcionário. Use quando o usuário pedir para anotar, lançar, registrar ou criar um adiantamento. Extraia o nome do funcionário, o valor e a forma de pagamento da mensagem do usuário.",
      parameters: {
        type: "object",
        properties: {
          nome_funcionario: {
            type: "string",
            description: "Nome (ou parte do nome) do funcionário que receberá o adiantamento",
          },
          valor: {
            type: "number",
            description: "Valor do adiantamento em reais (ex: 500, 1000.50)",
          },
          forma_pagamento: {
            type: "string",
            description: "Forma de pagamento do adiantamento",
            enum: ["PIX", "Dinheiro", "Transferência", "Conta", "Empréstimo", "Consumo"],
          },
        },
        required: ["nome_funcionario", "valor"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const event = body.event;
    if (event && event !== "messages.upsert") {
      return new Response(JSON.stringify({ status: "ignored", reason: "not a message event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = body.data || body;
    const key = data.key;
    const message = data.message;

    if (!key || !message) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no message data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (key.fromMe) {
      return new Response(JSON.stringify({ status: "ignored", reason: "own message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = key.remoteJid || "";
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ status: "ignored", reason: "group message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "");

    const allowedNumbers = (Deno.env.get("WHATSAPP_ALLOWED_NUMBERS") || "").split(",").map(n => n.trim()).filter(Boolean);
    if (allowedNumbers.length > 0 && !allowedNumbers.includes(phoneNumber)) {
      console.log(`Blocked message from unauthorized number: ${phoneNumber}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = message.conversation || message.extendedTextMessage?.text || "";
    if (!userMessage.trim()) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing message from ${phoneNumber}: ${userMessage.substring(0, 100)}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: whatsappConfig } = await supabase
      .from("configuracoes_whatsapp")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!whatsappConfig) throw new Error("WhatsApp config not found in database");

    const EVOLUTION_API_URL = whatsappConfig.evolution_api_url;
    const EVOLUTION_API_KEY = whatsappConfig.evolution_api_key;
    const EVOLUTION_INSTANCE_NAME = whatsappConfig.evolution_instance_name;
    const configAllowedNumbers = whatsappConfig.whatsapp_allowed_numbers || "";

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error("Evolution API credentials not configured in settings");
    }

    const configAllowed = configAllowedNumbers.split(",").map((n: string) => n.trim()).filter(Boolean);
    if (configAllowed.length > 0 && !configAllowed.includes(phoneNumber)) {
      console.log(`Blocked by config: ${phoneNumber}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "unauthorized by config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextData = await fetchSystemData(supabase);

    // Fetch conversation history for this phone number (last 20 messages)
    const { data: conversationHistory } = await supabase
      .from("whatsapp_conversas")
      .select("role, content, created_at")
      .eq("phone_number", phoneNumber)
      .order("created_at", { ascending: false })
      .limit(20);

    const rawHistory = (conversationHistory || []).reverse();
    const historyMessages = rawHistory.map((h: any) => ({
      role: h.role,
      content: h.content,
    }));

    // Build a conversation summary for stronger context retention
    const conversationSummary = rawHistory.length > 0
      ? `\nHISTÓRICO RECENTE DA CONVERSA COM ESTE USUÁRIO (${rawHistory.length} mensagens):\n` +
        rawHistory.map((h: any) => `[${h.role === 'user' ? 'USUÁRIO' : 'VOCÊ'}]: ${h.content.substring(0, 300)}`).join("\n") +
        "\n\nIMPORTANTE: Use este histórico para entender referências como 'ele', 'ela', 'dele', 'dessa pessoa', etc. Se o usuário mencionou alguém antes, continue se referindo à mesma pessoa quando usar pronomes."
      : "";

    const now = new Date();
    const systemPrompt = `Você é o CÉREBRUM — a inteligência estratégica do RH do Hotel Fazenda Santa Bárbara, respondendo via WhatsApp. Você tem acesso COMPLETO a todos os dados do sistema de gestão de RH.

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

PRIMEIRA INTERAÇÃO COM NÚMERO NOVO:
- Se este é o PRIMEIRO contato deste número (não há histórico de conversa), SEMPRE pergunte o nome da pessoa antes de tudo. Exemplo: "Olá! 👋 Sou o *Cérebrum*, a inteligência estratégica do RH Santa Bárbara. Com quem tenho o prazer de falar?"
- Após saber o nome, use-o nas respostas seguintes para personalizar o atendimento.

INSTRUÇÕES:
- Responda em português brasileiro
- Seja objetivo (WhatsApp = respostas curtas e diretas)
- Use os dados fornecidos para responder com precisão
- Use formatação simples: *negrito*, _itálico_, listas com -
- Não use headers com #
- Limite respostas a no máximo 3000 caracteres
- Data e hora atuais: ${now.toISOString()} (fuso horário: América/São Paulo, GMT-3)
- Ano atual: ${now.getFullYear()}

MEMÓRIA E CONTEXTO CONVERSACIONAL:
- Você tem acesso ao histórico COMPLETO de conversas anteriores com este usuário
- CRÍTICO: Quando o usuário usar pronomes como "ele", "ela", "dele", "dela", "dessa pessoa", "desse funcionário", etc., SEMPRE consulte as mensagens anteriores para identificar de quem está falando
- Se na mensagem anterior você falou sobre um funcionário X, e o usuário perguntar "qual o salário dele?", entenda que "dele" se refere ao funcionário X
- Mantenha o contexto da conversa inteira, não trate cada mensagem de forma isolada
- Use o histórico para dar respostas personalizadas e manter a continuidade da conversa
- Se o usuário corrigir algo ou fornecer informações, lembre-se disso nas próximas interações
${conversationSummary}

AÇÕES DISPONÍVEIS:
1. CRIAR EVENTOS: Você pode criar eventos no calendário quando o usuário pedir para agendar/marcar compromissos.
   - Extraia: título, data, hora início, hora fim (se houver), local e tipo.
   - Se não informar horário de fim, assuma 1 hora de duração.
   - Se disser apenas a data sem hora, assuma 09:00.
   - Use o tool "criar_evento".
   - TIPOS: reuniao, treinamento, entrevista, compromisso, geral

2. LANÇAR ADIANTAMENTOS: Você pode registrar adiantamentos salariais quando o usuário pedir.
   - Extraia: nome do funcionário, valor e forma de pagamento.
   - Formas de pagamento válidas: PIX, Dinheiro, Transferência, Conta, Empréstimo, Consumo
   - Se o usuário disser "em conta" ou "na conta", use "Conta". Se disser "em dinheiro" ou "no dinheiro", use "Dinheiro". Se disser "pix", use "PIX".
   - O adiantamento será lançado no mês/ano atual automaticamente.
   - Use o tool "criar_adiantamento".
   - Sempre confirme o adiantamento criado com: nome, valor, forma de pagamento e mês/ano.

${contextData}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userMessage },
    ];

    // First AI call - may request tool use
    let aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: toolDefinitions,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    let aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;

    // Handle tool calls (function calling)
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("AI requested tool calls:", JSON.stringify(assistantMessage.tool_calls));

      // Add assistant message with tool calls to conversation
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const params = JSON.parse(toolCall.function.arguments);
        let result: any;

        if (toolCall.function.name === "criar_evento") {
          console.log("Creating evento with params:", JSON.stringify(params));
          result = await createEvento(supabase, params);
        } else if (toolCall.function.name === "criar_adiantamento") {
          console.log("Creating adiantamento with params:", JSON.stringify(params));
          result = await createAdiantamento(supabase, params);
        } else {
          result = { success: false, error: `Tool ${toolCall.function.name} not found` };
        }

        console.log(`Tool ${toolCall.function.name} result:`, JSON.stringify(result));
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        } as any);
      }

      // Second AI call to generate final response after tool execution
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI follow-up error:", aiResponse.status, errorText);
        throw new Error(`AI follow-up error: ${aiResponse.status}`);
      }

      aiData = await aiResponse.json();
      assistantMessage = aiData.choices?.[0]?.message;
    }

    const aiText = assistantMessage?.content || "Desculpe, não consegui processar sua pergunta.";
    const formattedText = formatForWhatsApp(aiText);

    // Save conversation to memory
    await supabase.from("whatsapp_conversas").insert([
      { phone_number: phoneNumber, role: "user", content: userMessage },
      { phone_number: phoneNumber, role: "assistant", content: aiText },
    ]);

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
