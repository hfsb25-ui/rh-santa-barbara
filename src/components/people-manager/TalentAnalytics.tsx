import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle } from "lucide-react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function TalentAnalytics() {
  const { data: employees } = useQuery({
    queryKey: ["talent-analytics-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ["talent-analytics-avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*, employees(nome_completo, setor, cargo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cursos } = useQuery({
    queryKey: ["talent-analytics-cursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const activeEmployees = employees?.filter(e => e.status === "ativo") || [];

  // Calcular métricas de avaliação
  const avaliacoesCompletas = avaliacoes?.filter(a => a.status === "concluida") || [];
  const avgPerformance = avaliacoesCompletas.length > 0
    ? avaliacoesCompletas.reduce((sum, a) => sum + (a.nota_final || 0), 0) / avaliacoesCompletas.length
    : 0;

  // Distribuição de notas
  const performanceDistribution = [
    { range: "Excelente (8-10)", count: avaliacoesCompletas.filter(a => a.nota_final && a.nota_final >= 8).length, color: "hsl(142, 76%, 36%)" },
    { range: "Bom (6-7.9)", count: avaliacoesCompletas.filter(a => a.nota_final && a.nota_final >= 6 && a.nota_final < 8).length, color: "hsl(221, 83%, 53%)" },
    { range: "Regular (4-5.9)", count: avaliacoesCompletas.filter(a => a.nota_final && a.nota_final >= 4 && a.nota_final < 6).length, color: "hsl(45, 93%, 47%)" },
    { range: "Baixo (0-3.9)", count: avaliacoesCompletas.filter(a => a.nota_final && a.nota_final < 4).length, color: "hsl(0, 84%, 60%)" },
  ].filter(d => d.count > 0);

  // Evolução de contratações nos últimos 6 meses
  const hiringTrend = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = employees?.filter(e => {
      if (!e.data_admissao) return false;
      const admDate = parseISO(e.data_admissao);
      return admDate >= start && admDate <= end;
    }).length || 0;
    return {
      month: format(month, "MMM", { locale: ptBR }),
      contratacoes: count,
    };
  });

  // Desempenho por setor
  const setores = [...new Set(activeEmployees.map(e => e.setor).filter(Boolean))];
  const performanceBySetor = setores.map(setor => {
    const sectorAvaliacoes = avaliacoesCompletas.filter(a => a.employees?.setor === setor);
    const avgNota = sectorAvaliacoes.length > 0
      ? sectorAvaliacoes.reduce((sum, a) => sum + (a.nota_final || 0), 0) / sectorAvaliacoes.length
      : 0;
    return {
      setor,
      nota: avgNota,
      avaliacoes: sectorAvaliacoes.length,
    };
  }).filter(s => s.avaliacoes > 0).sort((a, b) => b.nota - a.nota);

  // Identificar talentos em risco (baixo desempenho + tempo de casa curto)
  const talentosRisco = avaliacoesCompletas
    .filter(a => a.nota_final && a.nota_final < 5)
    .slice(0, 5);

  // High potentials
  const highPotentials = avaliacoesCompletas
    .filter(a => a.nota_final && a.nota_final >= 9)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média de Desempenho</p>
                <p className="text-3xl font-bold">{avgPerformance.toFixed(1)}</p>
              </div>
              <div className={`p-3 rounded-full ${avgPerformance >= 7 ? "bg-green-500/10" : avgPerformance >= 5 ? "bg-yellow-500/10" : "bg-red-500/10"}`}>
                {avgPerformance >= 7 ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
            <Progress value={avgPerformance * 10} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avaliações Completas</p>
                <p className="text-3xl font-bold">{avaliacoesCompletas.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              de {avaliacoes?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Potentials</p>
                <p className="text-3xl font-bold">{highPotentials.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Nota ≥ 9.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Risco</p>
                <p className="text-3xl font-bold">{talentosRisco.length}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Nota &lt; 5.0
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceDistribution.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="range"
                      label={({ range, count }) => `${count}`}
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma avaliação concluída
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tendência de Contratações */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Contratações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="contratacoes"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Setor */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceBySetor.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceBySetor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 10]} className="text-xs" />
                  <YAxis type="category" dataKey="setor" className="text-xs" width={120} />
                  <Tooltip
                    formatter={(value: number) => [value.toFixed(2), "Nota Média"]}
                  />
                  <Bar dataKey="nota" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado de avaliação por setor
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Potentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              High Potentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highPotentials.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{a.employees?.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">{a.employees?.cargo}</p>
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                    {a.nota_final?.toFixed(1)}
                  </Badge>
                </div>
              ))}
              {highPotentials.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum high potential identificado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Talentos em Risco */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {talentosRisco.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-200">
                  <div>
                    <p className="font-medium">{a.employees?.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">{a.employees?.cargo}</p>
                  </div>
                  <Badge variant="destructive">
                    {a.nota_final?.toFixed(1)}
                  </Badge>
                </div>
              ))}
              {talentosRisco.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum funcionário em risco identificado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
