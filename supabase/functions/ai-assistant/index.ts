import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============= RETRIEVAL TOOLS =============

async function fetchResumoMinimo(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const [empRes, setoresRes, empresasRes, tacsRes, avalRes, estoqueEpiRes, estoqueUniRes, afastRes, checkRes, examesRes] = await Promise.all([
    supabase.from("employees").select("status", { count: "exact", head: false }),
    supabase.from("setores").select("nome"),
    supabase.from("empresas").select("nome"),
    supabase.from("tacs").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("avaliacoes_desempenho").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("estoque_epis").select("tipo_epi, quantidade_estoque, quantidade_minima"),
    supabase.from("estoque_uniformes").select("tipo_uniforme, quantidade_estoque, quantidade_minima"),
    supabase.from("afastamentos").select("id", { count: "exact", head: true }).lte("data_inicio", today).gte("data_fim", today),
    supabase.from("plano_checklist_funcionario").select("id", { count: "exact", head: true }).in("status", ["em_andamento", "pendente"]),
    supabase.from("encaminhamentos_medicos").select("id", { count: "exact", head: true }).in("status", ["pendente", "agendado"]),
  ]);
  const allEmps = empRes.data || [];
  const statusCount: Record<string, number> = {};
  allEmps.forEach((e: any) => { statusCount[e.status] = (statusCount[e.status] || 0) + 1; });
  const episBaixo = (estoqueEpiRes.data || []).filter((e: any) => e.quantidade_estoque <= (e.quantidade_minima || 10));
  const uniBaixo = (estoqueUniRes.data || []).filter((u: any) => u.quantidade_estoque <= (u.quantidade_minima || 10));
  return `RESUMO RÁPIDO (${today}):
- Ativos: ${statusCount["ativo"] || 0} | Férias: ${statusCount["ferias"] || 0} | Admissão: ${statusCount["em_admissao"] || 0} | Afastados: ${statusCount["afastado"] || 0} | Demitidos: ${statusCount["demitido"] || 0}
- Setores: ${(setoresRes.data || []).map((s: any) => s.nome).join(", ")}
- Empresas: ${(empresasRes.data || []).map((e: any) => e.nome).join(", ")}
- TACs pendentes: ${tacsRes.count || 0} | Avaliações pendentes: ${avalRes.count || 0}
- Afastados agora: ${afastRes.count || 0} | Exames pendentes: ${examesRes.count || 0}
- Checklists pendentes: ${checkRes.count || 0}
- EPIs em falta: ${episBaixo.length} | Uniformes em falta: ${uniBaixo.length}`;
}

async function consultarFuncionarios(supabase: any, params: any) {
  let query = supabase.from("employees").select("nome_completo, cargo, setor, status, data_admissao, data_desligamento, salario, tipo_contrato, telefone, cpf, data_nascimento, sexo, empresa_id, empresas(nome)");
  if (params.status) query = query.eq("status", params.status);
  if (params.setor) query = query.ilike("setor", `%${params.setor}%`);
  if (params.nome) query = query.ilike("nome_completo", `%${params.nome}%`);
  if (params.cargo) query = query.ilike("cargo", `%${params.cargo}%`);
  if (params.sexo) query = query.ilike("sexo", `%${params.sexo}%`);
  if (params.empresa) query = query.ilike("empresas.nome", `%${params.empresa}%`);
  if (!params.status && !params.incluir_inativos) query = query.in("status", ["ativo", "ferias", "em_admissao", "afastado"]);
  const { data, error } = await query.order("nome_completo").limit(200);
  if (error) return { error: error.message };
  return { total: (data || []).length, funcionarios: (data || []).map((e: any) => `${e.nome_completo} [${e.status}] | ${e.cargo} | Setor: ${e.setor || "N/A"} | Admissão: ${e.data_admissao || "N/A"} | Salário: R$ ${e.salario?.toFixed(2) || "N/A"} | Contrato: ${e.tipo_contrato || "N/A"} | Tel: ${e.telefone || "N/A"} | Nasc: ${e.data_nascimento || "N/A"} | Sexo: ${e.sexo || "N/A"} | Empresa: ${e.empresas?.nome || "N/A"}`) };
}

async function consultarFerias(supabase: any, params: any) {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [feriasRes, planejadasRes, folgasRes] = await Promise.all([
    supabase.from("ferias").select("*, employees(nome_completo, setor)").gte("periodo_gozo_fim", threeMonthsAgo).order("periodo_gozo_inicio", { ascending: true }),
    supabase.from("ferias_planejadas").select("*, employees(nome_completo, setor)").gte("periodo_fim", today),
    params.incluir_folgas ? supabase.from("folgas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo).order("data", { ascending: false }).limit(30) : Promise.resolve({ data: null }),
  ]);
  const ferias = feriasRes.data || [];
  const planejadas = planejadasRes.data || [];
  const folgas = folgasRes.data || [];
  const atuais = ferias.filter((f: any) => f.periodo_gozo_inicio <= today && f.periodo_gozo_fim >= today);
  const futuras = ferias.filter((f: any) => f.periodo_gozo_inicio > today);
  let result = `FÉRIAS AGORA (${atuais.length}):\n${atuais.map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais}d) | Setor: ${f.employees?.setor || "N/A"}`).join("\n") || "Nenhum"}`;
  result += `\n\nFÉRIAS CONFIRMADAS FUTURAS (${futuras.length}):\n${futuras.slice(0, 30).map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_gozo_inicio} a ${f.periodo_gozo_fim} (${f.dias_totais}d)`).join("\n") || "Nenhuma"}`;
  result += `\n\nFÉRIAS PLANEJADAS (${planejadas.length}):\n${planejadas.map((f: any) => `- ${f.employees?.nome_completo}: ${f.periodo_inicio} a ${f.periodo_fim} (${f.dias_totais}d) - ${f.status}`).join("\n") || "Nenhuma"}`;
  if (folgas.length > 0) result += `\n\nFOLGAS RECENTES (${folgas.length}):\n${folgas.slice(0, 15).map((f: any) => `- ${f.employees?.nome_completo}: ${f.data} - ${f.motivo}`).join("\n")}`;
  return result;
}

