import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeList from "@/components/employees/EmployeeList";
import EmployeeForm from "@/components/forms/EmployeeForm";
import TimeOffListDialog from "@/components/dashboard/TimeOffListDialog";
import TimeOffHistoryDialog from "@/components/dashboard/TimeOffHistoryDialog";
import AvisoForm from "@/components/forms/AvisoForm";
import ManageAvisosDialog from "@/components/dashboard/ManageAvisosDialog";
import LoginHistoryDialog from "@/components/dashboard/LoginHistoryDialog";
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
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string }>>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onVacation: 0,
    onLeave: 0,
  });

  useEffect(() => {
    fetchEmpresas();
    fetchStats();
  }, [selectedEmpresa]);

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
      
      if (selectedEmpresa) {
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
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as empresas</SelectItem>
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

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, cargo ou setor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => navigate("/stock")}>
            <Package className="w-4 h-4 mr-2" />
            Estoque
          </Button>
          <Button variant="outline" onClick={() => navigate("/sectors")}>
            <Building2 className="w-4 h-4 mr-2" />
            Setores
          </Button>
          <Button variant="outline" onClick={() => navigate("/turnover")}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Turnover
          </Button>
          <Button variant="outline" onClick={() => navigate("/financeiro")}>
            <DollarSign className="w-4 h-4 mr-2" />
            Financeiro
          </Button>
          <Button variant="outline" onClick={() => navigate("/companies")}>
            <Building2 className="w-4 h-4 mr-2" />
            Empresas
          </Button>
          <Button variant="outline" onClick={() => setShowTimeOffDialog(true)}>
            <Clock className="w-4 h-4 mr-2" />
            Ver Folgas
          </Button>
          <Button variant="outline" onClick={() => setShowTimeOffHistoryDialog(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Histórico de Folgas
          </Button>
          <Button variant="outline" onClick={() => setShowLoginHistoryDialog(true)}>
            <Users className="w-4 h-4 mr-2" />
            Histórico de Login
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={handleAddEmployee}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Funcionário</DialogTitle>
              </DialogHeader>
              <EmployeeForm
                onSaved={() => {
                  setShowAddDialog(false);
                  fetchStats();
                }}
                onCancel={() => setShowAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Time Off Dialog */}
        <TimeOffListDialog 
          open={showTimeOffDialog} 
          onOpenChange={setShowTimeOffDialog} 
        />

        {/* Time Off History Dialog */}
        <TimeOffHistoryDialog 
          open={showTimeOffHistoryDialog} 
          onOpenChange={setShowTimeOffHistoryDialog} 
        />

        {/* Aviso Dialog */}
        <Dialog open={showAvisoDialog} onOpenChange={setShowAvisoDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="mb-4">
              <Bell className="w-4 h-4 mr-2" />
              Criar Aviso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Aviso</DialogTitle>
            </DialogHeader>
            <AvisoForm onSuccess={() => setShowAvisoDialog(false)} />
          </DialogContent>
        </Dialog>

        {/* Manage Avisos Dialog */}
        <ManageAvisosDialog 
          open={showManageAvisosDialog}
          onOpenChange={setShowManageAvisosDialog}
        />

        <Button 
          variant="secondary" 
          className="mb-4 ml-2"
          onClick={() => setShowManageAvisosDialog(true)}
        >
          <Bell className="w-4 h-4 mr-2" />
          Gerenciar Avisos
        </Button>

        {/* Login History Dialog */}
        <LoginHistoryDialog 
          open={showLoginHistoryDialog}
          onOpenChange={setShowLoginHistoryDialog}
        />

        {/* Employee List */}
        <EmployeeList searchQuery={searchQuery} onStatsUpdate={fetchStats} empresaId={selectedEmpresa} />
      </div>
    </div>
  );
};

export default GestorDashboard;
