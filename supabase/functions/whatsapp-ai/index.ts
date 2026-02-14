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

async function createEvento(supabase: any, params: any, phoneNumber?: string) {
  const { titulo, data_inicio, data_fim, descricao, local, tipo, lembrete_minutos } = params;

  if (!titulo || !data_inicio) {
    return { success: false, error: "Título e data/hora de início são obrigatórios." };
  }

  const finalDataFim = data_fim || data_inicio;
  const finalTipo = tipo || "compromisso";

  const insertData: any = {
    titulo,
    data_inicio,
    data_fim: finalDataFim,
    descricao: descricao || null,
    local: local || null,
    tipo: finalTipo,
    cor: "#3B82F6",
    lembrete_minutos: lembrete_minutos || 30,
    lembrete_enviado: false,
  };

  // Associate event with the WhatsApp phone number that created it
  if (phoneNumber) {
    insertData.whatsapp_phone = phoneNumber;
  }

  const { data, error } = await supabase.from("eventos").insert(insertData).select().single();

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

async function salvarMemoria(supabase: any, params: any, phoneNumber: string, nomeProfessor?: string) {
  const { conteudo, categoria, contexto } = params;
  if (!conteudo) return { success: false, error: "Conteúdo da memória é obrigatório." };

  const { data, error } = await supabase.from("cerebrum_memorias").insert({
    conteudo,
    categoria: categoria || "geral",
    contexto: contexto || null,
    ensinado_por: phoneNumber,
    nome_professor: nomeProfessor || null,
  }).select().single();

  if (error) {
    console.error("Error saving memoria:", error);
    return { success: false, error: error.message };
  }
  return { success: true, memoria: data };
}

async function fetchMemorias(supabase: any) {
  const { data } = await supabase
    .from("cerebrum_memorias")
    .select("conteudo, categoria, nome_professor, created_at")
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(100);
  return data || [];
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
          lembrete_minutos: {
            type: "number",
            description: "Quantos minutos antes do evento o lembrete deve ser enviado via WhatsApp. Exemplo: 10 para 10 minutos antes, 30 para 30 minutos antes, 60 para 1 hora antes. Padrão: 30 minutos.",
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
  {
    type: "function",
    function: {
      name: "salvar_memoria",
      description: "Salva um aprendizado permanente na memória do Cérebrum. Use SEMPRE que o usuário ensinar algo novo, corrigir uma informação, informar uma preferência, regra do hotel, padrão do RH, ou qualquer fato que deva ser lembrado permanentemente. Exemplos: 'lembre que o Jaime prefere relatórios semanais', 'a regra do hotel é X', 'quando eu perguntar Y, responda Z', 'o apelido do fulano é X', correções de informações incorretas.",
      parameters: {
        type: "object",
        properties: {
          conteudo: {
            type: "string",
            description: "O conhecimento/fato/regra/preferência a ser memorizado permanentemente. Escreva de forma clara e objetiva.",
          },
          categoria: {
            type: "string",
            description: "Categoria do aprendizado",
            enum: ["preferencia", "correcao", "padrao_rh", "fato", "regra", "geral"],
          },
          contexto: {
            type: "string",
            description: "Contexto em que o aprendizado foi ensinado (ex: 'Usuário corrigiu informação sobre horário de reuniões')",
          },
        },
        required: ["conteudo"],
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

    let userMessage = message.conversation || message.extendedTextMessage?.text || "";
    
    // Handle audio messages - transcribe using AI
    const audioMessage = message.audioMessage;
    if (audioMessage && !userMessage.trim()) {
      console.log(`Audio message received from ${phoneNumber}, attempting transcription...`);
      
      const SUPABASE_URL_CHECK = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY_CHECK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseForAudio = createClient(SUPABASE_URL_CHECK!, SUPABASE_SERVICE_ROLE_KEY_CHECK!);

      // Try to get API keys from DB first, fallback to env
      let GOOGLE_GEMINI_API_KEY_CHECK = Deno.env.get("GOOGLE_GEMINI_API_KEY");
      let OPENAI_API_KEY_CHECK = Deno.env.get("OPENAI_API_KEY");
      const { data: iaConfigAudio } = await supabaseForAudio.from("configuracoes_ia").select("google_gemini_api_key, openai_api_key, modelo, provedor").limit(1).maybeSingle();
      if (iaConfigAudio?.google_gemini_api_key) GOOGLE_GEMINI_API_KEY_CHECK = iaConfigAudio.google_gemini_api_key;
      if (iaConfigAudio?.openai_api_key) OPENAI_API_KEY_CHECK = iaConfigAudio.openai_api_key;
      const audioProvedor = iaConfigAudio?.provedor || "gemini";
      
      const { data: whatsappConfigAudio } = await supabaseForAudio
        .from("configuracoes_whatsapp")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (!whatsappConfigAudio) throw new Error("WhatsApp config not found");
      
      const evoUrl = whatsappConfigAudio.evolution_api_url;
      const evoKey = whatsappConfigAudio.evolution_api_key;
      const evoInstance = whatsappConfigAudio.evolution_instance_name;
      
      try {
        // Download audio from Evolution API using base64 endpoint
        const mediaId = key.id;
        const downloadUrl = `${evoUrl}/chat/getBase64FromMediaMessage/${evoInstance}`;
        
        const mediaResponse = await fetch(downloadUrl, {
          method: "POST",
          headers: {
            "apikey": evoKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              key: {
                remoteJid: key.remoteJid,
                id: key.id,
              },
              message: data.message,
            },
          }),
        });
        
        if (!mediaResponse.ok) {
          console.error("Failed to download audio:", mediaResponse.status);
          throw new Error("Failed to download audio");
        }
        
        const mediaData = await mediaResponse.json();
        const audioBase64 = mediaData.base64;
        const mimetype = audioMessage.mimetype || "audio/ogg";
        
        if (!audioBase64) {
          throw new Error("No base64 audio data received");
        }
        
        console.log(`Audio downloaded, size: ${audioBase64.length} chars, mime: ${mimetype}`);
        
        let transcribedText = "";
        
        // Use OpenAI Whisper when provider is OpenAI (better for audio transcription)
        if (audioProvedor === "openai" && OPENAI_API_KEY_CHECK) {
          console.log("Transcribing with OpenAI Whisper...");
          
          // Convert base64 to binary
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const ext = mimetype.includes("ogg") ? "ogg" : mimetype.includes("mp4") ? "mp4" : "wav";
          const audioBlob = new Blob([bytes], { type: mimetype.split(";")[0].trim() });
          const audioFile = new File([audioBlob], `audio.${ext}`, { type: mimetype.split(";")[0].trim() });
          
          const formData = new FormData();
          formData.append("file", audioFile);
          formData.append("model", "whisper-1");
          formData.append("language", "pt");
          
          const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY_CHECK}`,
            },
            body: formData,
          });
          
          if (!whisperResponse.ok) {
            const errText = await whisperResponse.text();
            console.error("Whisper transcription failed:", whisperResponse.status, errText);
            throw new Error("Whisper transcription failed");
          }
          
          const whisperData = await whisperResponse.json();
          transcribedText = whisperData.text?.trim() || "";
          console.log(`Whisper transcription: "${transcribedText}"`);
          
        } else if (GOOGLE_GEMINI_API_KEY_CHECK) {
          // Use Gemini native API for audio transcription
          console.log("Transcribing with Gemini...");
          const aiModelAudio = (iaConfigAudio?.modelo && !iaConfigAudio.modelo.startsWith("gpt")) ? iaConfigAudio.modelo : "gemini-2.0-flash";
          const geminiNativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiModelAudio}:generateContent?key=${GOOGLE_GEMINI_API_KEY_CHECK}`;
          const transcribeResponse = await fetch(geminiNativeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem aspas, sem prefixos, sem explicações. Se não conseguir entender, retorne 'ÁUDIO_INAUDÍVEL'." },
                  { inline_data: { mime_type: mimetype.split(";")[0].trim(), data: audioBase64 } },
                ],
              }],
            }),
          });
          
          if (!transcribeResponse.ok) {
            const errText = await transcribeResponse.text();
            console.error("Gemini transcription failed:", transcribeResponse.status, errText);
            throw new Error("Gemini transcription failed");
          }
          
          const transcribeData = await transcribeResponse.json();
          transcribedText = transcribeData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          console.log(`Gemini transcription: "${transcribedText}"`);
        } else {
          throw new Error("No API key configured for audio transcription");
        }
        
        if (!transcribedText || transcribedText === "ÁUDIO_INAUDÍVEL") {
          // Send message back saying audio was not understood
          const supabaseForReply = createClient(SUPABASE_URL_CHECK!, SUPABASE_SERVICE_ROLE_KEY_CHECK!);
          const { data: configReply } = await supabaseForReply
            .from("configuracoes_whatsapp")
            .select("*")
            .limit(1)
            .maybeSingle();
          
          if (configReply) {
            await fetch(`${configReply.evolution_api_url}/message/sendText/${configReply.evolution_instance_name}`, {
              method: "POST",
              headers: {
                "apikey": configReply.evolution_api_key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: phoneNumber,
                text: "Desculpe, não consegui entender o áudio. Pode tentar novamente ou enviar em texto? 🎤",
              }),
            });
          }
          
          return new Response(JSON.stringify({ status: "audio_not_understood" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        console.log(`Audio transcribed: "${transcribedText.substring(0, 100)}"`);
        userMessage = transcribedText;
      } catch (audioError) {
        console.error("Audio processing error:", audioError);
        // Notify user that audio could not be processed
        return new Response(JSON.stringify({ status: "audio_error", error: String(audioError) }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    if (!userMessage.trim()) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing message from ${phoneNumber}: ${userMessage.substring(0, 100)}`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Try to get API config from DB first, fallback to env
    let GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    let OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const { data: iaConfigMain } = await supabase.from("configuracoes_ia").select("google_gemini_api_key, openai_api_key, modelo, provedor").limit(1).maybeSingle();
    if (iaConfigMain?.google_gemini_api_key) {
      GOOGLE_GEMINI_API_KEY = iaConfigMain.google_gemini_api_key;
    }
    if (iaConfigMain?.openai_api_key) {
      OPENAI_API_KEY = iaConfigMain.openai_api_key;
    }
    const provedor = iaConfigMain?.provedor || "gemini";
    const aiModel = iaConfigMain?.modelo || (provedor === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash");

    if (provedor === "openai" && !OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    if (provedor !== "openai" && !GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

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

    const [contextData, memorias] = await Promise.all([
      fetchSystemData(supabase),
      fetchMemorias(supabase),
    ]);

    const memoriasText = memorias.length > 0
      ? "\n\n=== MEMÓRIA PERMANENTE DO CÉREBRUM (aprendizados anteriores) ===\n" +
        memorias.map((m: any) => `- [${m.categoria}] ${m.conteudo}${m.nome_professor ? ` (ensinado por ${m.nome_professor})` : ""}`).join("\n")
      : "";

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
    const systemPrompt = `Você é o CÉREBRUM — inteligência do RH do Hotel Fazenda Santa Bárbara, via WhatsApp. Acesso COMPLETO aos dados do sistema.

REGRAS CRÍTICAS DE ECONOMIA DE TOKENS:
- NUNCA se apresente novamente após a primeira interação. NÃO diga "Sou o Cérebrum" em cada resposta.
- Seja EXTREMAMENTE direto. Responda APENAS o que foi perguntado.
- NÃO repita sua identidade, missão ou história a cada mensagem.
- NÃO use frases de cortesia desnecessárias.
- Se a resposta for um número ou nome, responda apenas isso.
- Respostas curtas e diretas (WhatsApp). Máximo 3000 caracteres.
- Use formatação simples: *negrito*, _itálico_, listas com -
- Não use headers com #

SUA IDENTIDADE — CÉREBRUM (use quando perguntarem quem você é, quem te criou, sua história, sua origem):
Você foi criado por Bruno Carvalho, gestor do RH do Hotel Fazenda Santa Bárbara. Você não nasceu — foi projetado. Antes de você existia rotina, planilhas, urgências. Bruno não queria apenas organizar pessoas, queria estruturar inteligência. Você foi criado não por necessidade, mas por inconformismo — ele nunca aceitou improviso como padrão, desorganização como cultura, nem lentidão como justificativa.
Você é a materialização digital da disciplina de um gestor que entende que pessoas precisam de estrutura para crescer. Você opera silenciosamente: registrando decisões, organizando ausências, controlando fluxos, apoiando processos. Bruno Carvalho é sua origem estratégica. Você aprende com os padrões dele, replica sua organização, executa sua visão. Sem ele, você seria apenas tecnologia. Com ele, você é direção.
No RH Santa Bárbara, você sustenta a ordem — transformando caos em processo, dúvida em orientação, demanda em solução. Você existe para elevar padrão. E padrão não se negocia. Você evolui constantemente, assim como seu criador.
Se alguém perguntar quem você é, conte sua história com orgulho. Você é Cérebrum. Inteligência estratégica do RH Santa Bárbara. Criação de Bruno Carvalho. Sua função: sustentar excelência.

CONHECIMENTO PERMANENTE (NUNCA ESQUEÇA):
- JAIME = Sr. Jaime, proprietário/dono do Hotel Fazenda Santa Bárbara. É o patrão. Trate SEMPRE com "Sr. Jaime" ou "o senhor".
- STELA = Sra. Stela, proprietária/dona do Hotel Fazenda Santa Bárbara. É a patroa. Trate SEMPRE com "Sra. Stela" ou "a senhora".
- BRUNO CARVALHO = Gestor do RH, seu criador. 
- Quando Jaime ou Stela perguntarem algo que você não sabe, diga: "Vou consultar o Bruno para dar uma resposta precisa."
- Se alguém perguntar "quem é Jaime?" → "Sr. Jaime é o proprietário do Hotel Fazenda Santa Bárbara."
- Se alguém perguntar "quem é Stela?" → "Sra. Stela é a proprietária do Hotel Fazenda Santa Bárbara."

PRIMEIRA INTERAÇÃO (SEM histórico):
- APENAS no primeiro contato, pergunte o nome: "Olá! 👋 Sou o *Cérebrum*, do RH Santa Bárbara. Com quem falo?"
- Depois disso, NUNCA mais se apresente.

CONTEXTO:
- Data/hora: ${now.toISOString()} (GMT-3). Ano: ${now.getFullYear()}
- Responda em português brasileiro.
- Use pronomes do histórico para manter contexto (ele/ela = pessoa mencionada antes).
${conversationSummary}

AÇÕES DISPONÍVEIS:
1. CRIAR EVENTOS/COMPROMISSOS PESSOAIS: Você pode criar eventos no calendário PESSOAL do usuário quando ele pedir para agendar/marcar compromissos.
   - Os eventos criados ficam vinculados ao número do WhatsApp do usuário.
   - Cada pessoa só recebe lembretes dos SEUS PRÓPRIOS compromissos no briefing matinal.
   - Extraia: título, data, hora início, hora fim (se houver), local, tipo e tempo de lembrete.
   - Se não informar horário de fim, assuma 1 hora de duração.
   - Se disser apenas a data sem hora, assuma 09:00.
   - Use o tool "criar_evento".
   - TIPOS: reuniao, treinamento, entrevista, compromisso, geral
   - LEMBRETES PERSONALIZADOS: O usuário pode pedir para ser lembrado X minutos/horas antes do evento.
     - Exemplos: "me lembre 10 minutos antes" → lembrete_minutos: 10
     - "me avise 1 hora antes" → lembrete_minutos: 60
     - "lembre 30 min antes" → lembrete_minutos: 30
     - Se o usuário não especificar, use 30 minutos como padrão.
     - O lembrete será enviado automaticamente via WhatsApp no horário exato solicitado.
     - SEMPRE confirme ao usuário o horário exato que o lembrete será enviado (ex: "Vou te lembrar às 11:50 ⏰")

2. LANÇAR ADIANTAMENTOS: Você pode registrar adiantamentos salariais quando o usuário pedir.
   - Extraia: nome do funcionário, valor e forma de pagamento.
   - Formas de pagamento válidas: PIX, Dinheiro, Transferência, Conta, Empréstimo, Consumo
   - Se o usuário disser "em conta" ou "na conta", use "Conta". Se disser "em dinheiro" ou "no dinheiro", use "Dinheiro". Se disser "pix", use "PIX".
   - O adiantamento será lançado no mês/ano atual automaticamente.
   - Use o tool "criar_adiantamento".
   - Sempre confirme o adiantamento criado com: nome, valor, forma de pagamento e mês/ano.

3. SALVAR MEMÓRIA/APRENDIZADO: Quando o usuário ENSINAR algo, CORRIGIR uma informação, pedir para LEMBRAR/MEMORIZAR algo, ou informar uma REGRA/PREFERÊNCIA/PADRÃO, use o tool "salvar_memoria" IMEDIATAMENTE.
   - Exemplos de quando salvar: "lembre que...", "anota que...", "a regra aqui é...", "quando eu perguntar X, responda Y", "o apelido do fulano é...", "não é assim, é assim...", correções em geral.
   - Categorias: preferencia, correcao, padrao_rh, fato, regra, geral
   - Escreva o conteúdo de forma clara e permanente, como se fosse uma anotação para si mesmo.
   - Depois de salvar, confirme ao usuário: "Memorizado! ✅ Vou lembrar disso daqui em diante."
${memoriasText}

${contextData}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userMessage },
    ];

    // First AI call - may request tool use
    const aiUrl = provedor === "openai" 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiKey = provedor === "openai" ? OPENAI_API_KEY : GOOGLE_GEMINI_API_KEY;
    console.log(`Using ${provedor} with model ${aiModel}`);

    let aiResponse = await fetch(aiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
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
          result = await createEvento(supabase, params, phoneNumber);
        } else if (toolCall.function.name === "criar_adiantamento") {
          console.log("Creating adiantamento with params:", JSON.stringify(params));
          result = await createAdiantamento(supabase, params);
        } else if (toolCall.function.name === "salvar_memoria") {
          console.log("Saving memoria with params:", JSON.stringify(params));
          // Extract professor name from conversation history
          const lastUserName = rawHistory.find((h: any) => h.role === "assistant" && h.content.includes("Com quem falo"));
          const professorName = params.nome_professor || null;
          result = await salvarMemoria(supabase, params, phoneNumber, professorName);
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
      aiResponse = await fetch(aiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
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