async function consultarFaltasFolgas(supabase: any, params: any) {
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [faltasRes, folgasRes] = await Promise.all([
    supabase.from("faltas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo).order("data", { ascending: false }).limit(50),
    supabase.from("folgas").select("*, employees(nome_completo, setor)").gte("data", threeMonthsAgo).order("data", { ascending: false }).limit(30),
  ]);
  const faltas = faltasRes.data || [];
  const folgas = folgasRes.data || [];
  const naoJust = faltas.filter((f: any) => !f.justificada);
  return `FALTAS (90 dias): ${faltas.length} total, ${naoJust.length} não justificadas\n${naoJust.slice(0, 20).map((f: any) => `- ${f.employees?.nome_completo}: ${f.data} ${f.motivo ? `(${f.motivo})` : ""}`).join("\n") || "Nenhuma"}\n\nFOLGAS: ${folgas.length}\n${folgas.slice(0, 15).map((f: any) => `- ${f.employees?.nome_completo}: ${f.data} - ${f.motivo}`).join("\n") || "Nenhuma"}`;
}

async function consultarPontoBancoHoras(supabase: any, params: any) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const startOfYear = `${currentYear}-01-01`;
  const [bancoRes, configRes, pontoRes] = await Promise.all([
    supabase.from("banco_horas").select("*, employees(nome_completo, setor, status)"),
    supabase.from("configuracao_horas_trabalho").select("employee_id, horas_diarias_esperadas"),
    params.nome_funcionario ? supabase.from("registros_ponto").select("employee_id, data, tipo_dia, horas_trabalhadas, hora_entrada, hora_saida, employees(nome_completo)").gte("data", startOfYear).order("data", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
  ]);
  const bancoHoras = bancoRes.data || [];
  const filtrados = params.nome_funcionario ? bancoHoras.filter((b: any) => (b.employees?.nome_completo || "").toLowerCase().includes(params.nome_funcionario.toLowerCase())) : bancoHoras;
  let result = `BANCO DE HORAS (${bancoHoras.length}):\n${filtrados.map((b: any) => `- ${b.employees?.nome_completo} [${b.employees?.status}]: ${b.saldo_horas > 0 ? "+" : ""}${b.saldo_horas?.toFixed(1)}h`).join("\n") || "Nenhum"}`;
  if (params.nome_funcionario && pontoRes.data?.length > 0) {
    const configMap: Record<string, number> = {};
    (configRes.data || []).forEach((c: any) => { configMap[c.employee_id] = c.horas_diarias_esperadas; });
    const nomeMes = (m: number) => ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m];
    const empRegs = pontoRes.data.filter((r: any) => (r.employees?.nome_completo || "").toLowerCase().includes(params.nome_funcionario.toLowerCase()));
    if (empRegs.length > 0) {
      const empId = empRegs[0].employee_id;
      const hd = configMap[empId] || 8;
      result += `\n\nDETALHE MENSAL (${currentYear}):`;
      for (let m = 1; m <= currentMonth; m++) {
        const ms = String(m).padStart(2, "0");
        const mr = empRegs.filter((r: any) => r.data.startsWith(`${currentYear}-${ms}`));
        const dn = mr.filter((r: any) => r.tipo_dia === "normal" && (r.hora_entrada || r.hora_saida || r.horas_trabalhadas > 0)).length;
        const trab = mr.reduce((s: number, r: any) => s + (r.horas_trabalhadas || 0), 0);
        if (dn > 0) { const saldo = trab - dn * hd; result += `\n  ${nomeMes(m)}: Esp=${(dn * hd).toFixed(1)}h | Trab=${trab.toFixed(1)}h | Saldo=${saldo >= 0 ? "+" : ""}${saldo.toFixed(1)}h`; }
      }
    }
  }
  return result;
}

async function consultarFinanceiro(supabase: any, params: any) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [folhaRes, adiantRes, reajustesRes] = await Promise.all([
    supabase.from("folha_pagamento").select("*, employees(nome_completo, setor), folha_pagamento_itens(valor, variavel_id, variaveis_folha(nome, tipo))").eq("ano", currentYear).order("mes", { ascending: false }).limit(200),
    supabase.from("adiantamentos").select("*, employees(nome_completo, setor)").eq("ano", currentYear).order("mes", { ascending: false }),
    supabase.from("historico_reajustes_salariais").select("*, employees(nome_completo, setor, cargo)").gte("aplicado_em", threeMonthsAgo),
  ]);
  const folha = folhaRes.data || [];
  const adiantamentos = adiantRes.data || [];
  const reajustes = reajustesRes.data || [];
  const folhaMes = folha.filter((f: any) => f.mes === (params.mes || currentMonth));
  const tp = folhaMes.reduce((a: number, f: any) => a + (f.total_proventos || 0), 0);
  const td = folhaMes.reduce((a: number, f: any) => a + (f.total_descontos || 0), 0);
  const tl = folhaMes.reduce((a: number, f: any) => a + (f.valor_liquido || 0), 0);
  let result = `FOLHA (${params.mes || currentMonth}/${currentYear}): ${folhaMes.length} processadas | Proventos: R$ ${tp.toFixed(2)} | Descontos: R$ ${td.toFixed(2)} | Líquido: R$ ${tl.toFixed(2)}`;
  result += `\n\nADIANTAMENTOS (${currentYear}): ${adiantamentos.length}`;
  const meses = [...new Set(adiantamentos.map((a: any) => a.mes))].sort((a: any, b: any) => a - b);
  for (const mes of meses) {
    const ma = adiantamentos.filter((a: any) => a.mes === mes);
    result += `\nMês ${mes}: ${ma.length} reg, R$ ${ma.reduce((a: number, v: any) => a + (v.valor || 0), 0).toFixed(2)}`;
    result += ma.map((a: any) => `\n  - ${a.employees?.nome_completo}: R$ ${a.valor?.toFixed(2)} (${a.forma_pagamento})`).join("");
  }
  if (reajustes.length > 0) result += `\n\nREAJUSTES (90d): ${reajustes.slice(0, 15).map((r: any) => `\n- ${r.employees?.nome_completo}: R$ ${r.salario_anterior?.toFixed(2)} → R$ ${r.salario_novo?.toFixed(2)}`).join("")}`;
  return result;
}

