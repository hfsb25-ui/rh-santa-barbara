import { supabase } from "@/integrations/supabase/client";

export interface DescontoDiferenca {
  variavel_id: string;
  nome: string;
  codigo: string | null;
  valor: number;
}

export interface CalculoDiferenca {
  base: number;
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
  variaveisConfig: string[]
): Promise<CalculoDiferenca | null> {
  // 1. Pegar salário base
  const { data: emp } = await supabase
    .from("employees")
    .select("salario")
    .eq("id", employeeId)
    .maybeSingle();
  const base = Number(emp?.salario || 0);
  if (!base) return null;

  if (!variaveisConfig.length) {
    return { base, descontos: [], total_descontos: 0, diferenca: base };
  }

  // 2. Pegar holerite normal (salario) do mês
  const { data: folha } = await supabase
    .from("folha_pagamento")
    .select(
      `id, folha_pagamento_itens(variavel_id, valor, variaveis_folha(id, nome, codigo, tipo))`
    )
    .eq("employee_id", employeeId)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo_folha", "salario")
    .maybeSingle();

  const descontos: DescontoDiferenca[] = [];
  const itens = (folha?.folha_pagamento_itens || []) as any[];
  itens.forEach((it) => {
    if (variaveisConfig.includes(it.variavel_id)) {
      descontos.push({
        variavel_id: it.variavel_id,
        nome: it.variaveis_folha?.nome || "—",
        codigo: it.variaveis_folha?.codigo || null,
        valor: Number(it.valor) || 0,
      });
    }
  });

  const total_descontos = descontos.reduce((s, d) => s + d.valor, 0);
  return {
    base,
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

  if (calculo.descontos.length > 0) {
    const itens = calculo.descontos.map((d) => ({
      folha_pagamento_id: pagamentoId,
      variavel_id: d.variavel_id,
      valor: d.valor,
    }));
    const { error: itensErr } = await supabase.from("folha_pagamento_itens").insert(itens);
    if (itensErr) throw itensErr;
  }

  return pagamentoId;
}
