import { supabase } from "@/integrations/supabase/client";

export interface DescontoDiferenca {
  variavel_id: string;
  nome: string;
  codigo: string | null;
  valor: number;
}

export interface ProventoDiferenca {
  variavel_id: string;
  nome: string;
  codigo: string | null;
  valor: number;
}

export interface CalculoDiferenca {
  base: number;
  salario_base: number;
  proventos: ProventoDiferenca[];
  total_proventos: number;
  descontos: DescontoDiferenca[];
  total_descontos: number;
  diferenca: number;
}

/**
 * Busca config global de variáveis consideradas no holerite diferença.
 * Retorna array de UUIDs.
 */
export interface ConfigDiferenca {
  variaveis_desconto_ids: string[];
  incluir_liquido_holerite: boolean;
}

export async function carregarConfigDiferenca(): Promise<ConfigDiferenca> {
  const { data, error } = await (supabase as any)
    .from("configuracao_holerite_diferenca")
    .select("variaveis_desconto_ids, ativo, incluir_liquido_holerite")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || data.ativo === false) {
    return { variaveis_desconto_ids: [], incluir_liquido_holerite: false };
  }
  return {
    variaveis_desconto_ids: (data.variaveis_desconto_ids || []) as string[],
    incluir_liquido_holerite: !!data.incluir_liquido_holerite,
  };
}

/**
 * Calcula o holerite diferença para um funcionário em um mês/ano específico.
 * Base = employees.salario
 * Descontos = soma dos itens (variáveis configuradas) presentes na folha do mês
 * Diferença = base - descontos
 */
export async function calcularHoleriteDiferenca(
  employeeId: string,
  mes: number,
  ano: number,
  config: ConfigDiferenca
): Promise<CalculoDiferenca | null> {
  const variaveisConfig = config.variaveis_desconto_ids || [];
  const incluirLiquido = config.incluir_liquido_holerite;

  // 1. Pegar salário base
  const { data: emp } = await supabase
    .from("employees")
    .select("salario")
    .eq("id", employeeId)
    .maybeSingle();
  const salarioBase = Number(emp?.salario || 0);
  if (!salarioBase) return null;

  // 2. Pegar holerite normal do mês (precisa para itens E para líquido)
  const { data: folha } = await supabase
    .from("folha_pagamento")
    .select(
      `id, valor_liquido, folha_pagamento_itens(variavel_id, valor, variaveis_folha(id, nome, codigo, tipo))`
    )
    .eq("employee_id", employeeId)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo_folha", "salario")
    .maybeSingle();

  const descontos: DescontoDiferenca[] = [];

  if (incluirLiquido && folha) {
    const liquido = Number((folha as any).valor_liquido || 0);
    if (liquido > 0) {
      descontos.push({
        variavel_id: "__liquido_holerite__",
        nome: "Valor líquido do holerite principal",
        codigo: "LIQ",
        valor: liquido,
      });
    }
  }

  if (variaveisConfig.length) {
    // Buscar metadata de todas as variáveis configuradas (para nome/codigo)
    const { data: varsMeta } = await supabase
      .from("variaveis_folha")
      .select("id, nome, codigo")
      .in("id", variaveisConfig);
    const metaMap = new Map<string, { nome: string; codigo: string | null }>();
    (varsMeta || []).forEach((v: any) =>
      metaMap.set(v.id, { nome: v.nome, codigo: v.codigo })
    );

    // 2a. Itens do holerite normal do mês
    const itens = (folha?.folha_pagamento_itens || []) as any[];
    const idsCobertos = new Set<string>();
    itens.forEach((it) => {
      if (variaveisConfig.includes(it.variavel_id)) {
        const meta = metaMap.get(it.variavel_id);
        descontos.push({
          variavel_id: it.variavel_id,
          nome: it.variaveis_folha?.nome || meta?.nome || "—",
          codigo: it.variaveis_folha?.codigo || meta?.codigo || null,
          valor: Number(it.valor) || 0,
        });
        idsCobertos.add(it.variavel_id);
      }
    });

    // 2b. Fallback: variáveis fixas do funcionário (Clube de Benefícios, etc.)
    const faltantes = variaveisConfig.filter((id) => !idsCobertos.has(id));
    if (faltantes.length) {
      const { data: fixas } = await supabase
        .from("variaveis_fixas_funcionario")
        .select("variavel_id, valor, ativo")
        .eq("employee_id", employeeId)
        .eq("ativo", true)
        .in("variavel_id", faltantes);
      (fixas || []).forEach((f: any) => {
        const meta = metaMap.get(f.variavel_id);
        const valor = Number(f.valor) || 0;
        if (valor > 0) {
          descontos.push({
            variavel_id: f.variavel_id,
            nome: meta?.nome || "—",
            codigo: meta?.codigo || null,
            valor,
          });
        }
      });
    }
  }

  // 3. Proventos das variáveis fixas ativas do funcionário (tipo "provento")
  const proventos: ProventoDiferenca[] = [];
  const { data: fixasTodas } = await supabase
    .from("variaveis_fixas_funcionario")
    .select("variavel_id, valor, ativo, variaveis_folha(id, nome, codigo, tipo)")
    .eq("employee_id", employeeId)
    .eq("ativo", true);
  (fixasTodas || []).forEach((f: any) => {
    const v = f.variaveis_folha;
    if (!v || v.tipo !== "provento") return;
    const valor = Number(f.valor) || 0;
    if (valor <= 0) return;
    proventos.push({
      variavel_id: f.variavel_id,
      nome: v.nome || "—",
      codigo: v.codigo || null,
      valor,
    });
  });

  const total_proventos = proventos.reduce((s, p) => s + p.valor, 0);
  const total_descontos = descontos.reduce((s, d) => s + d.valor, 0);
  const base = salarioBase + total_proventos;
  return {
    base,
    salario_base: salarioBase,
    proventos,
    total_proventos,
    descontos,
    total_descontos,
    diferenca: base - total_descontos,
  };
}

