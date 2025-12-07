import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, UserCheck, UserX, Briefcase, TrendingUp, TrendingDown, Clock, Award } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PeopleDashboard() {
  const { data: employees } = useQuery({
    queryKey: ["people-dashboard-employees"],
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
    queryKey: ["people-dashboard-setores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ["people-dashboard-avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*, employees(nome_completo)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const activeEmployees = employees?.filter(e => e.status === "ativo") || [];
  const vacationEmployees = employees?.filter(e => e.status === "ferias") || [];
  const leaveEmployees = employees?.filter(e => e.status === "afastado") || [];
  const terminatedEmployees = employees?.filter(e => e.status === "demitido") || [];

  // Calcular tempo médio de casa
  const avgTenure = activeEmployees.length > 0
    ? activeEmployees.reduce((sum, e) => {
        if (!e.data_admissao) return sum;
        return sum + differenceInDays(new Date(), parseISO(e.data_admissao));
      }, 0) / activeEmployees.length / 365
    : 0;

  // Distribuição por setor
  const sectorDistribution = setores?.map(setor => ({
    nome: setor.nome,
    count: activeEmployees.filter(e => e.setor === setor.nome).length,
  })).filter(s => s.count > 0) || [];

  // Distribuição por tipo de contrato
  const contractDistribution = [
    { tipo: "Fixo", count: activeEmployees.filter(e => e.tipo_contrato === "fixo").length },
    { tipo: "Intermitente", count: activeEmployees.filter(e => e.tipo_contrato === "intermitente").length },
    { tipo: "Prestador", count: activeEmployees.filter(e => e.tipo_contrato === "prestador_servico").length },
  ].filter(c => c.count > 0);

  // Funcionários recentes (últimos 30 dias)
  const recentHires = activeEmployees.filter(e => {
    if (!e.data_admissao) return false;
    return differenceInDays(new Date(), parseISO(e.data_admissao)) <= 30;
  });

  // Top performers (baseado em avaliações)
  const topPerformers = avaliacoes?.filter(a => a.nota_final && a.nota_final >= 8) || [];

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ativos</p>
                <p className="text-3xl font-bold">{activeEmployees.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary">{recentHires.length} novos este mês</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Férias</p>
                <p className="text-3xl font-bold">{vacationEmployees.length}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <UserCheck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={(vacationEmployees.length / (activeEmployees.length || 1)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((vacationEmployees.length / (activeEmployees.length || 1)) * 100).toFixed(1)}% do quadro
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Afastados</p>
                <p className="text-3xl font-bold">{leaveEmployees.length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <UserX className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={(leaveEmployees.length / (activeEmployees.length || 1)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((leaveEmployees.length / (activeEmployees.length || 1)) * 100).toFixed(1)}% do quadro
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio de Casa</p>
                <p className="text-3xl font-bold">{avgTenure.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">anos</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Setor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Distribuição por Setor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sectorDistribution.map((sector, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{sector.nome}</span>
                  <span className="font-medium">{sector.count}</span>
                </div>
                <Progress 
                  value={(sector.count / activeEmployees.length) * 100} 
                  className="h-2"
                />
              </div>
            ))}
            {sectorDistribution.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum setor configurado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contratações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Contratações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentHires.slice(0, 5).map((employee) => (
                <div key={employee.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.foto_url || ""} />
                    <AvatarFallback>
                      {employee.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{employee.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{employee.cargo}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {employee.data_admissao && format(parseISO(employee.data_admissao), "dd/MM", { locale: ptBR })}
                  </Badge>
                </div>
              ))}
              {recentHires.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma contratação nos últimos 30 dias
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.slice(0, 5).map((avaliacao) => (
                <div key={avaliacao.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-500/10">
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {avaliacao.employees?.nome_completo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Nota: {avaliacao.nota_final?.toFixed(1)}
                    </p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">
                    Excelente
                  </Badge>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma avaliação com nota alta encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo de Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Tipo de Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contractDistribution.map((contract, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{contract.count}</p>
                <p className="text-sm text-muted-foreground">{contract.tipo}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((contract.count / activeEmployees.length) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
