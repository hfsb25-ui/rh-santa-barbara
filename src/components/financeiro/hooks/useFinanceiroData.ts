import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceiroFilters {
  empresa: string;
  periodo: string;
  setor: string;
  tipoContrato: string;
  tipoFolha: string;
}

export interface KPIsData {
  custoTotal: number;
  variacaoMensal: number;
  custoMedioFuncionario: number;
  custoMedioPorSetor: number;
  percentualDescontos: number;
  projecaoProximoMes: number;
  totalFuncionarios: number;
  totalSetores: number;
  totalBruto: number;
  totalInss: number;
  totalFgts: number;
  totalIrrf: number;
  totalLiquido: number;
  totalPrincipal: number;
  totalDiferenca: number;
  quantidadePrincipal: number;
  quantidadeDiferenca: number;
}

export interface SetorData {
  setor: string;
  custoTotal: number;
  quantidadeFuncionarios: number;
  custoMedio: number;
  percentualTotal: number;
  variacao: number;
}

export interface ContratoData {
  tipo: string;
  custoTotal: number;
  quantidade: number;
  percentual: number;
}

export interface HistoricoData {
  mes: string;
  ano: number;
  mesNumero: number;
  totalBruto: number;
  totalDescontos: number;
  totalLiquido: number;
  totalInss: number;
  totalFgts: number;
  totalIrrf: number;
  totalDiferenca: number;
  totalPrincipal: number;
  quantidadePagamentos: number;
  diferencaValor: number;
  diferencaPercentual: number;
}

export interface VariacaoFuncionario {
  id: string;
  nome: string;
  valorAtual: number;
  valorAnterior: number;
  diferenca: number;
  percentual: number;
}

export interface TendenciaData {
  indicador: "crescente" | "estavel" | "decrescente";
  mediaMovel: number[];
  projecao: number[];
}

export interface ContratoEvolucaoData {
  mes: string;
  fixo: number;
  intermitente: number;
  prestador: number;
}

export interface Empresa {
  id: string;
  nome: string;
}