/**
 * Verifica se já existe um holerite diferença para o funcionário/mês/ano.
 */
export async function existeHoleriteDiferenca(
  employeeId: string,
  mes: number,
  ano: number
): Promise<boolean> {
  const { data } = await supabase
    .from("folha_pagamento")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo_folha", "diferenca")
    .maybeSingle();
  return !!data;
}

/**
 * Cria (ou substitui) o holerite diferença persistido em folha_pagamento + itens.
 */
export async function persistirHoleriteDiferenca(params: {
  employeeId: string;
  empresaId: string;
  mes: number;
  ano: number;
  calculo: CalculoDiferenca;
  observacoes?: string | null;
}): Promise<string> {
  const { employeeId, empresaId, mes, ano, calculo, observacoes } = params;

  // upsert manual
  const { data: existing } = await supabase
    .from("folha_pagamento")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo_folha", "diferenca")
    .maybeSingle();

  let pagamentoId: string;
  const payload: any = {
    employee_id: employeeId,
    empresa_id: empresaId,
    mes,
    ano,
    tipo_folha: "diferenca",
    valor_bruto: calculo.base,
    desconto: 0,
    descontos: calculo.total_descontos,
    valor_liquido: calculo.diferenca,
    observacoes: observacoes ?? null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("folha_pagamento")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    pagamentoId = data.id;
    await supabase.from("folha_pagamento_itens").delete().eq("folha_pagamento_id", pagamentoId);
  } else {
    const { data, error } = await supabase
      .from("folha_pagamento")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    pagamentoId = data.id;
  }

  // Filtrar pseudo-itens (ex.: valor líquido do holerite principal não é uma variável real)
  const descontosReais = calculo.descontos.filter(
    (d) => d.variavel_id && !d.variavel_id.startsWith("__")
  );
  const proventosReais = (calculo.proventos || []).filter(
    (p) => p.variavel_id && !p.variavel_id.startsWith("__")
  );
  const itens = [
    ...proventosReais.map((p) => ({
      folha_pagamento_id: pagamentoId,
      variavel_id: p.variavel_id,
      valor: p.valor,
    })),
    ...descontosReais.map((d) => ({
      folha_pagamento_id: pagamentoId,
      variavel_id: d.variavel_id,
      valor: d.valor,
    })),
  ];
  if (itens.length > 0) {
    const { error: itensErr } = await supabase.from("folha_pagamento_itens").insert(itens);
    if (itensErr) throw itensErr;
  }

  return pagamentoId;
}