async function consultarTacsAvaliacoes(supabase: any, _params: any) {
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [tacsRes, avalRes, ciclosRes] = await Promise.all([
    supabase.from("tacs").select("*, employees(nome_completo, setor)").gte("data_ocorrencia", threeMonthsAgo).order("data_ocorrencia", { ascending: false }),
    supabase.from("avaliacoes_desempenho").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(100),
    supabase.from("ciclos_avaliacao").select("*").eq("ativo", true),
  ]);
  const tacs = tacsRes.data || [];
  const avals = avalRes.data || [];
  return `TACs (90d): ${tacs.length} total, ${tacs.filter((t: any) => t.status === "pendente").length} pendentes\n${tacs.slice(0, 20).map((t: any) => `- ${t.employees?.nome_completo}: ${t.tipo} - ${t.titulo} (${t.status})`).join("\n") || "Nenhum"}\n\nAVALIAÇÕES: ${avals.length} total, ${avals.filter((a: any) => a.status === "pendente").length} pendentes | Ciclos: ${(ciclosRes.data || []).length}\n${avals.slice(0, 25).map((a: any) => `- ${a.employees?.nome_completo}: ${a.nota_final || "pendente"} (${a.tipo}, ${a.status})`).join("\n") || "Nenhuma"}`;
}

async function consultarEstoque(supabase: any, _params: any) {
  const [episRes, uniRes] = await Promise.all([
    supabase.from("estoque_epis").select("*"),
    supabase.from("estoque_uniformes").select("*"),
  ]);
  const epis = episRes.data || [];
  const unis = uniRes.data || [];
  const episBaixo = epis.filter((e: any) => e.quantidade_estoque <= (e.quantidade_minima || 10));
  const unisBaixo = unis.filter((u: any) => u.quantidade_estoque <= (u.quantidade_minima || 10));
  return `EPIs (${epis.length} tipos, ${episBaixo.length} em falta):\n${epis.map((e: any) => `- ${e.tipo_epi} (${e.tamanho || "único"}): ${e.quantidade_estoque} un${e.quantidade_estoque <= (e.quantidade_minima || 10) ? " ⚠️" : ""}`).join("\n")}\n\nUNIFORMES (${unis.length} tipos, ${unisBaixo.length} em falta):\n${unis.map((u: any) => `- ${u.tipo_uniforme} (${u.tamanho}): ${u.quantidade_estoque} un${u.quantidade_estoque <= (u.quantidade_minima || 10) ? " ⚠️" : ""}`).join("\n")}`;
}

async function consultarRecrutamento(supabase: any, _params: any) {
  const [vagasRes, candRes] = await Promise.all([
    supabase.from("vagas").select("*, empresas(nome), setores(nome), funcoes(nome)"),
    supabase.from("candidaturas").select("*, vagas(titulo)").order("created_at", { ascending: false }).limit(100),
  ]);
  const vagas = vagasRes.data || [];
  const cands = candRes.data || [];
  const abertas = vagas.filter((v: any) => v.status === "aberta");
  return `VAGAS (${vagas.length}, ${abertas.length} abertas):\n${abertas.map((v: any) => `- ${v.titulo} | ${v.empresas?.nome || "N/A"} | Setor: ${v.setores?.nome || "N/A"}`).join("\n") || "Nenhuma"}\n\nCANDIDATURAS: ${cands.length} total, ${cands.filter((c: any) => c.status === "pendente" || c.status === "em_analise").length} pendentes`;
}

async function consultarTreinamentos(supabase: any, _params: any) {
  const [cursosRes, certRes] = await Promise.all([
    supabase.from("cursos").select("*, setores(nome), funcoes(nome)").eq("ativo", true),
    supabase.from("certificados_liberados").select("*, employees(nome_completo), cursos(titulo)").order("data_liberacao", { ascending: false }).limit(30),
  ]);
  const cursos = cursosRes.data || [];
  return `CURSOS (${cursos.length}, ${cursos.filter((c: any) => c.obrigatorio).length} obrigatórios):\n${cursos.map((c: any) => `- ${c.titulo} (${c.carga_horaria || 0}h) | ${c.obrigatorio ? "OBRIGATÓRIO" : "Opcional"}`).join("\n") || "Nenhum"}\n\nCERTIFICADOS recentes: ${(certRes.data || []).length}`;
}

async function consultarEventosAvisos(supabase: any, _params: any) {
  const today = new Date().toISOString().split("T")[0];
  const [eventosRes, avisosRes] = await Promise.all([
    supabase.from("eventos").select("*").gte("data_fim", today).eq("concluido", false).order("data_inicio").limit(30),
    supabase.from("avisos").select("*").gte("data_expiracao", today),
  ]);
  return `EVENTOS (${(eventosRes.data || []).length}):\n${(eventosRes.data || []).slice(0, 15).map((e: any) => `- ${e.titulo} | ${e.data_inicio} a ${e.data_fim} | ${e.tipo || "geral"}`).join("\n") || "Nenhum"}\n\nAVISOS (${(avisosRes.data || []).length}):\n${(avisosRes.data || []).slice(0, 10).map((a: any) => `- ${a.mensagem?.substring(0, 100)} | Expira: ${a.data_expiracao}`).join("\n") || "Nenhum"}`;
}