export interface Setor {
  id: string;
  nome: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function useFinanceiroData(filters: FinanceiroFilters) {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [kpis, setKpis] = useState<KPIsData>({
    custoTotal: 0,
    variacaoMensal: 0,
    custoMedioFuncionario: 0,
    custoMedioPorSetor: 0,
    percentualDescontos: 0,
    projecaoProximoMes: 0,
    totalFuncionarios: 0,
    totalSetores: 0,
  });
  const [gastosPorSetor, setGastosPorSetor] = useState<SetorData[]>([]);
  const [gastosPorContrato, setGastosPorContrato] = useState<ContratoData[]>([]);
  const [historicoMensal, setHistoricoMensal] = useState<HistoricoData[]>([]);
  const [variacoesFuncionarios, setVariacoesFuncionarios] = useState<VariacaoFuncionario[]>([]);
  const [tendencia, setTendencia] = useState<TendenciaData>({
    indicador: "estavel",
    mediaMovel: [],
    projecao: [],
  });
  const [evolucaoPorContrato, setEvolucaoPorContrato] = useState<ContratoEvolucaoData[]>([]);

  const fetchEmpresas = useCallback(async () => {
    const { data } = await supabase.from("empresas").select("id, nome").order("nome");
    setEmpresas(data || []);
  }, []);

  const fetchSetores = useCallback(async () => {
    const { data } = await supabase.from("setores").select("id, nome").order("nome");
    setSetores(data || []);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Determinar período
      let mesesParaBuscar = 12;
      switch (filters.periodo) {
        case "1month": mesesParaBuscar = 1; break;
        case "3months": mesesParaBuscar = 3; break;
        case "6months": mesesParaBuscar = 6; break;
        case "12months": mesesParaBuscar = 12; break;
      }

      // Buscar funcionários
      let employeesQuery = supabase
        .from("employees")
        .select("id, nome_completo, setor, tipo_contrato, salario, status, empresa_id")
        .in("status", ["ativo", "ferias"]);

      if (filters.empresa !== "all") {
        employeesQuery = employeesQuery.eq("empresa_id", filters.empresa);
      }
      if (filters.setor !== "all") {
        employeesQuery = employeesQuery.eq("setor", filters.setor);
      }
      if (filters.tipoContrato !== "all") {
        employeesQuery = employeesQuery.eq("tipo_contrato", filters.tipoContrato as "fixo" | "intermitente" | "prestador_servico");
      }

      const { data: employees } = await employeesQuery;

      // Buscar folha de pagamento
      let folhaQuery = supabase
        .from("folha_pagamento")
        .select("*, employees(nome_completo, setor, tipo_contrato)")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });

      if (filters.empresa !== "all") {
        folhaQuery = folhaQuery.eq("empresa_id", filters.empresa);
      }
      if (filters.tipoFolha !== "all") {
        folhaQuery = folhaQuery.eq("tipo_folha", filters.tipoFolha);
      }

      const { data: folhaPagamento } = await folhaQuery;

      // Filtrar por período
      const folhaFiltrada = (folhaPagamento || []).filter(f => {
        const mesesAtras = (currentYear - f.ano) * 12 + (currentMonth - f.mes);
        return mesesAtras >= 0 && mesesAtras < mesesParaBuscar;
      });

      // Calcular KPIs
      const folhaMesAtual = folhaFiltrada.filter(f => f.mes === currentMonth && f.ano === currentYear);
      const folhaMesAnterior = folhaFiltrada.filter(f => {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        return f.mes === prevMonth && f.ano === prevYear;
      });

      const custoTotal = folhaMesAtual.reduce((sum, f) => sum + (f.valor_bruto || 0), 0);
      const custoAnterior = folhaMesAnterior.reduce((sum, f) => sum + (f.valor_bruto || 0), 0);
      const totalDescontos = folhaMesAtual.reduce((sum, f) => sum + (f.descontos || 0), 0);
      const variacaoMensal = custoAnterior > 0 ? ((custoTotal - custoAnterior) / custoAnterior) * 100 : 0;

      const totalFuncionarios = employees?.length || 0;
      const setoresUnicos = new Set(employees?.map(e => e.setor).filter(Boolean));
      const totalSetores = setoresUnicos.size || 1;

      // Calcular gastos por setor
      const setorMap = new Map<string, { total: number; count: number; anterior: number }>();
      
      employees?.forEach(emp => {
        const setor = emp.setor || "Sem Setor";
        if (!setorMap.has(setor)) {
          setorMap.set(setor, { total: 0, count: 0, anterior: 0 });
        }
        const current = setorMap.get(setor)!;
        current.total += emp.salario || 0;
        current.count += 1;
      });

      // Calcular dados do mês anterior para variação por setor
      folhaMesAnterior.forEach(f => {
        const setor = f.employees?.setor || "Sem Setor";
        if (setorMap.has(setor)) {
          const current = setorMap.get(setor)!;
          current.anterior += f.valor_bruto || 0;
        }
      });

      const custoTotalGeral = Array.from(setorMap.values()).reduce((sum, s) => sum + s.total, 0);
      const gastosPorSetorData: SetorData[] = Array.from(setorMap.entries())
        .map(([setor, data]) => ({
          setor,
          custoTotal: data.total,
          quantidadeFuncionarios: data.count,
          custoMedio: data.count > 0 ? data.total / data.count : 0,
          percentualTotal: custoTotalGeral > 0 ? (data.total / custoTotalGeral) * 100 : 0,
          variacao: data.anterior > 0 ? ((data.total - data.anterior) / data.anterior) * 100 : 0,
        }))
        .sort((a, b) => b.custoTotal - a.custoTotal);

      // Calcular gastos por tipo de contrato
      const contratoMap = new Map<string, { total: number; count: number }>();
      employees?.forEach(emp => {
        const tipo = emp.tipo_contrato || "outro";
        if (!contratoMap.has(tipo)) {
          contratoMap.set(tipo, { total: 0, count: 0 });
        }
        const current = contratoMap.get(tipo)!;
        current.total += emp.salario || 0;
        current.count += 1;
      });

      const tipoContratoLabels: Record<string, string> = {
        fixo: "Fixo",
        intermitente: "Intermitente",
        prestador_servico: "Prestador de Serviço",
        outro: "Outro",
      };

      const gastosPorContratoData: ContratoData[] = Array.from(contratoMap.entries())
        .map(([tipo, data]) => ({
          tipo: tipoContratoLabels[tipo] || tipo,
          custoTotal: data.total,
          quantidade: data.count,
          percentual: custoTotalGeral > 0 ? (data.total / custoTotalGeral) * 100 : 0,
        }))
        .sort((a, b) => b.custoTotal - a.custoTotal);

      // Calcular histórico mensal
      const historicoMap = new Map<string, HistoricoData>();
      for (let i = 0; i < mesesParaBuscar; i++) {
        let mesNum = currentMonth - i;
        let ano = currentYear;
        while (mesNum <= 0) {
          mesNum += 12;
          ano -= 1;
        }
        const key = `${ano}-${mesNum}`;
        historicoMap.set(key, {
          mes: MESES[mesNum - 1],
          ano,
          mesNumero: mesNum,
          totalBruto: 0,
          totalDescontos: 0,
          totalLiquido: 0,
          quantidadePagamentos: 0,
          diferencaValor: 0,
          diferencaPercentual: 0,
        });
      }

      folhaFiltrada.forEach(f => {
        const key = `${f.ano}-${f.mes}`;
        if (historicoMap.has(key)) {
          const h = historicoMap.get(key)!;
          h.totalBruto += f.valor_bruto || 0;
          h.totalDescontos += f.descontos || 0;
          h.totalLiquido += f.valor_liquido || 0;
          h.quantidadePagamentos += 1;
        }
      });

      const historicoArray = Array.from(historicoMap.values())
        .sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mesNumero - a.mesNumero;
        });

      // Calcular diferenças
      for (let i = 0; i < historicoArray.length - 1; i++) {
        const atual = historicoArray[i];
        const anterior = historicoArray[i + 1];
        atual.diferencaValor = atual.totalBruto - anterior.totalBruto;
        atual.diferencaPercentual = anterior.totalBruto > 0 
          ? ((atual.totalBruto - anterior.totalBruto) / anterior.totalBruto) * 100 
          : 0;
      }

      // Calcular variações por funcionário
      const funcionarioMap = new Map<string, { atual: number; anterior: number; nome: string }>();
      
      folhaMesAtual.forEach(f => {
        const id = f.employee_id;
        const nome = f.employees?.nome_completo || "Desconhecido";
        if (!funcionarioMap.has(id)) {
          funcionarioMap.set(id, { atual: 0, anterior: 0, nome });
        }
        funcionarioMap.get(id)!.atual += f.valor_bruto || 0;
      });

      folhaMesAnterior.forEach(f => {
        const id = f.employee_id;
        const nome = f.employees?.nome_completo || "Desconhecido";
        if (!funcionarioMap.has(id)) {
          funcionarioMap.set(id, { atual: 0, anterior: 0, nome });
        }
        funcionarioMap.get(id)!.anterior += f.valor_bruto || 0;
      });

      const variacoesData: VariacaoFuncionario[] = Array.from(funcionarioMap.entries())
        .map(([id, data]) => ({
          id,
          nome: data.nome,
          valorAtual: data.atual,
          valorAnterior: data.anterior,
          diferenca: data.atual - data.anterior,
          percentual: data.anterior > 0 ? ((data.atual - data.anterior) / data.anterior) * 100 : (data.atual > 0 ? 100 : 0),
        }))
        .filter(v => Math.abs(v.percentual) > 5)
        .sort((a, b) => Math.abs(b.percentual) - Math.abs(a.percentual));

      // Calcular tendência
      const valoresMensais = historicoArray.map(h => h.totalBruto).reverse();
      const mediaMovel: number[] = [];
      for (let i = 2; i < valoresMensais.length; i++) {
        const media = (valoresMensais[i] + valoresMensais[i - 1] + valoresMensais[i - 2]) / 3;
        mediaMovel.push(media);
      }

      let indicador: "crescente" | "estavel" | "decrescente" = "estavel";
      if (valoresMensais.length >= 3) {
        const ultimosTres = valoresMensais.slice(-3);
        const tendenciaValor = ultimosTres[2] - ultimosTres[0];
        const percentualTendencia = ultimosTres[0] > 0 ? (tendenciaValor / ultimosTres[0]) * 100 : 0;
        if (percentualTendencia > 5) indicador = "crescente";
        else if (percentualTendencia < -5) indicador = "decrescente";
      }

      // Projeção simples
      const projecao: number[] = [];
      if (valoresMensais.length >= 3) {
        const ultimoValor = valoresMensais[valoresMensais.length - 1];
        const taxaCrescimento = variacaoMensal / 100;
        for (let i = 1; i <= 3; i++) {
          projecao.push(ultimoValor * Math.pow(1 + taxaCrescimento, i));
        }
      }

      // Evolução por tipo de contrato
      const evolucaoContrato: ContratoEvolucaoData[] = [];
      for (let i = 5; i >= 0; i--) {
        let mesNum = currentMonth - i;
        let ano = currentYear;
        while (mesNum <= 0) {
          mesNum += 12;
          ano -= 1;
        }

        const folhaMes = folhaFiltrada.filter(f => f.mes === mesNum && f.ano === ano);
        
        const fixo = folhaMes
          .filter(f => f.employees?.tipo_contrato === "fixo")
          .reduce((sum, f) => sum + (f.valor_bruto || 0), 0);
        const intermitente = folhaMes
          .filter(f => f.employees?.tipo_contrato === "intermitente")
          .reduce((sum, f) => sum + (f.valor_bruto || 0), 0);
        const prestador = folhaMes
          .filter(f => f.employees?.tipo_contrato === "prestador_servico")
          .reduce((sum, f) => sum + (f.valor_bruto || 0), 0);

        evolucaoContrato.push({
          mes: MESES[mesNum - 1].substring(0, 3),
          fixo,
          intermitente,
          prestador,
        });
      }

      setKpis({
        custoTotal,
        variacaoMensal,
        custoMedioFuncionario: totalFuncionarios > 0 ? custoTotal / totalFuncionarios : 0,
        custoMedioPorSetor: totalSetores > 0 ? custoTotal / totalSetores : 0,
        percentualDescontos: custoTotal > 0 ? (totalDescontos / custoTotal) * 100 : 0,
        projecaoProximoMes: projecao[0] || custoTotal,
        totalFuncionarios,
        totalSetores,
      });

      setGastosPorSetor(gastosPorSetorData);
      setGastosPorContrato(gastosPorContratoData);
      setHistoricoMensal(historicoArray);
      setVariacoesFuncionarios(variacoesData);
      setTendencia({ indicador, mediaMovel, projecao });
      setEvolucaoPorContrato(evolucaoContrato);

    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmpresas();
    fetchSetores();
  }, [fetchEmpresas, fetchSetores]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    empresas,
    setores,
    kpis,
    gastosPorSetor,
    gastosPorContrato,
    historicoMensal,
    variacoesFuncionarios,
    tendencia,
    evolucaoPorContrato,
    refetch: fetchData,
  };
}
