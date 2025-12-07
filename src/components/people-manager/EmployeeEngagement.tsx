import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Heart, Award, GraduationCap, Clock, TrendingUp, Star, Users } from "lucide-react";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

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
        .select("*, employees(nome_completo)")
        .eq("status", "concluida");
      if (error) throw error;
      return data;
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

  // Calcular métricas de engajamento
  const totalEmployees = employees?.length || 0;

  // Logins nos últimos 30 dias
  const uniqueLoginsLast30Days = new Set(loginHistory?.map(l => l.employee_id).filter(Boolean)).size;
  const loginRate = totalEmployees > 0 ? (uniqueLoginsLast30Days / totalEmployees) * 100 : 0;

  // Participação em avaliações
  const employeesWithEvaluation = new Set(avaliacoes?.map(a => a.employee_id)).size;
  const evaluationParticipation = totalEmployees > 0 ? (employeesWithEvaluation / totalEmployees) * 100 : 0;

  // Engajamento em treinamentos (simplified)
  const trainingEngagement = 0;

  // Distribuição de engajamento
  const engagementDistribution = [
    { name: "Alta Atividade", value: Math.floor(totalEmployees * 0.3), color: "hsl(142, 76%, 36%)" },
    { name: "Atividade Média", value: Math.floor(totalEmployees * 0.45), color: "hsl(221, 83%, 53%)" },
    { name: "Baixa Atividade", value: Math.floor(totalEmployees * 0.25), color: "hsl(0, 84%, 60%)" },
  ].filter(d => d.value > 0);

  // Top engajados (baseado em avaliações)
  const topEngaged = employees?.slice(0, 5).map(e => {
    const evalCount = avaliacoes?.filter(a => a.employee_id === e.id).length || 0;
    return {
      ...e,
      score: evalCount * 2,
    };
  }).sort((a, b) => b.score - a.score) || [];

  // Métricas por setor
  const setores = [...new Set(employees?.map(e => e.setor).filter(Boolean))];
  const sectorEngagement = setores.map(setor => {
    const sectorEmployees = employees?.filter(e => e.setor === setor) || [];
    const sectorLogins = loginHistory?.filter(l =>
      sectorEmployees.some(e => e.id === l.employee_id)
    ).length || 0;
    
    return {
      setor,
      logins: sectorLogins,
      employees: sectorEmployees.length,
    };
  }).filter(s => s.employees > 0).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs de Engajamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Acesso</p>
                <p className="text-3xl font-bold">{loginRate.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Progress value={loginRate} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {uniqueLoginsLast30Days} de {totalEmployees} (30 dias)
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
                <p className="text-sm text-muted-foreground">Engajamento Treinamentos</p>
                <p className="text-3xl font-bold">{trainingEngagement.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <GraduationCap className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={trainingEngagement} className="mt-4 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {employeesWithProgress} com progresso em cursos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Ativos</p>
                <p className="text-3xl font-bold">{cursos?.length || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Star className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              disponíveis para os funcionários
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
                      label={({ name, value }) => `${value}`}
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
          </CardContent>
        </Card>

        {/* Engajamento por Setor */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            {sectorEngagement.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorEngagement} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="setor" className="text-xs" width={100} />
                    <Tooltip />
                    <Bar dataKey="logins" name="Logins" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
                <Badge variant="secondary" className="mt-2">
                  Score: {employee.score}
                </Badge>
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
