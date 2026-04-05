import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Briefcase, GraduationCap, Target, TrendingUp, Search, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CareerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["career-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .in("status", ["ativo", "ferias"])
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ["career-avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: metas } = useQuery({
    queryKey: ["career-metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_funcionario")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reajustes } = useQuery({
    queryKey: ["career-reajustes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_reajustes_salariais")
        .select("*")
        .order("aplicado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cursos } = useQuery({
    queryKey: ["career-cursos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const filteredEmployees = employees?.filter(e =>
    e.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedEmployeeData = employees?.find(e => e.id === selectedEmployee);

  // Dados do funcionário selecionado
  const employeeAvaliacoes = avaliacoes?.filter(a => a.employee_id === selectedEmployee) || [];
  const employeeMetas = metas?.filter(m => m.employee_id === selectedEmployee) || [];
  const employeeReajustes = reajustes?.filter(r => r.employee_id === selectedEmployee) || [];

  // Calcular progresso de treinamentos
  const calculateTrainingProgress = (employeeId: string) => {
    const totalCursos = cursos?.length || 0;
    if (totalCursos === 0) return 0;
    // Simplified calculation - would need proper logic based on user_id
    return Math.floor(Math.random() * 100); // Placeholder
  };

  // Calcular tempo de casa
  const calculateTenure = (admissionDate: string | null) => {
    if (!admissionDate) return "N/A";
    const years = differenceInYears(new Date(), parseISO(admissionDate));
    return `${years} ano${years !== 1 ? "s" : ""}`;
  };

  // Calcular crescimento salarial
  const calculateSalaryGrowth = (employeeId: string) => {
    const empReajustes = reajustes?.filter(r => r.employee_id === employeeId) || [];
    if (empReajustes.length === 0) return 0;
    const totalGrowth = empReajustes.reduce((sum, r) => sum + (r.percentual_reajuste || 0), 0);
    return totalGrowth;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Funcionários */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Funcionários
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEmployee === employee.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.foto_url || ""} />
                    <AvatarFallback>
                      {employee.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.nome_completo}</p>
                    <p className="text-sm text-muted-foreground truncate">{employee.cargo}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Funcionário */}
        <Card className="lg:col-span-2">
          {selectedEmployeeData ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedEmployeeData.foto_url || ""} />
                    <AvatarFallback className="text-xl">
                      {selectedEmployeeData.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedEmployeeData.nome_completo}</CardTitle>
                    <p className="text-muted-foreground">{selectedEmployeeData.cargo}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{selectedEmployeeData.setor || "Sem setor"}</Badge>
                      <Badge variant="outline">
                        {calculateTenure(selectedEmployeeData.data_admissao)} de casa
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KPIs do Funcionário */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="h-4 w-4" />
                      Última Avaliação
                    </div>
                    <p className="text-2xl font-bold">
                      {employeeAvaliacoes[0]?.nota_final?.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Crescimento Salarial
                    </div>
                    <p className="text-2xl font-bold">
                      {calculateSalaryGrowth(selectedEmployeeData.id).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <GraduationCap className="h-4 w-4" />
                      Treinamentos
                    </div>
                    <p className="text-2xl font-bold">
                      {cursos?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Metas */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Metas Atuais
                  </h3>
                  {employeeMetas.length > 0 ? (
                    <div className="space-y-3">
                      {employeeMetas.slice(0, 3).map((meta) => (
                        <div key={meta.id} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{meta.titulo}</p>
                            <Badge
                              variant={
                                meta.status === "concluida"
                                  ? "default"
                                  : meta.status === "em_andamento"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {meta.status === "concluida" ? "Concluída" : meta.status === "em_andamento" ? "Em Andamento" : "Pendente"}
                            </Badge>
                          </div>
                          <Progress value={meta.percentual_conclusao || 0} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {meta.percentual_conclusao || 0}% concluído
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
                  )}
                </div>

                {/* Histórico de Avaliações */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Histórico de Avaliações
                  </h3>
                  {employeeAvaliacoes.length > 0 ? (
                    <div className="space-y-2">
                      {employeeAvaliacoes.slice(0, 5).map((av) => (
                        <div key={av.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{av.tipo}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(av.periodo_inicio), "MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge
                            className={
                              av.nota_final && av.nota_final >= 8
                                ? "bg-green-500/10 text-green-600"
                                : av.nota_final && av.nota_final >= 6
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-orange-500/10 text-orange-600"
                            }
                          >
                            {av.nota_final?.toFixed(1) || "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada</p>
                  )}
                </div>

                {/* Histórico de Reajustes */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Histórico de Reajustes
                  </h3>
                  {employeeReajustes.length > 0 ? (
                    <div className="space-y-2">
                      {employeeReajustes.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{r.justificativa}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(r.aplicado_em), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge className="bg-green-500/10 text-green-600">
                            +{r.percentual_reajuste?.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum reajuste registrado</p>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um funcionário para ver detalhes</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
