import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserCircle,
  LogOut,
  Shield,
  Shirt,
  Bell,
  Calendar,
  Clock,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { VacationProgress } from "@/components/ui/vacation-progress";
import PendingSignaturesAlert from "./PendingSignaturesAlert";
import { TreinamentosCard } from "./TreinamentosCard";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FuncionarioDashboardProps {
  user: User;
}

const FuncionarioDashboard = ({ user }: FuncionarioDashboardProps) => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [epis, setEpis] = useState<any[]>([]);
  const [uniformes, setUniformes] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [activeVacation, setActiveVacation] = useState<any>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [horasMesAnterior, setHorasMesAnterior] = useState<number | null>(null);
  const [bancoHoras, setBancoHoras] = useState<number>(0);

  useEffect(() => {
    fetchEmployeeData();
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empData) {
        setEmployee(empData);

        const [episRes, uniformesRes, avisosRes, feriasRes, companyRes] = await Promise.all([
          supabase.from("epis").select("*").eq("employee_id", empData.id),
          supabase.from("uniformes").select("*").eq("employee_id", empData.id),
          supabase
            .from("avisos")
            .select("*")
            .contains("setores", [empData.setor])
            .gte("data_expiracao", new Date().toISOString().split("T")[0])
            .order("created_at", { ascending: false }),
          supabase
            .from("ferias")
            .select("*")
            .eq("employee_id", empData.id)
            .eq("data_retorno_confirmada", false)
            .gte("periodo_gozo_fim", new Date().toISOString().split("T")[0])
            .order("periodo_gozo_inicio", { ascending: false })
            .limit(1)
            .maybeSingle(),
          empData.empresa_id 
            ? supabase.from("empresas").select("logo_url").eq("id", empData.empresa_id).maybeSingle()
            : Promise.resolve({ data: null })
        ]);

        setEpis(episRes.data || []);
        setUniformes(uniformesRes.data || []);
        setAvisos(avisosRes.data || []);
        setActiveVacation(feriasRes.data || null);
        setCompanyLogo(companyRes.data?.logo_url || null);

        // Buscar horas do mês anterior
        const mesAnterior = subMonths(new Date(), 1);
        const startDate = format(startOfMonth(mesAnterior), "yyyy-MM-dd");
        const endDate = format(endOfMonth(mesAnterior), "yyyy-MM-dd");

        const { data: registrosMesAnterior } = await supabase
          .from("registros_ponto")
          .select("*")
          .eq("employee_id", empData.id)
          .gte("data", startDate)
          .lte("data", endDate);

        const { data: config } = await supabase
          .from("configuracao_horas_trabalho")
          .select("*")
          .eq("employee_id", empData.id)
          .maybeSingle();

        if (registrosMesAnterior) {
          const horasDiarias = config?.horas_diarias_esperadas || 8.00;
          const diasUteis = registrosMesAnterior.filter(r => r.tipo_dia === "normal").length;
          const horasEsperadas = diasUteis * horasDiarias;
          const horasTrabalhadas = registrosMesAnterior.reduce((sum, r) => sum + (r.horas_trabalhadas || 0), 0);
          const saldo = horasTrabalhadas - horasEsperadas;
          setHorasMesAnterior(saldo);
        }

        // Buscar banco de horas
        const { data: bancoData } = await supabase
          .from("banco_horas")
          .select("*")
          .eq("employee_id", empData.id)
          .maybeSingle();

        setBancoHoras(bancoData?.saldo_horas || 0);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const calculateVacationProgress = () => {
    if (!activeVacation) return null;

    const startDate = new Date(activeVacation.periodo_gozo_inicio);
    const endDate = new Date(activeVacation.periodo_gozo_fim);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = activeVacation.dias_totais - daysPassed;

    const progress = Math.min(100, Math.max(0, (daysPassed / activeVacation.dias_totais) * 100));
    
    const realVacationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const timeOffDays = activeVacation.dias_totais - realVacationDays;

    return { 
      progress, 
      daysRemaining: Math.max(0, daysRemaining), 
      totalDays: activeVacation.dias_totais,
      vacationDays: realVacationDays,
      timeOffDays 
    };
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/auth");
    }
  };


  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PendingSignaturesAlert />
      
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <div className="w-10 h-10 flex items-center justify-center">
                <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">Meu Painel</h1>
              <p className="text-sm text-muted-foreground">{employee.nome_completo}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Vacation Progress */}
          {activeVacation && (() => {
            const vacationProgress = calculateVacationProgress();
            if (vacationProgress && vacationProgress.daysRemaining > 0) {
              return (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Férias em Andamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Retorno previsto</span>
                      <span className="font-medium">
                        {new Date(activeVacation.periodo_gozo_fim).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dias restantes</span>
                        <span className="font-bold text-lg">
                          {vacationProgress.daysRemaining} {vacationProgress.daysRemaining === 1 ? 'dia' : 'dias'}
                        </span>
                      </div>
                      <VacationProgress 
                        totalDays={vacationProgress.totalDays}
                        daysPassed={vacationProgress.totalDays - vacationProgress.daysRemaining}
                        vacationDays={vacationProgress.vacationDays}
                        timeOffDays={vacationProgress.timeOffDays}
                        className="h-3"
                      />
                      {vacationProgress.timeOffDays > 0 && (
                        <div className="flex gap-2 text-xs text-muted-foreground justify-center">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-secondary" />
                            <span>Férias ({vacationProgress.vacationDays})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-warning" />
                            <span>Folgas ({vacationProgress.timeOffDays})</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        {Math.round(vacationProgress.progress)}% concluído
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          {/* Avisos */}
          {avisos.length > 0 && (
            <div className="space-y-3">
              {avisos.map((aviso) => (
                <Alert key={aviso.id} className="border-primary bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                  <AlertTitle className="font-semibold text-lg">Aviso Importante</AlertTitle>
                  <AlertDescription className="text-base mt-2">
                    {aviso.mensagem}
                    <p className="text-xs text-muted-foreground mt-2">
                      Válido até: {new Date(aviso.data_expiracao).toLocaleDateString("pt-BR")}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Cards de Horas */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Horas do Mês Anterior */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Saldo de Horas - Mês Anterior
                </CardTitle>
              </CardHeader>
              <CardContent>
                {horasMesAnterior !== null ? (
                  <div className="space-y-2">
                    <div className={`text-3xl font-bold ${
                      horasMesAnterior > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : horasMesAnterior < 0 
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    }`}>
                      {horasMesAnterior > 0 ? '+' : ''}{horasMesAnterior.toFixed(2)}h
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(subMonths(new Date(), 1), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Sem registros
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Banco de Horas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Banco de Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${
                    bancoHoras > 0 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}>
                    {bancoHoras.toFixed(2)}h
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Horas acumuladas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card de Folgas */}
          <Card>
            <CardHeader>
              <CardTitle>Folgas Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {employee.quantidade_folgas || 0} folgas
              </div>
            </CardContent>
          </Card>

          {/* Treinamentos */}
          <TreinamentosCard employeeId={employee.id} />

          {/* EPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                EPIs Recebidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {epis.length === 0 ? (
                <p className="text-muted-foreground">Nenhum EPI registrado.</p>
              ) : (
                <div className="space-y-3">
                  {epis.map((epi) => (
                    <div key={epi.id} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{epi.tipo_epi}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Qtd: {epi.quantidade}</span>
                        <span>
                          Data: {new Date(epi.data_entrega).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {epi.observacoes && (
                        <p className="text-sm mt-1">{epi.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Uniformes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                Uniformes Recebidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uniformes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum uniforme registrado.</p>
              ) : (
                <div className="space-y-3">
                  {uniformes.map((uniforme) => (
                    <div key={uniforme.id} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{uniforme.tipo_uniforme}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Tamanho: {uniforme.tamanho}</span>
                        <span>Qtd: {uniforme.quantidade}</span>
                        <span>
                          Data: {new Date(uniforme.data_entrega).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {uniforme.observacoes && (
                        <p className="text-sm mt-1">{uniforme.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FuncionarioDashboard;
