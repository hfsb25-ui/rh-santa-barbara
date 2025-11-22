import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Search,
  Plus,
  Shield,
  Calendar,
  FileText,
  Clock,
  Package,
  TrendingUp,
  Building2,
  DollarSign,
  Bell,
  Receipt,
  Briefcase,
  FileSignature,
  TrendingUp as TrendingUpIcon,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VacationProgress } from "@/components/ui/vacation-progress";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeList from "@/components/employees/EmployeeList";
import EmployeeForm from "@/components/forms/EmployeeForm";
import TimeOffListDialog from "@/components/dashboard/TimeOffListDialog";
import TimeOffHistoryDialog from "@/components/dashboard/TimeOffHistoryDialog";
import AvisoForm from "@/components/forms/AvisoForm";
import ManageAvisosDialog from "@/components/dashboard/ManageAvisosDialog";
import LoginHistoryDialog from "@/components/dashboard/LoginHistoryDialog";
import MetricsCharts from "@/components/dashboard/MetricsCharts";
import FinancialMetrics from "@/components/dashboard/FinancialMetrics";
import StockAlerts from "@/components/dashboard/StockAlerts";
import AttendanceMetrics from "@/components/dashboard/AttendanceMetrics";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { toast } from "sonner";

interface GestorDashboardProps {
  user: User;
}

