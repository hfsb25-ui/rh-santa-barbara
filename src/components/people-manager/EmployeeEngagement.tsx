import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Heart, Award, GraduationCap, Clock, TrendingUp, FileWarning, Users } from "lucide-react";
import { differenceInDays, parseISO, subDays } from "date-fns";

interface EmployeeEngagementScore {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  foto_url: string | null;
  loginScore: number;
  avaliacaoScore: number;
  treinamentoScore: number;
  tacScore: number;
  totalScore: number;
  category: "alta" | "media" | "baixa";
}

export default function EmployeeEngagement() {
  const { data: employees } = useQuery({
    queryKey: ["engagement-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "ativo")
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const { data: loginHistory } = useQuery({
    queryKey: ["engagement-login-history"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .gte("login_at", thirtyDaysAgo);
      if (error) throw error;
      return data;
    },
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ["engagement-avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*")
        .eq("status", "concluida");
      if (error) throw error;
      return data;
    },
  });

  const { data: certificados } = useQuery({
    queryKey: ["engagement-certificados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificados_liberados")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tacs } = useQuery({
    queryKey: ["engagement-tacs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tacs")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cursos } = useQuery({
    queryKey: ["engagement-cursos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Calcular scores de engajamento por funcionário
  const calculateEngagementScores = (): EmployeeEngagementScore[] => {
    if (!employees) return [];

    const maxLogins = Math.max(
      1,
      ...employees.map(e => loginHistory?.filter(l => l.employee_id === e.id).length || 0)
    );
    const maxAvaliacoes = Math.max(
      1,
      ...employees.map(e => avaliacoes?.filter(a => a.employee_id === e.id).length || 0)
    );
    const maxCertificados = Math.max(
      1,
      ...employees.map(e => certificados?.filter(c => c.employee_id === e.id).length || 0)
    );

    return employees.map(employee => {
      // Score de Logins (30%) - baseado em quantidade de logins nos últimos 30 dias
      const employeeLogins = loginHistory?.filter(l => l.employee_id === employee.id).length || 0;
      const loginScore = (employeeLogins / maxLogins) * 100;

      // Score de Avaliações (25%) - baseado em participação e notas
      const employeeAvaliacoes = avaliacoes?.filter(a => a.employee_id === employee.id) || [];
      const avaliacaoCount = employeeAvaliacoes.length;
      const avgNota = employeeAvaliacoes.length > 0
        ? employeeAvaliacoes.reduce((sum, a) => sum + (a.nota_final || 0), 0) / employeeAvaliacoes.length
        : 0;
      const avaliacaoScore = maxAvaliacoes > 0
        ? ((avaliacaoCount / maxAvaliacoes) * 50) + ((avgNota / 10) * 50)
        : 0;

      // Score de Treinamentos (25%) - baseado em certificados concluídos
      const employeeCertificados = certificados?.filter(c => c.employee_id === employee.id).length || 0;
      const treinamentoScore = maxCertificados > 0 ? (employeeCertificados / maxCertificados) * 100 : 0;

      // Score de TACs (20%) - baseado em confirmação de TACs
      const employeeTacs = tacs?.filter(t => t.employee_id === employee.id) || [];
      const tacsConfirmados = employeeTacs.filter(t => t.confirmado_em).length;
      const tacsPendentes = employeeTacs.filter(t => !t.confirmado_em).length;
      const tacScore = employeeTacs.length > 0
        ? (tacsConfirmados / employeeTacs.length) * 100
        : 100; // Se não tem TACs, considera como 100%

      // Penalizar por TACs pendentes antigos
      const tacPenalty = tacsPendentes > 0 ? Math.min(tacsPendentes * 10, 30) : 0;
      const adjustedTacScore = Math.max(0, tacScore - tacPenalty);

      // Score Total ponderado
      const totalScore = (loginScore * 0.30) + (avaliacaoScore * 0.25) + (treinamentoScore * 0.25) + (adjustedTacScore * 0.20);

      // Categoria baseada no score
      let category: "alta" | "media" | "baixa";
      if (totalScore >= 70) {
        category = "alta";
      } else if (totalScore >= 40) {
        category = "media";
      } else {
        category = "baixa";
      }

      return {
        id: employee.id,
        nome_completo: employee.nome_completo,
        cargo: employee.cargo,
        setor: employee.setor,
        foto_url: employee.foto_url,
        loginScore,
        avaliacaoScore,
        treinamentoScore,
        tacScore: adjustedTacScore,
        totalScore,
        category,
      };
    });
  };

  const engagementScores = calculateEngagementScores();
  const totalEmployees = employees?.length || 0;

  // Distribuição real de engajamento
  const altaAtividade = engagementScores.filter(e => e.category === "alta").length;
  const mediaAtividade = engagementScores.filter(e => e.category === "media").length;
  const baixaAtividade = engagementScores.filter(e => e.category === "baixa").length;

  const engagementDistribution = [
    { name: "Alta Atividade (≥70%)", value: altaAtividade, color: "hsl(142, 76%, 36%)" },
    { name: "Atividade Média (40-69%)", value: mediaAtividade, color: "hsl(221, 83%, 53%)" },
    { name: "Baixa Atividade (<40%)", value: baixaAtividade, color: "hsl(0, 84%, 60%)" },
  ].filter(d => d.value > 0);

  // Top 5 engajados
  const topEngaged = [...engagementScores].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

  // KPIs
  const uniqueLoginsLast30Days = new Set(loginHistory?.map(l => l.employee_id).filter(Boolean)).size;
  const loginRate = totalEmployees > 0 ? (uniqueLoginsLast30Days / totalEmployees) * 100 : 0;
  
  const employeesWithEvaluation = new Set(avaliacoes?.map(a => a.employee_id)).size;
  const evaluationParticipation = totalEmployees > 0 ? (employeesWithEvaluation / totalEmployees) * 100 : 0;

  const employeesWithCertificado = new Set(certificados?.map(c => c.employee_id)).size;
  const trainingEngagement = totalEmployees > 0 ? (employeesWithCertificado / totalEmployees) * 100 : 0;

  const tacsConfirmados = tacs?.filter(t => t.confirmado_em).length || 0;
  const totalTacs = tacs?.length || 0;
  const tacConfirmationRate = totalTacs > 0 ? (tacsConfirmados / totalTacs) * 100 : 100;

  // Métricas por setor
  const setores = [...new Set(employees?.map(e => e.setor).filter(Boolean))];
  const sectorEngagement = setores.map(setor => {
    const sectorScores = engagementScores.filter(e => e.setor === setor);
    const avgScore = sectorScores.length > 0
      ? sectorScores.reduce((sum, e) => sum + e.totalScore, 0) / sectorScores.length
      : 0;
    
    return {
      setor,
      score: Math.round(avgScore),
      employees: sectorScores.length,
    };
  }).filter(s => s.employees > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs de Engajamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Acesso (30d)</p>
                <p className="text-3xl font-bold">{loginRate.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Progress value={loginRate} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {uniqueLoginsLast30Days} de {totalEmployees} funcionários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Participação Avaliações</p>
                <p className="text-3xl font-bold">{evaluationParticipation.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <Progress value={evaluationParticipation} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {employeesWithEvaluation} funcionários avaliados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Concluídos</p>
                <p className="text-3xl font-bold">{trainingEngagement.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <GraduationCap className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={trainingEngagement} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {employeesWithCertificado} com certificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">TACs Confirmados</p>
                <p className="text-3xl font-bold">{tacConfirmationRate.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <FileWarning className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <Progress value={tacConfirmationRate} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {tacsConfirmados} de {totalTacs} TACs
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Engajamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Distribuição de Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {engagementDistribution.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engagementDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ value }) => `${value}`}
                    >
                      {engagementDistribution.map((entry, index) => (
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
                Dados insuficientes
              </div>
            )}
            <div className="mt-4 flex justify-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
                Alta: {altaAtividade}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(221, 83%, 53%)" }} />
                Média: {mediaAtividade}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
                Baixa: {baixaAtividade}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Engajamento por Setor */}
        <Card>
          <CardHeader>
            <CardTitle>Score Médio por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            {sectorEngagement.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorEngagement} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" />
                    <YAxis type="category" dataKey="setor" className="text-xs" width={100} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, "Score"]}
                      labelFormatter={(label) => `Setor: ${label}`}
                    />
                    <Bar 
                      dataKey="score" 
                      name="Score" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Dados insuficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funcionários Mais Engajados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Funcionários Mais Engajados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topEngaged.map((employee, index) => (
              <div key={employee.id} className="flex flex-col items-center p-4 rounded-lg bg-muted/50 text-center">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={employee.foto_url || ""} />
                    <AvatarFallback>
                      {employee.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {index < 3 && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-yellow-500 text-white" :
                      index === 1 ? "bg-gray-400 text-white" :
                      "bg-orange-600 text-white"
                    }`}>
                      {index + 1}
                    </div>
                  )}
                </div>
                <p className="font-medium mt-2 truncate w-full">{employee.nome_completo?.split(" ")[0]}</p>
                <p className="text-xs text-muted-foreground truncate w-full">{employee.cargo}</p>
                <Badge 
                  variant={employee.category === "alta" ? "default" : employee.category === "media" ? "secondary" : "destructive"}
                  className="mt-2"
                >
                  {employee.totalScore.toFixed(0)}%
                </Badge>
                <div className="mt-2 text-xs text-muted-foreground space-y-1 w-full">
                  <div className="flex justify-between">
                    <span>Logins:</span>
                    <span>{employee.loginScore.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aval.:</span>
                    <span>{employee.avaliacaoScore.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Treino:</span>
                    <span>{employee.treinamentoScore.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TACs:</span>
                    <span>{employee.tacScore.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Retenção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
              <Clock className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold">
              {employees?.filter(e => {
                if (!e.data_admissao) return false;
                return differenceInDays(new Date(), parseISO(e.data_admissao)) > 365;
              }).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Funcionários +1 ano</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mb-3">
              <Award className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">
              {avaliacoes?.filter(a => a.nota_final && a.nota_final >= 7).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Avaliações Positivas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-3">
              <GraduationCap className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">
              {cursos?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Cursos Disponíveis</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
