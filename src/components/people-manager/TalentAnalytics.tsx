import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle, Clock, BookOpen, FileWarning, LogIn } from "lucide-react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface RiskFactor {
  type: "avaliacao" | "faltas" | "tacs" | "engajamento" | "treinamento";
  label: string;
  weight: number;
  value: number;
  details: string;
}

interface EmployeeRisk {
  employeeId: string;
  employeeName: string;
  cargo: string;
  setor: string;
  riskScore: number;
  priority: "alta" | "media" | "baixa";
  factors: RiskFactor[];
}

export default function TalentAnalytics() {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const ninetyDaysAgo = subDays(today, 90);

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

  const { data: faltas } = useQuery({
    queryKey: ["talent-analytics-faltas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faltas")
        .select("*")
        .gte("data", format(ninetyDaysAgo, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  const { data: tacs } = useQuery({
    queryKey: ["talent-analytics-tacs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tacs")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: loginHistory } = useQuery({
    queryKey: ["talent-analytics-logins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .gte("login_at", thirtyDaysAgo.toISOString());
      if (error) throw error;
      return data;
    },
  });

  const { data: certificados } = useQuery({
    queryKey: ["talent-analytics-certificados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificados_liberados")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeEmployees = employees?.filter(e => e.status === "ativo") || [];
  const cursosObrigatorios = cursos?.filter(c => c.obrigatorio) || [];

  // Calculate risk scores for all active employees
  const calculateEmployeeRisks = (): EmployeeRisk[] => {
    if (!activeEmployees.length) return [];

    const risks: EmployeeRisk[] = [];

    activeEmployees.forEach(employee => {
      const factors: RiskFactor[] = [];
      let totalWeightedScore = 0;

      // 1. Avaliação (30%) - nota_final < 5.0
      const employeeAvaliacoes = avaliacoes?.filter(
        a => a.employee_id === employee.id && a.status === "concluida"
      ) || [];
      const latestAvaliacao = employeeAvaliacoes[0];
      
      if (latestAvaliacao && latestAvaliacao.nota_final !== null) {
        const notaFinal = latestAvaliacao.nota_final;
        if (notaFinal < 5) {
          const riskValue = ((5 - notaFinal) / 5) * 100;
          factors.push({
            type: "avaliacao",
            label: "Baixo Desempenho",
            weight: 30,
            value: riskValue,
            details: `Nota: ${notaFinal.toFixed(1)} (última avaliação)`,
          });
          totalWeightedScore += riskValue * 0.3;
        }
      }

      // 2. Faltas (20%) - > 3 faltas não justificadas em 90 dias
      const employeeFaltas = faltas?.filter(
        f => f.employee_id === employee.id && !f.justificada
      ) || [];
      
      if (employeeFaltas.length > 3) {
        const riskValue = Math.min((employeeFaltas.length / 10) * 100, 100);
        factors.push({
          type: "faltas",
          label: "Faltas Frequentes",
          weight: 20,
          value: riskValue,
          details: `${employeeFaltas.length} faltas não justificadas (90 dias)`,
        });
        totalWeightedScore += riskValue * 0.2;
      }

      // 3. TACs (20%) - TACs pendentes há mais de 7 dias
      const employeeTacs = tacs?.filter(
        t => t.employee_id === employee.id && t.status !== "confirmado"
      ) || [];
      
      const tacsPendentes = employeeTacs.filter(t => {
        const createdAt = parseISO(t.created_at);
        return differenceInDays(today, createdAt) > 7;
      });

      if (tacsPendentes.length > 0) {
        const riskValue = Math.min((tacsPendentes.length / 3) * 100, 100);
        factors.push({
          type: "tacs",
          label: "TACs Pendentes",
          weight: 20,
          value: riskValue,
          details: `${tacsPendentes.length} TAC(s) sem confirmação há +7 dias`,
        });
        totalWeightedScore += riskValue * 0.2;
      }

      // 4. Engajamento (15%) - Zero logins em 30 dias
      const employeeLogins = loginHistory?.filter(
        l => l.employee_id === employee.id
      ) || [];

      if (employee.user_id && employeeLogins.length === 0) {
        factors.push({
          type: "engajamento",
          label: "Sem Acesso ao Sistema",
          weight: 15,
          value: 100,
          details: "Nenhum login nos últimos 30 dias",
        });
        totalWeightedScore += 100 * 0.15;
      }

      // 5. Treinamentos (15%) - Cursos obrigatórios não concluídos
      const employeeCertificados = certificados?.filter(
        c => c.employee_id === employee.id
      ) || [];
      
      const cursosNaoConcluidos = cursosObrigatorios.filter(curso => {
        const hasCertificado = employeeCertificados.some(c => c.curso_id === curso.id);
        // Check if course applies to employee (by setor or funcao)
        const appliesBySetor = !curso.setor_id || employee.setor === curso.setor_id;
        const appliesByFuncao = !curso.funcao_id || employee.cargo === curso.funcao_id;
        return (appliesBySetor || appliesByFuncao) && !hasCertificado;
      });

      if (cursosNaoConcluidos.length > 0) {
        const riskValue = Math.min((cursosNaoConcluidos.length / 3) * 100, 100);
        factors.push({
          type: "treinamento",
          label: "Treinamentos Pendentes",
          weight: 15,
          value: riskValue,
          details: `${cursosNaoConcluidos.length} curso(s) obrigatório(s) não concluído(s)`,
        });
        totalWeightedScore += riskValue * 0.15;
      }

      // Only add if there are risk factors
      if (factors.length > 0 && totalWeightedScore >= 20) {
        let priority: "alta" | "media" | "baixa" = "baixa";
        if (totalWeightedScore >= 70) priority = "alta";
        else if (totalWeightedScore >= 40) priority = "media";

        risks.push({
          employeeId: employee.id,
          employeeName: employee.nome_completo,
          cargo: employee.cargo,
          setor: employee.setor || "N/A",
          riskScore: totalWeightedScore,
          priority,
          factors,
        });
      }
    });

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  };

  const employeeRisks = calculateEmployeeRisks();
  const highRiskCount = employeeRisks.filter(r => r.priority === "alta").length;
  const mediumRiskCount = employeeRisks.filter(r => r.priority === "media").length;
  const lowRiskCount = employeeRisks.filter(r => r.priority === "baixa").length;

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

  // High potentials
  const highPotentials = avaliacoesCompletas
    .filter(a => a.nota_final && a.nota_final >= 9)
    .slice(0, 5);

  const getRiskIcon = (type: string) => {
    switch (type) {
      case "avaliacao": return <Target className="h-3 w-3" />;
      case "faltas": return <Clock className="h-3 w-3" />;
      case "tacs": return <FileWarning className="h-3 w-3" />;
      case "engajamento": return <LogIn className="h-3 w-3" />;
      case "treinamento": return <BookOpen className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "bg-red-500/10 text-red-600 border-red-200";
      case "media": return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "baixa": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "alta": return "Alta Prioridade";
      case "media": return "Média Prioridade";
      case "baixa": return "Baixa Prioridade";
      default: return priority;
    }
  };

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
                <p className="text-sm text-muted-foreground">Atenção Necessária</p>
                <p className="text-3xl font-bold">{employeeRisks.length}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {highRiskCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                  {highRiskCount} alta
                </Badge>
              )}
              {mediumRiskCount > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs">
                  {mediumRiskCount} média
                </Badge>
              )}
              {lowRiskCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-xs">
                  {lowRiskCount} baixa
                </Badge>
              )}
            </div>
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

        {/* Atenção Necessária - Inteligente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Atenção Necessária
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Análise baseada em avaliações, faltas, TACs, engajamento e treinamentos
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {employeeRisks.slice(0, 10).map((risk) => (
                <div 
                  key={risk.employeeId} 
                  className={`p-3 rounded-lg border ${
                    risk.priority === "alta" 
                      ? "bg-red-500/5 border-red-200" 
                      : risk.priority === "media"
                      ? "bg-orange-500/5 border-orange-200"
                      : "bg-yellow-500/5 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{risk.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {risk.cargo} • {risk.setor}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={getPriorityColor(risk.priority)}>
                        {getPriorityLabel(risk.priority)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Score: {risk.riskScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    <TooltipProvider>
                      {risk.factors.map((factor, idx) => (
                        <UITooltip key={idx}>
                          <TooltipTrigger>
                            <Badge 
                              variant="outline" 
                              className="text-xs flex items-center gap-1 cursor-help"
                            >
                              {getRiskIcon(factor.type)}
                              {factor.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{factor.label}</p>
                            <p className="text-xs">{factor.details}</p>
                            <p className="text-xs text-muted-foreground">Peso: {factor.weight}%</p>
                          </TooltipContent>
                        </UITooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              ))}
              {employeeRisks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum funcionário em risco identificado
                </p>
              )}
              {employeeRisks.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  +{employeeRisks.length - 10} funcionários adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