const GestorDashboard = ({ user }: GestorDashboardProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [showTimeOffHistoryDialog, setShowTimeOffHistoryDialog] = useState(false);
  const [showAvisoDialog, setShowAvisoDialog] = useState(false);
  const [showManageAvisosDialog, setShowManageAvisosDialog] = useState(false);
  const [showLoginHistoryDialog, setShowLoginHistoryDialog] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
  const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string }>>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onVacation: 0,
    onLeave: 0,
  });
  const [employeesOnVacation, setEmployeesOnVacation] = useState<any[]>([]);
  const [period, setPeriod] = useState("current");
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Metrics state
  const [metricsData, setMetricsData] = useState<any>(null);

  useEffect(() => {
    fetchEmpresas();
    fetchStats();
    fetchEmployeesOnVacation();
    fetchAdvancedMetrics();
  }, [selectedEmpresa, period]);

  const fetchEmpresas = async () => {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome")
      .order("nome");
    
    if (data) setEmpresas(data);
  };

  const fetchStats = async () => {
    try {
      let query = supabase.from("employees").select("status");
      
      if (selectedEmpresa && selectedEmpresa !== "all") {
        query = query.eq("empresa_id", selectedEmpresa);
      }

      const { data: employees } = await query;

      if (employees) {
        setStats({
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e) => e.status === "ativo").length,
          onVacation: employees.filter((e) => e.status === "ferias").length,
          onLeave: employees.filter((e) => e.status === "afastado").length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchEmployeesOnVacation = async () => {
    try {
      let employeeQuery = supabase
        .from("employees")
        .select("id, nome_completo, cargo")
        .eq("status", "ferias");

      if (selectedEmpresa && selectedEmpresa !== "all") {
        employeeQuery = employeeQuery.eq("empresa_id", selectedEmpresa);
      }

      const { data: employees } = await employeeQuery;

      if (employees && employees.length > 0) {
        const employeeIds = employees.map(e => e.id);
        
        const { data: vacations } = await supabase
          .from("ferias")
          .select("*")
          .in("employee_id", employeeIds)
          .eq("data_retorno_confirmada", false)
          .gte("periodo_gozo_fim", new Date().toISOString().split("T")[0])
          .order("periodo_gozo_inicio", { ascending: false });

        const employeesWithVacations = employees.map(emp => {
          const vacation = vacations?.find(v => v.employee_id === emp.id);
          return vacation ? { ...emp, vacation } : null;
        }).filter(Boolean);

        setEmployeesOnVacation(employeesWithVacations);
      } else {
        setEmployeesOnVacation([]);
      }
    } catch (error) {
      console.error("Error fetching employees on vacation:", error);
    }
  };

  const calculateVacationProgress = (inicio: string, fim: string, diasTotais: number) => {
    const startDate = new Date(inicio);
    const endDate = new Date(fim);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = diasTotais - daysPassed;

    const progress = Math.min(100, Math.max(0, (daysPassed / diasTotais) * 100));
    
    const realVacationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const timeOffDays = diasTotais - realVacationDays;

    return { 
      progress, 
      daysRemaining: Math.max(0, daysRemaining), 
      totalDays: diasTotais,
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

  const handleAddEmployee = () => {
    setShowAddDialog(true);
  };

  const fetchAdvancedMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      // Calculate date range based on period
      switch (period) {
        case "last3":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "last6":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch all employees
      let employeeQuery = supabase.from("employees").select("*");
      if (selectedEmpresa && selectedEmpresa !== "all") {
        employeeQuery = employeeQuery.eq("empresa_id", selectedEmpresa);
      }
      const { data: employees } = await employeeQuery;

      // Fetch sectors
      const { data: sectors } = await supabase.from("setores").select("*");

      // Fetch payroll data
      let payrollQuery = supabase.from("folha_pagamento").select("*").gte("created_at", startDate.toISOString());
      if (selectedEmpresa && selectedEmpresa !== "all") {
        payrollQuery = payrollQuery.eq("empresa_id", selectedEmpresa);
      }
      const { data: payroll } = await payrollQuery;

      // Fetch stock data
      const { data: episStock } = await supabase.from("estoque_epis").select("*");
      const { data: uniformsStock } = await supabase.from("estoque_uniformes").select("*");
      
      // Fetch distribution history
      const { data: episDistribution } = await supabase
        .from("historico_estoque_epis")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .eq("tipo_movimentacao", "saida");
      
      const { data: uniformsDistribution } = await supabase
        .from("historico_estoque_uniformes")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .eq("tipo_movimentacao", "saida");

      // Fetch absences
      let absencesQuery = supabase.from("faltas").select("*, employees(nome_completo)").gte("data", startDate.toISOString().split("T")[0]);
      const { data: absences } = await absencesQuery;

      // Process data for charts
      const statusData = [
        { name: "Ativos", value: employees?.filter(e => e.status === "ativo").length || 0, color: "hsl(var(--secondary))" },
        { name: "Férias", value: employees?.filter(e => e.status === "ferias").length || 0, color: "hsl(var(--primary))" },
        { name: "Afastados", value: employees?.filter(e => e.status === "afastado").length || 0, color: "hsl(var(--warning))" },
        { name: "Demitidos", value: employees?.filter(e => e.status === "demitido").length || 0, color: "hsl(var(--destructive))" }
      ];

      // Employees by sector
      const sectorCounts = sectors?.map(sector => ({
        name: sector.nome,
        total: employees?.filter(e => e.setor === sector.nome).length || 0
      })) || [];

      // Calculate evolution data (last 6 months)
      const monthsEvolution = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString("pt-BR", { month: "short" });
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString();
        
        const admitted = employees?.filter(e => e.data_admissao && e.data_admissao >= monthStart.split("T")[0] && e.data_admissao <= monthEnd.split("T")[0]).length || 0;
        const dismissed = employees?.filter(e => e.data_desligamento && e.data_desligamento >= monthStart.split("T")[0] && e.data_desligamento <= monthEnd.split("T")[0]).length || 0;
        const total = employees?.filter(e => {
          const admDate = e.data_admissao ? new Date(e.data_admissao) : null;
          const dismDate = e.data_desligamento ? new Date(e.data_desligamento) : null;
          return admDate && admDate <= new Date(monthEnd) && (!dismDate || dismDate >= new Date(monthStart));
        }).length || 0;
        
        monthsEvolution.push({
          month: monthName,
          total,
          admissions: admitted,
          dismissals: dismissed
        });
      }

      // Financial metrics
      const currentMonthPayroll = payroll?.filter(p => {
        const pDate = new Date(p.created_at || "");
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }).reduce((sum, p) => sum + (p.valor_liquido || 0), 0) || 0;

      const previousMonthPayroll = payroll?.filter(p => {
        const pDate = new Date(p.created_at || "");
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return pDate.getMonth() === prevMonth.getMonth() && pDate.getFullYear() === prevMonth.getFullYear();
      }).reduce((sum, p) => sum + (p.valor_liquido || 0), 0) || 0;

      const avgSalary = employees && employees.length > 0
        ? employees.filter(e => e.status === "ativo" && e.salario).reduce((sum, e) => sum + (e.salario || 0), 0) / employees.filter(e => e.status === "ativo" && e.salario).length
        : 0;

      // Payroll by sector
      const payrollBySector = sectors?.map(sector => {
        const sectorEmployees = employees?.filter(e => e.setor === sector.nome && e.status === "ativo") || [];
        const total = sectorEmployees.reduce((sum, e) => sum + (e.salario || 0), 0);
        return { name: sector.nome, value: total };
      }).filter(s => s.value > 0) || [];

      // Payroll evolution (last 6 months)
      const payrollEvolution = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString("pt-BR", { month: "short" });
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString();
        
        const monthTotal = payroll?.filter(p => {
          const pDate = new Date(p.created_at || "");
          return pDate >= new Date(monthStart) && pDate <= new Date(monthEnd);
        }).reduce((sum, p) => sum + (p.valor_liquido || 0), 0) || 0;
        
        payrollEvolution.push({ month: monthName, value: monthTotal });
      }

      // Stock alerts
      const lowStockEpis = episStock?.filter(item => item.quantidade_estoque <= (item.quantidade_minima || 10)).map(item => ({
        name: `${item.tipo_epi} ${item.tamanho || ""} ${item.marca_modelo || ""}`.trim(),
        current: item.quantidade_estoque,
        minimum: item.quantidade_minima || 10,
        distributed: 0
      })) || [];

      const lowStockUniforms = uniformsStock?.filter(item => item.quantidade_estoque <= (item.quantidade_minima || 10)).map(item => ({
        name: `${item.tipo_uniforme} ${item.tamanho}`,
        current: item.quantidade_estoque,
        minimum: item.quantidade_minima || 10,
        distributed: 0
      })) || [];

      // Top distributed items
      const episDistCount = episDistribution?.reduce((acc: any, item) => {
        const key = item.estoque_epi_id;
        if (!acc[key]) acc[key] = { id: key, count: 0 };
        acc[key].count += item.quantidade;
        return acc;
      }, {});

      const uniformsDistCount = uniformsDistribution?.reduce((acc: any, item) => {
        const key = item.estoque_uniforme_id;
        if (!acc[key]) acc[key] = { id: key, count: 0 };
        acc[key].count += item.quantidade;
        return acc;
      }, {});

      const topDistributed = [
        ...Object.values(episDistCount || {}).map((item: any) => {
          const epi = episStock?.find(e => e.id === item.id);
          return { name: epi?.tipo_epi || "EPI", quantity: item.count };
        }),
        ...Object.values(uniformsDistCount || {}).map((item: any) => {
          const uniform = uniformsStock?.find(u => u.id === item.id);
          return { name: uniform?.tipo_uniforme || "Uniforme", quantity: item.count };
        })
      ].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

      // Attendance metrics
      const totalAbsences = absences?.length || 0;
      const justifiedAbsences = absences?.filter(a => a.justificada).length || 0;
      const unjustifiedAbsences = totalAbsences - justifiedAbsences;

      // Calculate absenteeism rate
      const workingDays = 22; // Average working days per month
      const activeEmployees = employees?.filter(e => e.status === "ativo").length || 1;
      const absenteeismRate = (totalAbsences / (workingDays * activeEmployees)) * 100;

      // Top absent employees
      const employeeAbsences = absences?.reduce((acc: any, absence) => {
        const empId = absence.employee_id;
        if (!acc[empId]) {
          acc[empId] = {
            name: absence.employees?.nome_completo || "Desconhecido",
            total: 0,
            justified: 0,
            unjustified: 0
          };
        }
        acc[empId].total++;
        if (absence.justificada) {
          acc[empId].justified++;
        } else {
          acc[empId].unjustified++;
        }
        return acc;
      }, {});

      const topAbsentEmployees = Object.values(employeeAbsences || {})
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 10);

      // Absence evolution (last 6 months)
      const absenceEvolution = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString("pt-BR", { month: "short" });
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split("T")[0];
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0];
        
        const monthAbsences = absences?.filter(a => a.data >= monthStart && a.data <= monthEnd) || [];
        const justified = monthAbsences.filter(a => a.justificada).length;
        const unjustified = monthAbsences.length - justified;
        
        absenceEvolution.push({
          month: monthName,
          justified,
          unjustified
        });
      }

      setMetricsData({
        statusData,
        sectorData: sectorCounts,
        evolutionData: monthsEvolution,
        financial: {
          totalPayroll: currentMonthPayroll,
          previousMonthPayroll,
          payrollBySector,
          payrollEvolution,
          averageSalary: avgSalary
        },
        stock: {
          lowStockEpis,
          lowStockUniforms,
          topDistributed
        },
        attendance: {
          totalAbsences,
          justifiedAbsences,
          unjustifiedAbsences,
          absenteeismRate,
          topAbsentEmployees,
          absenceEvolution
        }
      });
    } catch (error) {
      console.error("Error fetching advanced metrics:", error);
      toast.error("Erro ao carregar métricas avançadas");
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sistema de RH</h1>
              <p className="text-sm text-muted-foreground">Painel do Gestor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex lg:grid w-full lg:grid-cols-5 overflow-x-auto tabs-scroll">
            <TabsTrigger value="overview" className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <LayoutDashboard className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <BarChart3 className="w-4 h-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <DollarSign className="w-4 h-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <Package className="w-4 h-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <FileText className="w-4 h-4" />
              Frequência
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <DashboardFilters
            period={period}
            onPeriodChange={setPeriod}
            selectedCompany={selectedEmpresa}
            onCompanyChange={setSelectedEmpresa}
            companies={empresas}
          />

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Funcionários
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary">
                    {stats.activeEmployees}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Férias</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.onVacation}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Afastados</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {stats.onLeave}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employees on Vacation */}
            {employeesOnVacation.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Funcionários em Férias ({employeesOnVacation.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {employeesOnVacation.map((employee) => {
                    const { progress, daysRemaining, totalDays, vacationDays, timeOffDays } = calculateVacationProgress(
                      employee.vacation.periodo_gozo_inicio,
                      employee.vacation.periodo_gozo_fim,
                      employee.vacation.dias_totais
                    );

                    return (
                      <Card key={employee.id} className="border-primary/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{employee.nome_completo}</CardTitle>
                          <p className="text-sm text-muted-foreground">{employee.cargo}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Retorno</span>
                            <span className="font-medium">
                              {new Date(employee.vacation.periodo_gozo_fim).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Dias restantes</span>
                              <span className="font-bold">
                                {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                              </span>
                            </div>
                            <VacationProgress 
                              totalDays={totalDays}
                              daysPassed={totalDays - daysRemaining}
                              vacationDays={vacationDays}
                              timeOffDays={timeOffDays}
                              className="h-2"
                            />
                            {timeOffDays > 0 && (
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-secondary" />
                                  <span>{vacationDays}d</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-warning" />
                                  <span>{timeOffDays}d</span>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground text-right">
                              {Math.round(progress)}% concluído
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => navigate(`/employee/${employee.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search and Actions */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, cargo ou setor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Button variant="outline" onClick={() => navigate("/stock")} className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Estoque
                </Button>
                <Button variant="outline" onClick={() => navigate("/sectors")} className="w-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  Setores
                </Button>
                <Button variant="outline" onClick={() => navigate("/turnover")} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Turnover
                </Button>
                <Button variant="outline" onClick={() => navigate("/financeiro")} className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Financeiro
                </Button>
                <Button variant="outline" onClick={() => navigate("/payroll")} className="w-full">
                  <Receipt className="w-4 h-4 mr-2" />
                  Folha de Pagamento
                </Button>
                <Button variant="outline" onClick={() => navigate("/salary-adjustment")} className="w-full">
                  <TrendingUpIcon className="w-4 h-4 mr-2" />
                  Reajuste Salarial
                </Button>
                <Button variant="outline" onClick={() => navigate("/companies")} className="w-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  Empresas
                </Button>
                <Button variant="outline" onClick={handleAddEmployee} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Funcionário
                </Button>
                <Button variant="outline" onClick={() => setShowTimeOffDialog(true)} className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Folgas
                </Button>
                <Button variant="outline" onClick={() => setShowTimeOffHistoryDialog(true)} className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Histórico Folgas
                </Button>
                <Button variant="outline" onClick={() => setShowAvisoDialog(true)} className="w-full">
                  <Bell className="w-4 h-4 mr-2" />
                  Novo Aviso
                </Button>
                <Button variant="outline" onClick={() => setShowManageAvisosDialog(true)} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Gerenciar Avisos
                </Button>
                <Button variant="outline" onClick={() => setShowLoginHistoryDialog(true)} className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Histórico Login
                </Button>
                <Button variant="outline" onClick={() => navigate("/funcoes")} className="w-full">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Funções
                </Button>
                <Button variant="outline" onClick={() => navigate("/managers")} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Gestores
                </Button>
                <Button variant="outline" onClick={() => navigate("/contracts")} className="w-full">
                  <FileSignature className="w-4 h-4 mr-2" />
                  Contratos
                </Button>
                <Button variant="outline" onClick={() => navigate("/recrutamento")} className="w-full">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Recrutamento
                </Button>
                <Button variant="outline" onClick={() => navigate("/vagas")} className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Vagas Públicas
                </Button>
                <Button variant="outline" onClick={() => navigate("/relatorios")} className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>
              </div>
            </div>

            {/* Employee List */}
            <EmployeeList searchQuery={searchQuery} onStatsUpdate={() => {
              fetchStats();
              fetchAdvancedMetrics();
            }} />
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {loadingMetrics ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[250px] w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : metricsData ? (
              <MetricsCharts
                selectedEmpresa={selectedEmpresa}
                setSelectedEmpresa={setSelectedEmpresa}
                empresas={empresas}
                period={period}
                setPeriod={setPeriod}
              />
            ) : null}
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {loadingMetrics ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-40" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : metricsData ? (
              <FinancialMetrics
                totalPayroll={metricsData.financial.totalPayroll}
                previousMonthPayroll={metricsData.financial.previousMonthPayroll}
                payrollBySector={metricsData.financial.payrollBySector}
                payrollEvolution={metricsData.financial.payrollEvolution}
                averageSalary={metricsData.financial.averageSalary}
              />
            ) : null}
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="space-y-6">
            {loadingMetrics ? (
              <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <div className="grid gap-6 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-40" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[200px] w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : metricsData ? (
              <StockAlerts
                lowStockEpis={metricsData.stock.lowStockEpis}
                lowStockUniforms={metricsData.stock.lowStockUniforms}
                topDistributed={metricsData.stock.topDistributed}
              />
            ) : null}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            {loadingMetrics ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-40" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : metricsData ? (
              <AttendanceMetrics
                totalAbsences={metricsData.attendance.totalAbsences}
                justifiedAbsences={metricsData.attendance.justifiedAbsences}
                unjustifiedAbsences={metricsData.attendance.unjustifiedAbsences}
                absenteeismRate={metricsData.attendance.absenteeismRate}
                topAbsentEmployees={metricsData.attendance.topAbsentEmployees}
                absenceEvolution={metricsData.attendance.absenceEvolution}
              />
            ) : null}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <TimeOffListDialog 
          open={showTimeOffDialog} 
          onOpenChange={setShowTimeOffDialog} 
        />

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              onSaved={() => {
                setShowAddDialog(false);
                fetchStats();
                fetchAdvancedMetrics();
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>

        <TimeOffHistoryDialog 
          open={showTimeOffHistoryDialog} 
          onOpenChange={setShowTimeOffHistoryDialog} 
        />

        <Dialog open={showAvisoDialog} onOpenChange={setShowAvisoDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Aviso</DialogTitle>
            </DialogHeader>
            <AvisoForm />
          </DialogContent>
        </Dialog>

        <ManageAvisosDialog 
          open={showManageAvisosDialog} 
          onOpenChange={setShowManageAvisosDialog} 
        />

        <LoginHistoryDialog 
          open={showLoginHistoryDialog} 
          onOpenChange={setShowLoginHistoryDialog} 
        />
      </div>
    </div>
  );
};

export default GestorDashboard;
