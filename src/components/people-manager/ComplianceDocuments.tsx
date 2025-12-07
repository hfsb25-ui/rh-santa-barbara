import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { FileCheck, AlertTriangle, CheckCircle2, Clock, Search, FileText, Shield, Users } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ComplianceDocuments() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["compliance-employees"],
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

  const { data: encaminhamentos } = useQuery({
    queryKey: ["compliance-encaminhamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encaminhamentos_medicos")
        .select("*, employees(nome_completo)")
        .order("data_encaminhamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: epis } = useQuery({
    queryKey: ["compliance-epis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epis")
        .select("*, employees(nome_completo)")
        .order("data_entrega", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: uniformes } = useQuery({
    queryKey: ["compliance-uniformes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uniformes")
        .select("*, employees(nome_completo)")
        .order("data_entrega", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: checklists } = useQuery({
    queryKey: ["compliance-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_checklist_funcionario")
        .select("*, employees(nome_completo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: employeeFiles } = useQuery({
    queryKey: ["compliance-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_files")
        .select("*, employees(nome_completo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Métricas de compliance
  const totalEmployees = employees?.length || 0;

  // Exames médicos pendentes ou vencidos
  const examsPending = encaminhamentos?.filter(e => e.status === "pendente").length || 0;
  const examsCompleted = encaminhamentos?.filter(e => e.status === "realizado").length || 0;

  // EPIs sem assinatura
  const episWithoutSignature = epis?.filter(e => !e.assinatura_funcionario).length || 0;
  const episSigned = epis?.filter(e => e.assinatura_funcionario).length || 0;

  // Uniformes sem assinatura
  const uniformesWithoutSignature = uniformes?.filter(u => !u.assinatura_funcionario).length || 0;
  const uniformesSigned = uniformes?.filter(u => u.assinatura_funcionario).length || 0;

  // Checklists pendentes
  const checklistsPending = checklists?.filter(c => c.status === "em_andamento").length || 0;
  const checklistsCompleted = checklists?.filter(c => c.status === "concluido").length || 0;

  // Funcionários sem documentos
  const employeesWithFiles = new Set(employeeFiles?.map(f => f.employee_id)).size;
  const employeesWithoutFiles = totalEmployees - employeesWithFiles;

  // Score geral de compliance
  const complianceItems = [
    { completed: examsCompleted, pending: examsPending },
    { completed: episSigned, pending: episWithoutSignature },
    { completed: uniformesSigned, pending: uniformesWithoutSignature },
    { completed: checklistsCompleted, pending: checklistsPending },
  ];
  
  const totalCompleted = complianceItems.reduce((sum, item) => sum + item.completed, 0);
  const totalPending = complianceItems.reduce((sum, item) => sum + item.pending, 0);
  const complianceScore = totalCompleted + totalPending > 0 
    ? (totalCompleted / (totalCompleted + totalPending)) * 100 
    : 100;

  // Alertas críticos
  const criticalAlerts = [
    ...(examsPending > 0 ? [{ type: "danger", message: `${examsPending} exame(s) médico(s) pendente(s)` }] : []),
    ...(episWithoutSignature > 0 ? [{ type: "warning", message: `${episWithoutSignature} EPI(s) sem assinatura` }] : []),
    ...(uniformesWithoutSignature > 0 ? [{ type: "warning", message: `${uniformesWithoutSignature} uniforme(s) sem assinatura` }] : []),
    ...(checklistsPending > 0 ? [{ type: "info", message: `${checklistsPending} checklist(s) em andamento` }] : []),
    ...(employeesWithoutFiles > 0 ? [{ type: "info", message: `${employeesWithoutFiles} funcionário(s) sem documentos` }] : []),
  ];

  // Filtrar funcionários
  const filteredEmployees = employees?.filter(e =>
    e.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Verificar compliance de cada funcionário
  const getEmployeeCompliance = (employeeId: string) => {
    const hasExam = encaminhamentos?.some(e => e.employee_id === employeeId && e.status === "realizado");
    const hasSignedEpi = epis?.some(e => e.employee_id === employeeId && e.assinatura_funcionario);
    const hasSignedUniform = uniformes?.some(u => u.employee_id === employeeId && u.assinatura_funcionario);
    const hasCompletedChecklist = checklists?.some(c => c.employee_id === employeeId && c.status === "concluido");
    const hasFiles = employeeFiles?.some(f => f.employee_id === employeeId);

    const completed = [hasExam, hasSignedEpi, hasSignedUniform, hasCompletedChecklist, hasFiles].filter(Boolean).length;
    return (completed / 5) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Score de Compliance */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Score de Compliance Geral</p>
              <p className="text-4xl font-bold">{complianceScore.toFixed(0)}%</p>
            </div>
            <div className={`p-4 rounded-full ${complianceScore >= 80 ? "bg-green-500/20" : complianceScore >= 60 ? "bg-yellow-500/20" : "bg-red-500/20"}`}>
              <Shield className={`h-8 w-8 ${complianceScore >= 80 ? "text-green-500" : complianceScore >= 60 ? "text-yellow-500" : "text-red-500"}`} />
            </div>
          </div>
          <Progress value={complianceScore} className="mt-4 h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {totalCompleted} itens em conformidade de {totalCompleted + totalPending} total
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${examsPending > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                <FileCheck className={`h-5 w-5 ${examsPending > 0 ? "text-red-500" : "text-green-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exames Médicos</p>
                <p className="font-bold">{examsCompleted} / {examsCompleted + examsPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${episWithoutSignature > 0 ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                <CheckCircle2 className={`h-5 w-5 ${episWithoutSignature > 0 ? "text-yellow-500" : "text-green-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">EPIs Assinados</p>
                <p className="font-bold">{episSigned} / {episSigned + episWithoutSignature}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${uniformesWithoutSignature > 0 ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                <CheckCircle2 className={`h-5 w-5 ${uniformesWithoutSignature > 0 ? "text-yellow-500" : "text-green-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uniformes Assinados</p>
                <p className="font-bold">{uniformesSigned} / {uniformesSigned + uniformesWithoutSignature}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${checklistsPending > 0 ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                <Clock className={`h-5 w-5 ${checklistsPending > 0 ? "text-blue-500" : "text-green-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checklists</p>
                <p className="font-bold">{checklistsCompleted} / {checklistsCompleted + checklistsPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${employeesWithoutFiles > 0 ? "bg-orange-500/10" : "bg-green-500/10"}`}>
                <FileText className={`h-5 w-5 ${employeesWithoutFiles > 0 ? "text-orange-500" : "text-green-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com Documentos</p>
                <p className="font-bold">{employeesWithFiles} / {totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas de Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length > 0 ? (
              <div className="space-y-3">
                {criticalAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      alert.type === "danger" ? "bg-red-500/10" :
                      alert.type === "warning" ? "bg-yellow-500/10" :
                      "bg-blue-500/10"
                    }`}
                  >
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.type === "danger" ? "text-red-500" :
                      alert.type === "warning" ? "text-yellow-500" :
                      "text-blue-500"
                    }`} />
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground">Tudo em conformidade!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status por Funcionário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Compliance por Funcionário
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
          <CardContent className="max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              {filteredEmployees.slice(0, 10).map((employee) => {
                const compliance = getEmployeeCompliance(employee.id);
                return (
                  <div key={employee.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{employee.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">{employee.cargo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={compliance} className="w-24 h-2" />
                      <Badge
                        variant={
                          compliance >= 80 ? "default" :
                          compliance >= 60 ? "secondary" :
                          "destructive"
                        }
                      >
                        {compliance.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeeFiles && employeeFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeFiles.slice(0, 6).map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.employees?.nome_completo} • {format(parseISO(file.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhum documento encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
