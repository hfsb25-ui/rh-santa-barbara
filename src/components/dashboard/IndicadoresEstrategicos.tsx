import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  CalendarX,
  Stethoscope,
  UserMinus,
  DollarSign,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Users,
  FileWarning,
  Wallet,
} from "lucide-react";
import {
  differenceInDays,
  differenceInMonths,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface Props {
  selectedEmpresa: string;
}

const today = new Date();
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const moneyBR = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function IndicadoresEstrategicos({ selectedEmpresa }: Props) {
  const empresaFilter = selectedEmpresa !== "all" ? selectedEmpresa : null;

  return (
    <div className="space-y-8">
      <PessoasTurnoverSection empresaFilter={empresaFilter} />
      <FeriasComplianceSection empresaFilter={empresaFilter} />
      <AbsenteismoSection empresaFilter={empresaFilter} />
      <FolhaCustoSection empresaFilter={empresaFilter} />
      <TacsDisciplinarSection empresaFilter={empresaFilter} />
      <TreinamentosSection empresaFilter={empresaFilter} />
      <RecrutamentoSection empresaFilter={empresaFilter} />
    </div>
  );
}

// ============================================================
// 1. PESSOAS & TURNOVER
// ============================================================
function PessoasTurnoverSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-turnover", empresaFilter],
    queryFn: async () => {
      let q = supabase.from("employees").select("*");
      if (empresaFilter) q = q.eq("empresa_id", empresaFilter);
      const { data: emps, error } = await q;
      if (error) throw error;

      const ativos = (emps || []).filter((e) => e.status !== "demitido");
      const oneYearAgo = subMonths(today, 12);

      const admitidos12m = (emps || []).filter(
        (e) => e.data_admissao && parseISO(e.data_admissao) >= oneYearAgo
      ).length;
      const demitidos12m = (emps || []).filter(
        (e) =>
          e.data_desligamento && parseISO(e.data_desligamento) >= oneYearAgo
      ).length;

      const totalRef = ativos.length + demitidos12m;
      const turnoverPct = totalRef > 0 ? (demitidos12m / totalRef) * 100 : 0;
      const retentionPct = 100 - turnoverPct;

      const tenureAvg =
        ativos.length > 0
          ? ativos.reduce((sum, e) => {
              if (!e.data_admissao) return sum;
              return sum + differenceInDays(today, parseISO(e.data_admissao));
            }, 0) /
            ativos.length /
            365
          : 0;

      // Evolução headcount últimos 12 meses
      const evolution = Array.from({ length: 12 }).map((_, i) => {
        const m = subMonths(today, 11 - i);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const admissoes = (emps || []).filter((e) => {
          if (!e.data_admissao) return false;
          const d = parseISO(e.data_admissao);
          return d >= start && d <= end;
        }).length;
        const demissoes = (emps || []).filter((e) => {
          if (!e.data_desligamento) return false;
          const d = parseISO(e.data_desligamento);
          return d >= start && d <= end;
        }).length;
        return {
          mes: format(m, "MMM/yy", { locale: ptBR }),
          admissoes,
          demissoes,
        };
      });

      // Turnover do mês atual
      const startMonth = startOfMonth(today);
      const endMonth = endOfMonth(today);
      const demissoesMes = (emps || []).filter((e) => {
        if (!e.data_desligamento) return false;
        const d = parseISO(e.data_desligamento);
        return d >= startMonth && d <= endMonth;
      }).length;
      const turnoverMesPct =
        ativos.length > 0 ? (demissoesMes / ativos.length) * 100 : 0;

      return {
        retentionPct,
        turnoverPct,
        tenureAvg,
        evolution,
        turnoverMesPct,
        demissoesMes,
        admitidos12m,
        demitidos12m,
      };
    },
  });

  return (
    <SectionWrapper title="Pessoas & Turnover" icon={<Users className="w-5 h-5" />}>
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Taxa de Retenção (12m)"
              value={`${data.retentionPct.toFixed(1)}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              trend={data.retentionPct >= 80 ? "up" : "down"}
            />
            <KpiCard
              label="Turnover (12m)"
              value={`${data.turnoverPct.toFixed(1)}%`}
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              hint={`${data.demitidos12m} desligamentos`}
            />
            <KpiCard
              label="Tempo Médio de Casa"
              value={`${data.tenureAvg.toFixed(1)} anos`}
              icon={<Briefcase className="w-5 h-5 text-indigo-500" />}
            />
            <KpiCard
              label="Turnover do Mês"
              value={`${data.turnoverMesPct.toFixed(1)}%`}
              icon={<UserMinus className="w-5 h-5 text-orange-500" />}
              hint={`${data.demissoesMes} saídas`}
            />
          </div>

          <Card className="mt-4 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-base">
                Evolução de Headcount (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.evolution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="admissoes"
                    name="Admissões"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="demissoes"
                    name="Demissões"
                    stroke="hsl(0 72% 51%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 2. FÉRIAS & COMPLIANCE
// ============================================================
function FeriasComplianceSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-ferias-compliance", empresaFilter],
    queryFn: async () => {
      let empQuery = supabase
        .from("employees")
        .select("id, nome_completo, data_admissao, status, empresa_id")
        .neq("status", "demitido");
      if (empresaFilter) empQuery = empQuery.eq("empresa_id", empresaFilter);
      const { data: emps } = await empQuery;

      const empIds = (emps || []).map((e) => e.id);

      // Buscar últimas férias gozadas
      const { data: ferias } = empIds.length
        ? await supabase
            .from("ferias")
            .select("employee_id, periodo_aquisitivo_inicio, periodo_gozo_fim")
            .in("employee_id", empIds)
        : { data: [] as any[] };

      // Calcular vencidas / a vencer
      const lastFeriasMap = new Map<string, Date>();
      (ferias || []).forEach((f) => {
        const fim = f.periodo_gozo_fim ? parseISO(f.periodo_gozo_fim) : null;
        if (!fim) return;
        const cur = lastFeriasMap.get(f.employee_id);
        if (!cur || fim > cur) lastFeriasMap.set(f.employee_id, fim);
      });

      const vencidas: any[] = [];
      const aVencer: any[] = [];
      (emps || []).forEach((e) => {
        if (!e.data_admissao) return;
        const refDate = lastFeriasMap.get(e.id) || parseISO(e.data_admissao);
        const proximoVencimento = addMonths(refDate, 12);
        const meses = differenceInMonths(today, refDate);
        if (meses >= 11) {
          vencidas.push({
            id: e.id,
            nome: e.nome_completo,
            mesesEmAberto: meses,
            vencimento: proximoVencimento,
          });
        } else {
          const diasParaVencer = differenceInDays(proximoVencimento, today);
          if (diasParaVencer <= 60 && diasParaVencer >= 0) {
            aVencer.push({
              id: e.id,
              nome: e.nome_completo,
              diasParaVencer,
            });
          }
        }
      });

      // ASO
      const { data: asos } = empIds.length
        ? await supabase
            .from("encaminhamentos_medicos")
            .select("employee_id, data_realizacao, tipo_exame, status")
            .in("employee_id", empIds)
        : { data: [] as any[] };

      const lastAsoMap = new Map<string, Date>();
      (asos || []).forEach((a) => {
        if (!a.data_realizacao) return;
        const d = parseISO(a.data_realizacao);
        const cur = lastAsoMap.get(a.employee_id);
        if (!cur || d > cur) lastAsoMap.set(a.employee_id, d);
      });

      let asoVencidos = 0;
      let asoAVencer = 0;
      (emps || []).forEach((e) => {
        const last = lastAsoMap.get(e.id);
        if (!last) {
          asoVencidos++;
          return;
        }
        const validade = addMonths(last, 12);
        const dias = differenceInDays(validade, today);
        if (dias < 0) asoVencidos++;
        else if (dias <= 30) asoAVencer++;
      });

      vencidas.sort((a, b) => b.mesesEmAberto - a.mesesEmAberto);
      aVencer.sort((a, b) => a.diasParaVencer - b.diasParaVencer);

      return { vencidas, aVencer, asoVencidos, asoAVencer };
    },
  });

  return (
    <SectionWrapper
      title="Férias & Compliance Trabalhista"
      icon={<CalendarX className="w-5 h-5" />}
    >
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="shadow-elegant border-red-200/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Férias Vencidas
                <Badge variant="destructive" className="ml-auto">
                  {data.vencidas.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-auto">
              {data.vencidas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma vencida 🎉</p>
              )}
              {data.vencidas.slice(0, 10).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <span className="truncate font-medium">{v.nome}</span>
                  <Badge variant="destructive" className="text-xs">
                    {v.mesesEmAberto}m
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-elegant border-amber-200/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-amber-500" />
                Férias a Vencer (60d)
                <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                  {data.aVencer.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-auto">
              {data.aVencer.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma próxima do vencimento</p>
              )}
              {data.aVencer.slice(0, 10).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <span className="truncate font-medium">{v.nome}</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-300 text-amber-700"
                  >
                    {v.diasParaVencer}d
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-500" />
                Saúde Ocupacional (ASO)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div>
                  <p className="text-xs text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{data.asoVencidos}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500/40" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <div>
                  <p className="text-xs text-muted-foreground">A vencer (30d)</p>
                  <p className="text-2xl font-bold text-amber-600">{data.asoAVencer}</p>
                </div>
                <CalendarX className="w-8 h-8 text-amber-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 3. ABSENTEÍSMO
// ============================================================
function AbsenteismoSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-absenteismo", empresaFilter],
    queryFn: async () => {
      let empQuery = supabase
        .from("employees")
        .select("id, nome_completo, setor, empresa_id")
        .neq("status", "demitido");
      if (empresaFilter) empQuery = empQuery.eq("empresa_id", empresaFilter);
      const { data: emps } = await empQuery;
      const empIds = (emps || []).map((e) => e.id);
      const empMap = new Map((emps || []).map((e) => [e.id, e]));

      const last30 = subMonths(today, 1);
      const last90 = subMonths(today, 3);

      const { data: faltas30 } = empIds.length
        ? await supabase
            .from("faltas")
            .select("employee_id, data, justificada")
            .in("employee_id", empIds)
            .gte("data", fmt(last30))
        : { data: [] as any[] };

      const { data: faltas90 } = empIds.length
        ? await supabase
            .from("faltas")
            .select("employee_id, data")
            .in("employee_id", empIds)
            .gte("data", fmt(last90))
        : { data: [] as any[] };

      const totalDiasUteis = 22; // estimativa mensal
      const totalEsperado = (emps || []).length * totalDiasUteis;
      const totalFaltas30 = (faltas30 || []).length;
      const taxaAbsenteismo =
        totalEsperado > 0 ? (totalFaltas30 / totalEsperado) * 100 : 0;

      // Por setor
      const setorMap = new Map<string, { total: number; faltas: number }>();
      (emps || []).forEach((e) => {
        const s = e.setor || "Sem setor";
        const cur = setorMap.get(s) || { total: 0, faltas: 0 };
        cur.total += 1;
        setorMap.set(s, cur);
      });
      (faltas30 || []).forEach((f) => {
        const emp = empMap.get(f.employee_id);
        const s = emp?.setor || "Sem setor";
        const cur = setorMap.get(s);
        if (cur) cur.faltas += 1;
      });
      const porSetor = Array.from(setorMap.entries())
        .map(([nome, v]) => ({
          nome,
          taxa: v.total > 0 ? (v.faltas / (v.total * totalDiasUteis)) * 100 : 0,
          faltas: v.faltas,
        }))
        .filter((s) => s.taxa > 0)
        .sort((a, b) => b.taxa - a.taxa);

      // Top 5 funcionários (90d)
      const empFaltasMap = new Map<string, number>();
      (faltas90 || []).forEach((f) => {
        empFaltasMap.set(
          f.employee_id,
          (empFaltasMap.get(f.employee_id) || 0) + 1
        );
      });
      const topFaltosos = Array.from(empFaltasMap.entries())
        .map(([id, count]) => ({
          id,
          nome: empMap.get(id)?.nome_completo || "—",
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return { taxaAbsenteismo, totalFaltas30, porSetor, topFaltosos };
    },
  });

  return (
    <SectionWrapper title="Absenteísmo" icon={<UserMinus className="w-5 h-5" />}>
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Taxa de Absenteísmo (30d)"
            value={`${data.taxaAbsenteismo.toFixed(2)}%`}
            icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
            hint={`${data.totalFaltas30} faltas no período`}
          />

          <Card className="shadow-elegant lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Por Setor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-60 overflow-auto">
              {data.porSetor.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem dados no período</p>
              )}
              {data.porSetor.slice(0, 6).map((s) => (
                <div key={s.nome} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate">{s.nome}</span>
                    <span className="text-muted-foreground">{s.taxa.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(s.taxa, 100)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top 5 Faltas (90d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topFaltosos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma falta registrada</p>
              )}
              {data.topFaltosos.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between py-1.5 text-sm border-b last:border-0"
                >
                  <span className="truncate font-medium">
                    {i + 1}. {f.nome}
                  </span>
                  <Badge variant="secondary">{f.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 4. FOLHA & CUSTO
// ============================================================
function FolhaCustoSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-folha", empresaFilter],
    queryFn: async () => {
      const mesAtual = today.getMonth() + 1;
      const anoAtual = today.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

      let q = supabase
        .from("folha_pagamento")
        .select("valor_bruto, mes, ano, employee_id, empresa_id");
      if (empresaFilter) q = q.eq("empresa_id", empresaFilter);
      const { data: folhas } = await q;

      const totalAtual = (folhas || [])
        .filter((f) => f.mes === mesAtual && f.ano === anoAtual)
        .reduce((s, f) => s + Number(f.valor_bruto || 0), 0);
      const totalAnterior = (folhas || [])
        .filter((f) => f.mes === mesAnterior && f.ano === anoAnterior)
        .reduce((s, f) => s + Number(f.valor_bruto || 0), 0);

      const variacao =
        totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

      const empCount = new Set(
        (folhas || [])
          .filter((f) => f.mes === mesAtual && f.ano === anoAtual)
          .map((f) => f.employee_id)
      ).size;

      const custoMedio = empCount > 0 ? totalAtual / empCount : 0;

      // Adiantamentos pendentes
      let aQuery = supabase
        .from("adiantamentos")
        .select("valor, status, empresa_id")
        .eq("status", "aguardando");
      if (empresaFilter) aQuery = aQuery.eq("empresa_id", empresaFilter);
      const { data: adiant } = await aQuery;

      const adiantQtd = (adiant || []).length;
      const adiantValor = (adiant || []).reduce(
        (s, a) => s + Number(a.valor || 0),
        0
      );

      return { totalAtual, custoMedio, variacao, adiantQtd, adiantValor, empCount };
    },
  });

  return (
    <SectionWrapper title="Folha & Custo" icon={<DollarSign className="w-5 h-5" />}>
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Folha do Mês"
            value={moneyBR(data.totalAtual)}
            icon={<Wallet className="w-5 h-5 text-emerald-500" />}
            hint={`${data.empCount} colaboradores`}
          />
          <KpiCard
            label="Custo Médio / Funcionário"
            value={moneyBR(data.custoMedio)}
            icon={<DollarSign className="w-5 h-5 text-indigo-500" />}
          />
          <KpiCard
            label="Variação vs Mês Anterior"
            value={`${data.variacao >= 0 ? "+" : ""}${data.variacao.toFixed(1)}%`}
            icon={
              data.variacao >= 0 ? (
                <TrendingUp className="w-5 h-5 text-amber-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-emerald-500" />
              )
            }
          />
          <KpiCard
            label="Adiantamentos Pendentes"
            value={`${data.adiantQtd}`}
            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
            hint={moneyBR(data.adiantValor)}
          />
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 5. TACS & DISCIPLINAR
// ============================================================
function TacsDisciplinarSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-tacs", empresaFilter],
    queryFn: async () => {
      let empQuery = supabase
        .from("employees")
        .select("id, nome_completo, empresa_id")
        .neq("status", "demitido");
      if (empresaFilter) empQuery = empQuery.eq("empresa_id", empresaFilter);
      const { data: emps } = await empQuery;
      const empIds = (emps || []).map((e) => e.id);
      const empMap = new Map((emps || []).map((e) => [e.id, e]));

      const { data: tacs } = empIds.length
        ? await supabase
            .from("tacs")
            .select("employee_id, tipo, status, data_ocorrencia, created_at")
            .in("employee_id", empIds)
        : { data: [] as any[] };

      // Reincidentes (2+)
      const counts = new Map<string, number>();
      (tacs || []).forEach((t) => {
        counts.set(t.employee_id, (counts.get(t.employee_id) || 0) + 1);
      });
      const reincidentes = Array.from(counts.entries())
        .filter(([, n]) => n >= 2)
        .map(([id, n]) => ({
          id,
          nome: empMap.get(id)?.nome_completo || "—",
          count: n,
        }))
        .sort((a, b) => b.count - a.count);

      // Por tipo
      const tipoMap = new Map<string, number>();
      (tacs || []).forEach((t) => {
        const tipo = t.tipo || "Outros";
        tipoMap.set(tipo, (tipoMap.get(tipo) || 0) + 1);
      });
      const porTipo = Array.from(tipoMap.entries())
        .map(([tipo, count]) => ({ tipo, count }))
        .sort((a, b) => b.count - a.count);

      // Aplicadas no mês
      const startMonth = startOfMonth(today);
      const aplicadasMes = (tacs || []).filter(
        (t) =>
          t.status === "aplicada" &&
          t.created_at &&
          parseISO(t.created_at) >= startMonth
      ).length;

      const total = (tacs || []).length;
      return { reincidentes, porTipo, aplicadasMes, total };
    },
  });

  return (
    <SectionWrapper title="TACs & Disciplinar" icon={<FileWarning className="w-5 h-5" />}>
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="shadow-elegant border-orange-200/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Reincidentes (2+)
                <Badge
                  variant="secondary"
                  className="ml-auto bg-orange-100 text-orange-700"
                >
                  {data.reincidentes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-60 overflow-auto">
              {data.reincidentes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum reincidente 👏</p>
              )}
              {data.reincidentes.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <span className="truncate font-medium">{r.nome}</span>
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                    {r.count} TACs
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Por Tipo de Ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-60 overflow-auto">
              {data.porTipo.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum TAC registrado</p>
              )}
              {data.porTipo.map((t) => (
                <div key={t.tipo} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">
                      {t.tipo.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">{t.count}</span>
                  </div>
                  <Progress
                    value={data.total > 0 ? (t.count / data.total) * 100 : 0}
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <KpiCard
              label="Aplicadas no Mês"
              value={`${data.aplicadasMes}`}
              icon={<FileWarning className="w-5 h-5 text-red-500" />}
            />
            <KpiCard
              label="Total Histórico"
              value={`${data.total}`}
              icon={<FileWarning className="w-5 h-5 text-slate-500" />}
            />
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 6. TREINAMENTOS & PERFORMANCE
// ============================================================
function TreinamentosSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-treinamentos", empresaFilter],
    queryFn: async () => {
      let empQuery = supabase
        .from("employees")
        .select("id, nome_completo, setor, cargo, empresa_id")
        .neq("status", "demitido");
      if (empresaFilter) empQuery = empQuery.eq("empresa_id", empresaFilter);
      const { data: emps } = await empQuery;
      const empIds = (emps || []).map((e) => e.id);

      // Cursos obrigatórios
      const { data: cursos } = await supabase
        .from("cursos")
        .select("id, titulo, obrigatorio, setor_id, funcao_id, empresa_id, ativo")
        .eq("ativo", true)
        .eq("obrigatorio", true);

      // Aulas dos cursos obrigatórios
      const cursoIds = (cursos || []).map((c) => c.id);
      const { data: modulos } = cursoIds.length
        ? await supabase.from("modulos").select("id, curso_id").in("curso_id", cursoIds)
        : { data: [] as any[] };
      const moduloIds = (modulos || []).map((m) => m.id);
      const { data: aulas } = moduloIds.length
        ? await supabase.from("aulas").select("id, modulo_id").in("modulo_id", moduloIds)
        : { data: [] as any[] };
      const aulaIds = (aulas || []).map((a) => a.id);

      const { data: progresso } = empIds.length && aulaIds.length
        ? await supabase
            .from("progresso_treinamento")
            .select("employee_id, aula_id, concluida")
            .in("employee_id", empIds)
            .in("aula_id", aulaIds)
            .eq("concluida", true)
        : { data: [] as any[] };

      const totalAulasObrig = aulaIds.length;
      const totalEsperado = empIds.length * totalAulasObrig;
      const totalConcluidas = (progresso || []).length;
      const taxaConclusao =
        totalEsperado > 0 ? (totalConcluidas / totalEsperado) * 100 : 0;

      // Funcionários sem completar tudo
      const concluidasPorEmp = new Map<string, number>();
      (progresso || []).forEach((p) => {
        concluidasPorEmp.set(
          p.employee_id,
          (concluidasPorEmp.get(p.employee_id) || 0) + 1
        );
      });
      const semCompletar = (emps || []).filter(
        (e) => (concluidasPorEmp.get(e.id) || 0) < totalAulasObrig
      ).length;

      // Avaliações
      const { data: avaliacoes } = empIds.length
        ? await supabase
            .from("avaliacoes_desempenho")
            .select("nota_final")
            .in("employee_id", empIds)
            .not("nota_final", "is", null)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [] as any[] };

      const notaMedia =
        (avaliacoes || []).length > 0
          ? (avaliacoes || []).reduce(
              (s, a) => s + Number(a.nota_final || 0),
              0
            ) / (avaliacoes || []).length
          : 0;

      return {
        taxaConclusao,
        semCompletar,
        notaMedia,
        totalAulasObrig,
        totalAvaliacoes: (avaliacoes || []).length,
      };
    },
  });

  return (
    <SectionWrapper
      title="Treinamentos & Performance"
      icon={<GraduationCap className="w-5 h-5" />}
    >
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Treinamentos Obrigatórios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {data.taxaConclusao.toFixed(1)}%
              </div>
              <Progress value={data.taxaConclusao} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {data.totalAulasObrig} aulas obrigatórias no total
              </p>
            </CardContent>
          </Card>

          <KpiCard
            label="Sem Conclusão Total"
            value={`${data.semCompletar}`}
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            hint="funcionários pendentes"
          />

          <KpiCard
            label="Nota Média de Avaliações"
            value={data.notaMedia.toFixed(1)}
            icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
            hint={`${data.totalAvaliacoes} avaliações analisadas`}
          />
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// 7. RECRUTAMENTO
// ============================================================
function RecrutamentoSection({ empresaFilter }: { empresaFilter: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["estrategico-recrutamento", empresaFilter],
    queryFn: async () => {
      let vQuery = supabase
        .from("vagas")
        .select("id, titulo, status, data_abertura, data_fechamento, empresa_id");
      if (empresaFilter) vQuery = vQuery.eq("empresa_id", empresaFilter);
      const { data: vagas } = await vQuery;

      const abertas = (vagas || []).filter((v) => v.status === "aberta");
      const fechadas = (vagas || []).filter(
        (v) => v.data_fechamento && v.data_abertura
      );

      const tempoMedio =
        fechadas.length > 0
          ? fechadas.reduce((s, v) => {
              return (
                s +
                differenceInDays(
                  parseISO(v.data_fechamento!),
                  parseISO(v.data_abertura!)
                )
              );
            }, 0) / fechadas.length
          : 0;

      // Candidaturas para vagas abertas
      const vagaAbertaIds = abertas.map((v) => v.id);
      const { count: candidaturasAbertas } = vagaAbertaIds.length
        ? await supabase
            .from("candidaturas")
            .select("*", { count: "exact", head: true })
            .in("vaga_id", vagaAbertaIds)
        : { count: 0 };

      const mediaPorVaga =
        abertas.length > 0 ? (candidaturasAbertas || 0) / abertas.length : 0;

      return {
        vagasAbertas: abertas.length,
        candidaturasAbertas: candidaturasAbertas || 0,
        mediaPorVaga,
        tempoMedio,
      };
    },
  });

  return (
    <SectionWrapper title="Recrutamento" icon={<Briefcase className="w-5 h-5" />}>
      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Vagas Abertas"
            value={`${data.vagasAbertas}`}
            icon={<Briefcase className="w-5 h-5 text-indigo-500" />}
          />
          <KpiCard
            label="Candidaturas (vagas abertas)"
            value={`${data.candidaturasAbertas}`}
            icon={<Users className="w-5 h-5 text-emerald-500" />}
          />
          <KpiCard
            label="Média Candidatos/Vaga"
            value={data.mediaPorVaga.toFixed(1)}
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          />
          <KpiCard
            label="Tempo Médio Preenchimento"
            value={`${data.tempoMedio.toFixed(0)}d`}
            icon={<CalendarX className="w-5 h-5 text-amber-500" />}
            hint="vagas já fechadas"
          />
        </div>
      )}
    </SectionWrapper>
  );
}

// ============================================================
// HELPERS
// ============================================================
function SectionWrapper({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon,
  hint,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  trend?: "up" | "down";
}) {
  return (
    <Card className="shadow-elegant">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="shadow-elegant">
          <CardContent className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
