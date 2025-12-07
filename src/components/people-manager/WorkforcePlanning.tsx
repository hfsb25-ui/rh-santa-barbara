import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Calendar, Users, TrendingUp, AlertTriangle, UserPlus, UserMinus, Building2 } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WorkforcePlanning() {
  const { data: employees } = useQuery({
    queryKey: ["workforce-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, empresas(nome)")
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["workforce-setores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: configSetor } = useQuery({
    queryKey: ["workforce-config-setor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracao_setor").select("*, setores(nome)");
      if (error) throw error;
      return data;
    },
  });

  const { data: ferias } = useQuery({
    queryKey: ["workforce-ferias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ferias").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: feriasPlanejadas } = useQuery({
    queryKey: ["workforce-ferias-planejadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ferias_planejadas").select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeEmployees = employees?.filter(e => e.status === "ativo") || [];

  // Calcular headcount por mês (últimos 6 meses + próximos 3)
  const headcountTrend = Array.from({ length: 9 }, (_, i) => {
    const month = i < 6 ? subMonths(new Date(), 5 - i) : addMonths(new Date(), i - 5);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    
    const count = employees?.filter(e => {
      if (!e.data_admissao) return false;
      const admDate = parseISO(e.data_admissao);
      const termDate = e.data_desligamento ? parseISO(e.data_desligamento) : null;
      
      if (i < 6) {
        // Meses passados: contar quem estava ativo
        return admDate <= end && (!termDate || termDate >= start);
      } else {
        // Meses futuros: projeção baseada no atual
        return e.status === "ativo";
      }
    }).length || 0;

    return {
      month: format(month, "MMM/yy", { locale: ptBR }),
      headcount: count,
      projecao: i >= 6,
    };
  });

  // Análise de capacidade por setor
  const sectorCapacity = setores?.map(setor => {
    const config = configSetor?.find(c => c.setor_id === setor.id);
    const currentCount = activeEmployees.filter(e => e.setor === setor.nome).length;
    const targetCount = config?.quantidade_media || 0;
    const diff = currentCount - targetCount;
    
    return {
      setor: setor.nome,
      atual: currentCount,
      meta: targetCount,
      diferenca: diff,
      percentual: targetCount > 0 ? (currentCount / targetCount) * 100 : 100,
    };
  }).filter(s => s.meta > 0) || [];

  // Próximas ausências (férias planejadas nos próximos 30 dias)
  const upcomingAbsences = feriasPlanejadas?.filter(f => {
    const startDate = parseISO(f.periodo_inicio);
    const daysUntil = differenceInDays(startDate, new Date());
    return daysUntil >= 0 && daysUntil <= 30;
  }).slice(0, 5) || [];

  // Alertas de workforce
  const alerts = [
    ...sectorCapacity.filter(s => s.diferenca < -2).map(s => ({
      type: "danger",
      message: `${s.setor}: ${Math.abs(s.diferenca)} funcionários abaixo da meta`,
      icon: AlertTriangle,
    })),
    ...sectorCapacity.filter(s => s.diferenca > 2).map(s => ({
      type: "warning",
      message: `${s.setor}: ${s.diferenca} funcionários acima da meta`,
      icon: AlertTriangle,
    })),
  ];

  // Turnover por mês
  const turnoverData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    
    const admissoes = employees?.filter(e => {
      if (!e.data_admissao) return false;
      const admDate = parseISO(e.data_admissao);
      return admDate >= start && admDate <= end;
    }).length || 0;

    const demissoes = employees?.filter(e => {
      if (!e.data_desligamento) return false;
      const termDate = parseISO(e.data_desligamento);
      return termDate >= start && termDate <= end;
    }).length || 0;

    return {
      month: format(month, "MMM", { locale: ptBR }),
      admissoes,
      demissoes,
    };
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Headcount Atual</p>
                <p className="text-3xl font-bold">{activeEmployees.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Setores</p>
                <p className="text-3xl font-bold">{setores?.length || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Férias Próximas</p>
                <p className="text-3xl font-bold">{upcomingAbsences.length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">próximos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                <p className="text-3xl font-bold">{alerts.length}</p>
              </div>
              <div className={`p-3 rounded-full ${alerts.length > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                <AlertTriangle className={`h-6 w-6 ${alerts.length > 0 ? "text-red-500" : "text-green-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projeção de Headcount */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção de Headcount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcountTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="headcount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Movimentação (Admissões x Demissões) */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentação de Pessoal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoverData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="admissoes" name="Admissões" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demissoes" name="Demissões" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacidade por Setor */}
      <Card>
        <CardHeader>
          <CardTitle>Capacidade por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          {sectorCapacity.length > 0 ? (
            <div className="space-y-4">
              {sectorCapacity.map((sector, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sector.setor}</span>
                      <Badge
                        variant={
                          sector.diferenca < -2
                            ? "destructive"
                            : sector.diferenca > 2
                            ? "secondary"
                            : "default"
                        }
                      >
                        {sector.atual} / {sector.meta}
                      </Badge>
                    </div>
                    <span className={`text-sm font-medium ${
                      sector.diferenca < 0 ? "text-red-500" : sector.diferenca > 0 ? "text-green-500" : ""
                    }`}>
                      {sector.diferenca > 0 ? "+" : ""}{sector.diferenca}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(sector.percentual, 100)}
                    className={`h-2 ${
                      sector.percentual < 80
                        ? "[&>div]:bg-red-500"
                        : sector.percentual > 120
                        ? "[&>div]:bg-yellow-500"
                        : ""
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Configure a quantidade média de funcionários por setor em Setores → Configuração
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Ausências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Férias (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAbsences.length > 0 ? (
              <div className="space-y-3">
                {upcomingAbsences.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Férias Planejada</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(f.periodo_inicio), "dd/MM", { locale: ptBR })} - {format(parseISO(f.periodo_fim), "dd/MM", { locale: ptBR })}
                      </p>
                      <Badge variant="secondary">{f.dias_totais} dias</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma férias programada nos próximos 30 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Workforce
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      alert.type === "danger" ? "bg-red-500/10" : "bg-yellow-500/10"
                    }`}
                  >
                    <alert.icon className={`h-5 w-5 ${
                      alert.type === "danger" ? "text-red-500" : "text-yellow-500"
                    }`} />
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-2">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground">Tudo em ordem! Nenhum alerta ativo.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