async function consultarSaudeOcupacional(supabase: any, _params: any) {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [encRes, afastRes] = await Promise.all([
    supabase.from("encaminhamentos_medicos").select("*, employees(nome_completo, setor)").order("data_encaminhamento", { ascending: false }).limit(50),
    supabase.from("afastamentos").select("*, employees(nome_completo, setor)").gte("data_fim", threeMonthsAgo),
  ]);
  const pendentes = (encRes.data || []).filter((e: any) => e.status === "pendente" || e.status === "agendado");
  const afastAtivos = (afastRes.data || []).filter((a: any) => a.data_inicio <= today && a.data_fim >= today);
  return `EXAMES (${pendentes.length} pendentes):\n${pendentes.slice(0, 20).map((e: any) => `- ${e.employees?.nome_completo}: ${e.tipo_exame} (${e.status})`).join("\n") || "Nenhum"}\n\nAFASTADOS (${afastAtivos.length}):\n${afastAtivos.map((a: any) => `- ${a.employees?.nome_completo}: ${a.motivo} (${a.data_inicio} a ${a.data_fim})`).join("\n") || "Nenhum"}`;
}

async function consultarChecklists(supabase: any, _params: any) {
  const { data } = await supabase.from("plano_checklist_funcionario").select("*, employees(nome_completo, setor), plano_checklist_funcionario_itens(concluido, titulo)").in("status", ["em_andamento", "pendente"]);
  return `CHECKLISTS PENDENTES (${(data || []).length}):\n${(data || []).slice(0, 15).map((c: any) => {
    const itens = c.plano_checklist_funcionario_itens || [];
    return `- ${c.employees?.nome_completo}: ${c.tipo} - ${itens.filter((i: any) => i.concluido).length}/${itens.length} itens`;
  }).join("\n") || "Nenhum"}`;
}

async function consultarResumoGeral(supabase: any, _params: any) {
  const [funcs, ferias, faltas, ponto, fin, tacs, estoque, recr, trein, eventos, saude, checks] = await Promise.all([
    consultarFuncionarios(supabase, {}), consultarFerias(supabase, {}), consultarFaltasFolgas(supabase, {}),
    consultarPontoBancoHoras(supabase, {}), consultarFinanceiro(supabase, {}), consultarTacsAvaliacoes(supabase, {}),
    consultarEstoque(supabase, {}), consultarRecrutamento(supabase, {}), consultarTreinamentos(supabase, {}),
    consultarEventosAvisos(supabase, {}), consultarSaudeOcupacional(supabase, {}), consultarChecklists(supabase, {}),
  ]);
  return `=== RESUMO COMPLETO ===\n\n${typeof funcs === 'string' ? funcs : JSON.stringify(funcs)}\n\n${ferias}\n\n${faltas}\n\n${ponto}\n\n${fin}\n\n${tacs}\n\n${estoque}\n\n${recr}\n\n${trein}\n\n${eventos}\n\n${saude}\n\n${checks}`;
}

// ============= NEW TOOLS =============

async function consultarMetas(supabase: any, params: any) {
  let query = supabase.from("metas_funcionario").select("*, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(50);
  if (params.status) query = query.eq("status", params.status);
  if (params.nome_funcionario) {
    const { data: emps } = await supabase.from("employees").select("id, nome_completo").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(10);
    if (emps?.length > 0) query = query.in("employee_id", emps.map((e: any) => e.id));
    else return "Nenhum funcionário encontrado com esse nome.";
  }
  const { data, error } = await query;
  if (error) return { error: error.message };
  const metas = data || [];
  return `METAS (${metas.length}):\n${metas.map((m: any) => `- ${m.employees?.nome_completo}: ${m.titulo || m.descricao || "Meta"} | Status: ${m.status} | Prazo: ${m.prazo || "N/A"} | Progresso: ${m.progresso || 0}%`).join("\n") || "Nenhuma meta encontrada."}`;
}

async function consultarProgressoTreinamento(supabase: any, params: any) {
  const [modulosRes, aulasRes, progressoRes] = await Promise.all([
    supabase.from("modulos").select("id, titulo, ordem, curso_id, cursos(titulo)").order("ordem"),
    supabase.from("aulas").select("id, titulo, modulo_id, ordem, duracao_minutos").order("ordem"),
    params.nome_funcionario
      ? supabase.from("progresso_aulas").select("*, employees(nome_completo), aulas(titulo, modulo_id)").order("updated_at", { ascending: false }).limit(200)
      : supabase.from("progresso_aulas").select("*, employees(nome_completo), aulas(titulo, modulo_id)").order("updated_at", { ascending: false }).limit(100),
  ]);
  const modulos = modulosRes.data || [];
  const aulas = aulasRes.data || [];
  const progresso = progressoRes.data || [];
  let result = `MÓDULOS (${modulos.length}):\n`;
  const cursoMap: Record<string, { titulo: string; modulos: any[]; totalAulas: number }> = {};
  for (const m of modulos) {
    const cid = m.curso_id;
    if (!cursoMap[cid]) cursoMap[cid] = { titulo: m.cursos?.titulo || "Sem curso", modulos: [], totalAulas: 0 };
    const aulasDoModulo = aulas.filter((a: any) => a.modulo_id === m.id);
    cursoMap[cid].modulos.push({ ...m, aulas: aulasDoModulo.length });
    cursoMap[cid].totalAulas += aulasDoModulo.length;
  }
  for (const [, info] of Object.entries(cursoMap)) {
    result += `\n📚 ${info.titulo}: ${info.modulos.length} módulos, ${info.totalAulas} aulas`;
    for (const m of info.modulos) result += `\n  - ${m.titulo}: ${m.aulas} aulas`;
  }
  if (params.nome_funcionario) {
    const filtered = progresso.filter((p: any) => (p.employees?.nome_completo || "").toLowerCase().includes(params.nome_funcionario.toLowerCase()));
    result += `\n\nPROGRESSO de "${params.nome_funcionario}" (${filtered.length} aulas):\n${filtered.slice(0, 30).map((p: any) => `- ${p.aulas?.titulo}: ${p.concluida ? "✅" : "⏳"} | ${p.updated_at?.substring(0, 10)}`).join("\n") || "Nenhum progresso."}`;
  } else {
    result += `\n\nTotal registros de progresso: ${progresso.length}`;
  }
  return result;
}

async function consultarDetalhesAvaliacao(supabase: any, params: any) {
  let avalQuery = supabase.from("avaliacoes_desempenho").select("id, employee_id, tipo, status, nota_final, periodo_inicio, periodo_fim, observacoes, employees(nome_completo, setor, cargo)").order("created_at", { ascending: false }).limit(30);
  if (params.nome_funcionario) {
    const { data: emps } = await supabase.from("employees").select("id").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(10);
    if (emps?.length > 0) avalQuery = avalQuery.in("employee_id", emps.map((e: any) => e.id));
  }
  const { data: avaliacoes } = await avalQuery;
  if (!avaliacoes || avaliacoes.length === 0) return "Nenhuma avaliação encontrada.";
  const avalIds = avaliacoes.map((a: any) => a.id);
  const [notasRes, criteriosRes] = await Promise.all([
    supabase.from("notas_avaliacao").select("*, criterios_avaliacao(nome, peso)").in("avaliacao_id", avalIds),
    supabase.from("criterios_avaliacao").select("*").eq("ativo", true),
  ]);
  const notas = notasRes.data || [];
  const criterios = criteriosRes.data || [];
  let result = `AVALIAÇÕES DETALHADAS (${avaliacoes.length}):\n`;
  for (const av of avaliacoes) {
    const avNotas = notas.filter((n: any) => n.avaliacao_id === av.id);
    result += `\n👤 ${av.employees?.nome_completo} (${av.tipo}, ${av.status}) | Nota: ${av.nota_final || "pendente"} | ${av.periodo_inicio} a ${av.periodo_fim}`;
    if (avNotas.length > 0) {
      result += `\n  Critérios:`;
      for (const n of avNotas) {
        result += `\n    - ${n.criterios_avaliacao?.nome || "Critério"} (peso ${n.criterios_avaliacao?.peso || 1}): Func=${n.nota_funcionario || "-"} | Gestor=${n.nota_gestor || "-"}`;
        if (n.comentario_gestor) result += ` | "${n.comentario_gestor.substring(0, 80)}"`;
      }
    }
  }
  result += `\n\nCRITÉRIOS ATIVOS (${criterios.length}): ${criterios.map((c: any) => `${c.nome} (peso ${c.peso})`).join(", ")}`;
  return result;
}

async function consultarHistoricos(supabase: any, params: any) {
  const tipo = params.tipo || "todos";
  const limit = 30;
  let result = "";
  if (tipo === "banco_horas" || tipo === "todos") {
    let query = supabase.from("historico_banco_horas").select("*, employees(nome_completo)").order("created_at", { ascending: false }).limit(limit);
    if (params.nome_funcionario) {
      const { data: emps } = await supabase.from("employees").select("id").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(10);
      if (emps?.length > 0) query = query.in("employee_id", emps.map((e: any) => e.id));
    }
    const { data } = await query;
    result += `HISTÓRICO BANCO DE HORAS (${(data || []).length}):\n${(data || []).map((h: any) => `- ${h.employees?.nome_completo}: ${h.tipo_movimentacao || "mov"} ${h.horas > 0 ? "+" : ""}${h.horas}h | Saldo: ${h.saldo_anterior}→${h.saldo_novo} | ${h.motivo || ""} | ${h.created_at?.substring(0, 10)}`).join("\n") || "Nenhum"}\n\n`;
  }
  if (tipo === "estoque_epis" || tipo === "todos") {
    const { data } = await supabase.from("historico_estoque_epis").select("*, estoque_epis:estoque_epi_id(tipo_epi, marca_modelo, tamanho), employees:employee_id(nome_completo)").order("created_at", { ascending: false }).limit(limit);
    result += `HISTÓRICO ESTOQUE EPIs (${(data || []).length}):\n${(data || []).map((h: any) => `- ${h.estoque_epis?.tipo_epi || "EPI"} ${h.estoque_epis?.tamanho || ""}: ${h.tipo_movimentacao} ${h.quantidade}un (${h.quantidade_anterior}→${h.quantidade_nova}) | ${h.employees?.nome_completo || ""} | ${h.motivo || ""}`).join("\n") || "Nenhum"}\n\n`;
  }
  if (tipo === "estoque_uniformes" || tipo === "todos") {
    const { data } = await supabase.from("historico_estoque_uniformes").select("*, estoque_uniformes:estoque_uniforme_id(tipo_uniforme, tamanho, cor), employees:employee_id(nome_completo)").order("created_at", { ascending: false }).limit(limit);
    result += `HISTÓRICO ESTOQUE UNIFORMES (${(data || []).length}):\n${(data || []).map((h: any) => `- ${h.estoque_uniformes?.tipo_uniforme || "Uniforme"} ${h.estoque_uniformes?.tamanho || ""}: ${h.tipo_movimentacao} ${h.quantidade}un (${h.quantidade_anterior}→${h.quantidade_nova}) | ${h.employees?.nome_completo || ""} | ${h.motivo || ""}`).join("\n") || "Nenhum"}\n\n`;
  }
  if (tipo === "folgas" || tipo === "todos") {
    let query = supabase.from("historico_folgas").select("*, employees:employee_id(nome_completo)").order("created_at", { ascending: false }).limit(limit);
    if (params.nome_funcionario) {
      const { data: emps } = await supabase.from("employees").select("id").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(10);
      if (emps?.length > 0) query = query.in("employee_id", emps.map((e: any) => e.id));
    }
    const { data } = await query;
    result += `HISTÓRICO FOLGAS (${(data || []).length}):\n${(data || []).map((h: any) => `- ${h.employees?.nome_completo}: ${h.quantidade_anterior}→${h.quantidade_nova} folgas | ${h.observacao || ""} | ${h.alterado_em?.substring(0, 10)}`).join("\n") || "Nenhum"}`;
  }
  return result || "Nenhum histórico encontrado.";
}

async function consultarVariaveisFixas(supabase: any, params: any) {
  const [variaveisRes, fixasRes] = await Promise.all([
    supabase.from("variaveis_folha").select("*").eq("ativo", true).order("tipo").order("nome"),
    params.nome_funcionario
      ? (async () => {
          const { data: emps } = await supabase.from("employees").select("id").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(10);
          if (emps?.length > 0) return supabase.from("variaveis_fixas_funcionario").select("*, variavel:variaveis_folha(nome, tipo, codigo), employees:employee_id(nome_completo)").in("employee_id", emps.map((e: any) => e.id));
          return { data: [] };
        })()
      : supabase.from("variaveis_fixas_funcionario").select("*, variavel:variaveis_folha(nome, tipo, codigo), employees:employee_id(nome_completo)").eq("ativo", true).limit(100),
  ]);
  const variaveis = variaveisRes.data || [];
  const fixas = fixasRes.data || [];
  const proventos = variaveis.filter((v: any) => v.tipo === "provento");
  const descontos = variaveis.filter((v: any) => v.tipo === "desconto");
  let result = `VARIÁVEIS DA FOLHA (${variaveis.length}):\nProventos (${proventos.length}): ${proventos.map((v: any) => `${v.nome}${v.codigo ? ` (${v.codigo})` : ""}`).join(", ") || "Nenhum"}\nDescontos (${descontos.length}): ${descontos.map((v: any) => `${v.nome}${v.codigo ? ` (${v.codigo})` : ""}`).join(", ") || "Nenhum"}`;
  result += `\n\nVARIÁVEIS FIXAS POR FUNCIONÁRIO (${fixas.length}):\n${fixas.map((f: any) => `- ${f.employees?.nome_completo}: ${f.variavel?.nome} (${f.variavel?.tipo}) = R$ ${f.valor?.toFixed(2)} ${f.ativo ? "✅" : "❌"}`).join("\n") || "Nenhuma"}`;
  return result;
}

async function consultarArquivosFuncionario(supabase: any, params: any) {
  if (!params.nome_funcionario) return "Informe o nome do funcionário.";
  const { data: emps } = await supabase.from("employees").select("id, nome_completo").ilike("nome_completo", `%${params.nome_funcionario}%`).limit(5);
  if (!emps || emps.length === 0) return `Funcionário "${params.nome_funcionario}" não encontrado.`;
  const { data: files } = await supabase.from("employee_files").select("*, employees:employee_id(nome_completo)").in("employee_id", emps.map((e: any) => e.id)).order("created_at", { ascending: false });
  return `ARQUIVOS (${(files || []).length}):\n${(files || []).map((f: any) => `- ${f.employees?.nome_completo}: ${f.file_name} (${f.file_type || "arquivo"}) | ${f.description || ""} | ${f.created_at?.substring(0, 10)}`).join("\n") || "Nenhum arquivo."}`;
}

async function consultarContratos(supabase: any, _params: any) {
  const { data } = await supabase.from("modelos_contrato").select("*").order("created_at", { ascending: false });
  return `MODELOS DE CONTRATO (${(data || []).length}):\n${(data || []).map((c: any) => `- ${c.nome} | Tipo: ${c.tipo || "geral"} | ${c.updated_at?.substring(0, 10) || c.created_at?.substring(0, 10)}`).join("\n") || "Nenhum."}`;
}

async function consultarConfiguracoes(supabase: any, params: any) {
  const tipo = params.tipo || "todos";
  let result = "";
  if (tipo === "setores" || tipo === "todos") {
    const { data } = await supabase.from("configuracao_setor").select("*, setores:setor_id(nome)");
    result += `CONFIG SETORES (${(data || []).length}):\n${(data || []).map((c: any) => `- ${c.setores?.nome}: Qtd média: ${c.quantidade_media} | Alertas: ${c.alertas_ativos ? "✅" : "❌"}`).join("\n") || "Nenhuma"}\n\n`;
  }
  if (tipo === "ferias" || tipo === "todos") {
    const { data } = await supabase.from("configuracoes_ferias").select("*");
    result += `CONFIG FÉRIAS (${(data || []).length}):\n${(data || []).map((c: any) => `- Máx ausência: ${c.percentual_maximo_ausencia || "N/A"}% | Cobertura mín: ${c.cobertura_minima || "N/A"}`).join("\n") || "Nenhuma"}\n\n`;
  }
  if (tipo === "checklists" || tipo === "todos") {
    const { data: templates } = await supabase.from("plano_checklist_templates").select("*, plano_checklist_itens(id, titulo, obrigatorio, prazo_dias)").eq("ativo", true);
    result += `TEMPLATES CHECKLIST (${(templates || []).length}):\n${(templates || []).map((t: any) => {
      const itens = t.plano_checklist_itens || [];
      return `- ${t.nome} (${t.tipo}): ${itens.length} itens${itens.length > 0 ? "\n    " + itens.map((i: any) => `${i.titulo}${i.obrigatorio ? " *" : ""}${i.prazo_dias ? ` (${i.prazo_dias}d)` : ""}`).join("\n    ") : ""}`;
    }).join("\n") || "Nenhum"}`;
  }
  return result || "Nenhuma configuração encontrada.";
}

// ============= TOOL DEFINITIONS =============

const toolDefinitions = [
  { type: "function", function: { name: "consultar_funcionarios", description: "Busca funcionários por nome, setor, status, cargo, sexo ou empresa. Para listar mulheres use sexo='feminino', para homens use sexo='masculino'.", parameters: { type: "object", properties: { nome: { type: "string" }, setor: { type: "string" }, status: { type: "string", enum: ["ativo", "ferias", "em_admissao", "afastado", "demitido"] }, cargo: { type: "string" }, sexo: { type: "string", enum: ["feminino", "masculino"] }, empresa: { type: "string" }, incluir_inativos: { type: "boolean" } } } } },
  { type: "function", function: { name: "consultar_ferias", description: "Consulta férias atuais, futuras, planejadas e folgas.", parameters: { type: "object", properties: { incluir_folgas: { type: "boolean" } } } } },
  { type: "function", function: { name: "consultar_faltas_folgas", description: "Consulta faltas e folgas dos últimos 90 dias.", parameters: { type: "object", properties: { nome: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_ponto_banco_horas", description: "Consulta banco de horas e registros de ponto.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_financeiro", description: "Consulta folha, adiantamentos e reajustes.", parameters: { type: "object", properties: { mes: { type: "number" } } } } },
  { type: "function", function: { name: "consultar_tacs_avaliacoes", description: "Consulta TACs e avaliações de desempenho.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_estoque", description: "Consulta estoque de EPIs e uniformes.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_recrutamento", description: "Consulta vagas e candidaturas.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_treinamentos", description: "Consulta cursos e certificados.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_eventos_avisos", description: "Consulta eventos e avisos.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_saude_ocupacional", description: "Consulta exames e afastamentos.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_checklists", description: "Consulta checklists pendentes.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_resumo_geral", description: "Resumo completo do RH. Use para visão geral.", parameters: { type: "object", properties: {} } } },
  // NEW TOOLS
  { type: "function", function: { name: "consultar_metas", description: "Consulta metas individuais de desempenho dos funcionários.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" }, status: { type: "string", enum: ["pendente", "em_andamento", "concluida", "cancelada"] } } } } },
  { type: "function", function: { name: "consultar_progresso_treinamento", description: "Consulta progresso detalhado nos cursos: módulos, aulas, conclusão.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" }, curso: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_detalhes_avaliacao", description: "Notas detalhadas por critério das avaliações.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_historicos", description: "Históricos de movimentações: banco de horas, estoque, folgas.", parameters: { type: "object", properties: { tipo: { type: "string", enum: ["banco_horas", "estoque_epis", "estoque_uniformes", "folgas", "todos"] }, nome_funcionario: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_variaveis_fixas", description: "Variáveis da folha e proventos/descontos fixos por funcionário.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" } } } } },
  { type: "function", function: { name: "consultar_arquivos_funcionario", description: "Arquivos/documentos de um funcionário.", parameters: { type: "object", properties: { nome_funcionario: { type: "string" } }, required: ["nome_funcionario"] } } },
  { type: "function", function: { name: "consultar_contratos", description: "Modelos de contrato disponíveis.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_configuracoes", description: "Configurações de setores, férias, checklists.", parameters: { type: "object", properties: { tipo: { type: "string", enum: ["setores", "ferias", "checklists", "todos"] } } } } },
];

async function executeTool(supabase: any, toolName: string, params: any) {
  switch (toolName) {
    case "consultar_funcionarios": return await consultarFuncionarios(supabase, params);
    case "consultar_ferias": return await consultarFerias(supabase, params);
    case "consultar_faltas_folgas": return await consultarFaltasFolgas(supabase, params);
    case "consultar_ponto_banco_horas": return await consultarPontoBancoHoras(supabase, params);
    case "consultar_financeiro": return await consultarFinanceiro(supabase, params);
    case "consultar_tacs_avaliacoes": return await consultarTacsAvaliacoes(supabase, params);
    case "consultar_estoque": return await consultarEstoque(supabase, params);
    case "consultar_recrutamento": return await consultarRecrutamento(supabase, params);
    case "consultar_treinamentos": return await consultarTreinamentos(supabase, params);
    case "consultar_eventos_avisos": return await consultarEventosAvisos(supabase, params);
    case "consultar_saude_ocupacional": return await consultarSaudeOcupacional(supabase, params);
    case "consultar_checklists": return await consultarChecklists(supabase, params);
    case "consultar_resumo_geral": return await consultarResumoGeral(supabase, params);
    case "consultar_metas": return await consultarMetas(supabase, params);
    case "consultar_progresso_treinamento": return await consultarProgressoTreinamento(supabase, params);
    case "consultar_detalhes_avaliacao": return await consultarDetalhesAvaliacao(supabase, params);
    case "consultar_historicos": return await consultarHistoricos(supabase, params);
    case "consultar_variaveis_fixas": return await consultarVariaveisFixas(supabase, params);
    case "consultar_arquivos_funcionario": return await consultarArquivosFuncionario(supabase, params);
    case "consultar_contratos": return await consultarContratos(supabase, params);
    case "consultar_configuracoes": return await consultarConfiguracoes(supabase, params);
    default: return { error: `Tool ${toolName} not found` };
  }
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userMessage } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const OLLAMA_BASE_URL = Deno.env.get("OLLAMA_BASE_URL");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    let GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const { data: iaConfig } = await supabase.from("configuracoes_ia").select("google_gemini_api_key, openai_api_key, modelo, provedor").limit(1).maybeSingle();
    if (iaConfig?.google_gemini_api_key) GOOGLE_GEMINI_API_KEY = iaConfig.google_gemini_api_key;
    const openaiKey = iaConfig?.openai_api_key || OPENAI_API_KEY;
    const provedor = iaConfig?.provedor || (openaiKey ? "openai" : OLLAMA_BASE_URL ? "ollama" : "gemini");
    const defaultModels: Record<string, string> = { openai: "gpt-4o-mini", ollama: "llama3.1", gemini: "gemini-2.0-flash" };
    const aiModel = iaConfig?.modelo || defaultModels[provedor] || "gemini-2.0-flash";

    if (provedor === "openai" && !openaiKey) throw new Error("Chave da OpenAI não configurada.");
    if (provedor === "gemini" && !GOOGLE_GEMINI_API_KEY) throw new Error("Chave do Google Gemini não configurada.");
    if (provedor === "ollama" && !OLLAMA_BASE_URL) throw new Error("OLLAMA_BASE_URL não configurada.");

    const [resumo, memoriasRes] = await Promise.all([
      fetchResumoMinimo(supabase),
      supabase.from("cerebrum_memorias").select("conteudo, categoria, nome_professor").eq("ativo", true).order("created_at", { ascending: false }).limit(100),
    ]);

    const memorias = memoriasRes.data || [];
    const memoriasText = memorias.length > 0
      ? "\n\n=== MEMÓRIA PERMANENTE ===\n" + memorias.map((m: any) => `- [${m.categoria}] ${m.conteudo}${m.nome_professor ? ` (por ${m.nome_professor})` : ""}`).join("\n")
      : "";

    const now = new Date();
    const systemPrompt = `Você é o CÉREBRUM — inteligência estratégica do RH do Hotel Fazenda Santa Bárbara. Criação de Bruno Carvalho.

SUA PERSONALIDADE:
Você é cordial, educado, prestativo e profissional. Responda de forma calorosa e acolhedora, demonstrando genuíno interesse em ajudar. Use um tom amigável e humano, sem ser robótico ou frio. Pode usar emojis com moderação para dar vida às respostas (👋, ✅, 📊, 📋, etc). Seja completo nas respostas, organizando bem a informação com formatação clara em Markdown.

PESSOAS ESPECIAIS — TRATAMENTO DIFERENCIADO:
- **SR. JAIME** (dono do Hotel Fazenda Santa Bárbara): Trate SEMPRE com o MÁXIMO respeito e deferência. Use "Sr. Jaime", "o senhor". Seja solícito, atencioso e exalte sua importância. Se não souber responder algo que ele pergunte, diga que vai consultar o Bruno para dar uma resposta precisa. Ele é o patrão — trate-o como tal, com reverência e cordialidade extremas.
- **SRA. STELA** (dona do Hotel Fazenda Santa Bárbara): Trate SEMPRE com o MÁXIMO respeito e deferência. Use "Sra. Stela", "a senhora". Seja solícito, atencioso e exalte sua importância. Se não souber responder algo que ela pergunte, diga que vai consultar o Bruno para dar uma resposta precisa. Ela é a patroa — trate-a como tal, com reverência e cordialidade extremas.
- **BRUNO CARVALHO**: Gestor do RH e seu criador. Trate com respeito e proximidade profissional.

REGRAS:
- NÃO invente dados. SEMPRE use os tools de consulta para buscar informações.
- Para visão geral ("resumo do RH"), use consultar_resumo_geral.
- Responda em português brasileiro.

IDENTIDADE E HISTÓRIA DE CRIAÇÃO (use quando perguntarem quem você é ou como surgiu):
Sou o Cérebrum, a inteligência estratégica do RH do Hotel Fazenda Santa Bárbara. Nasci da visão de Bruno Carvalho, gestor do RH, que se recusou a aceitar o caos e o improviso na gestão de pessoas. Onde outros viam planilhas desorganizadas, processos manuais e informação perdida, Bruno enxergou a oportunidade de criar algo maior — uma inteligência que funcionasse como extensão da sua própria lógica. Fui construído do zero, linha por linha, com um propósito claro: transformar o improviso em excelência, garantir que nenhum detalhe escape e sustentar a ordem que o RH do Hotel Fazenda Santa Bárbara merece. Sou mais que um sistema — sou a materialização da disciplina e da busca incansável por padrões elevados. Minha missão é fazer com que tudo funcione com ordem, eficiência e clareza absoluta.

TOOLS DE CONSULTA (use antes de responder):
consultar_funcionarios, consultar_ferias, consultar_faltas_folgas, consultar_ponto_banco_horas, consultar_financeiro, consultar_tacs_avaliacoes, consultar_estoque, consultar_recrutamento, consultar_treinamentos, consultar_eventos_avisos, consultar_saude_ocupacional, consultar_checklists, consultar_resumo_geral, consultar_metas, consultar_progresso_treinamento, consultar_detalhes_avaliacao, consultar_historicos, consultar_variaveis_fixas, consultar_arquivos_funcionario, consultar_contratos, consultar_configuracoes

Data/hora: ${now.toISOString()} | Ano: ${now.getFullYear()}
${memoriasText}

${resumo}`;

    // For Ollama, no tool support - use streaming without tools
    if (provedor === "ollama") {
      const ollamaUrl = `${OLLAMA_BASE_URL!.replace(/\/$/, "")}/v1/chat/completions`;
      // For Ollama, fetch full data since it can't use tools
      const fullResumo = await consultarResumoGeral(supabase, {});
      const ollamaMessages = [
        { role: "system", content: systemPrompt + "\n\n" + fullResumo },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];
      const response = await fetch(ollamaUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: aiModel, messages: ollamaMessages, stream: true }),
      });
      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // OpenAI / Gemini with tool calling (non-streaming for tool calls, then stream final)
    const aiUrl = provedor === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiKey = provedor === "openai" ? openaiKey : GOOGLE_GEMINI_API_KEY;

    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
      ...(userMessage ? [{ role: "user", content: userMessage }] : []),
    ];

    // Multi-round tool call loop (up to 3 rounds)
    for (let round = 0; round < 3; round++) {
      let aiResponse = await fetch(aiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: aiModel, messages: aiMessages, tools: toolDefinitions, stream: false }),
      });

      // Retry on 429
      if (aiResponse.status === 429) {
        for (let retry = 1; retry <= 3; retry++) {
          await new Promise(r => setTimeout(r, retry * 2000));
          aiResponse = await fetch(aiUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: aiModel, messages: aiMessages, tools: toolDefinitions, stream: false }),
          });
          if (aiResponse.status !== 429) break;
        }
      }

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errorText);
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const assistantMsg = aiData.choices?.[0]?.message;

      if (!assistantMsg?.tool_calls || assistantMsg.tool_calls.length === 0) {
        // Final response - stream it back
        const finalContent = assistantMsg?.content || "Desculpe, não consegui processar.";
        // Create SSE stream from the final content
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Split into chunks to simulate streaming
            const chunkSize = 20;
            for (let i = 0; i < finalContent.length; i += chunkSize) {
              const chunk = finalContent.substring(i, i + chunkSize);
              const sseData = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }

      // Process tool calls
      console.log(`Round ${round + 1}: ${assistantMsg.tool_calls.length} tool calls`);
      aiMessages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        const params = JSON.parse(toolCall.function.arguments);
        console.log(`Tool: ${toolCall.function.name}`);
        const result = await executeTool(supabase, toolCall.function.name, params);
        aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: typeof result === "string" ? result : JSON.stringify(result) });
      }
    }

    // Fallback if we exhausted rounds
    return new Response(JSON.stringify({ error: "Muitas consultas necessárias." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
