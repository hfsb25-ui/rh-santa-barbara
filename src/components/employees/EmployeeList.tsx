import { useEffect, useState } from "react";
import { parseDateOnly, todayISO} from "@/lib/date";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeListProps {
  searchQuery: string;
  onStatsUpdate: () => void;
  empresaId?: string;
}

const EmployeeList = ({ searchQuery, onStatsUpdate, empresaId }: EmployeeListProps) => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [contratoFilter, setContratoFilter] = useState<string>("all");
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [employeesOnVacationIds, setEmployeesOnVacationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEmployees();
    fetchEmpresas();
    fetchSetores();
    fetchVacationStatus();
  }, [empresaId]);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, statusFilter, empresaFilter, setorFilter, contratoFilter, employees]);

  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from("employees")
        .select("*")
        .order("nome_completo");

      if (empresaId && empresaId !== "all") {
        query = query.eq("empresa_id", empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Error fetching empresas:", error);
    }
  };

  const fetchSetores = async () => {
    try {
      const { data, error } = await supabase.from("setores").select("*").order("nome");
      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error("Error fetching setores:", error);
    }
  };

  const fetchVacationStatus = async () => {
    try {
      const todayStr = todayISO();
      const { data, error } = await supabase
        .from("ferias")
        .select("employee_id")
        .lte("periodo_gozo_inicio", todayStr)
        .gte("periodo_gozo_fim", todayStr);
      if (error) throw error;
      setEmployeesOnVacationIds(new Set(data?.map(f => f.employee_id) || []));
    } catch (error) {
      console.error("Error fetching vacation status:", error);
    }
  };

  const getEffectiveStatus = (emp: any) => {
    if (employeesOnVacationIds.has(emp.id)) return "ferias";
    if (emp.status === "ferias") return "ativo"; // Não está em férias hoje, mostrar como ativo
    return emp.status;
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (statusFilter !== "all") {
      filtered = filtered.filter((emp) => getEffectiveStatus(emp) === statusFilter);
    }
    if (empresaFilter !== "all") {
      filtered = filtered.filter((emp) => emp.empresa_id === empresaFilter);
    }
    if (setorFilter !== "all") {
      filtered = filtered.filter((emp) => emp.setor === setorFilter);
    }
    if (contratoFilter !== "all") {
      filtered = filtered.filter((emp) => emp.tipo_contrato === contratoFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.nome_completo.toLowerCase().includes(query) ||
          emp.cargo.toLowerCase().includes(query) ||
          (emp.setor && emp.setor.toLowerCase().includes(query))
      );
    }

    setFilteredEmployees(filtered);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      em_admissao: { variant: "outline", label: "Em Admissão", className: "bg-amber-50 text-amber-700 border-amber-200" },
      ativo: { variant: "default", label: "Ativo" },
      ferias: { variant: "secondary", label: "Férias" },
      afastado: { variant: "destructive", label: "Afastado" },
      demitido: { variant: "outline", label: "Demitido" },
    };
    const c = config[status] || { variant: "default" as const, label: status };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const getContratoLabel = (tipo: string | null) => {
    const labels: Record<string, string> = {
      fixo: "Fixo",
      intermitente: "Intermitente",
      prestador_servico: "Prestador",
    };
    return tipo ? labels[tipo] || tipo : "—";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="em_admissao">Em Admissão</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="ferias">Férias</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="demitido">Demitido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Empresa" />
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

        <Select value={setorFilter} onValueChange={setSetorFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {setores.map((setor) => (
              <SelectItem key={setor.id} value={setor.nome}>
                {setor.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={contratoFilter} onValueChange={setContratoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de Contrato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os contratos</SelectItem>
            <SelectItem value="fixo">Fixo</SelectItem>
            <SelectItem value="intermitente">Intermitente</SelectItem>
            <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum funcionário encontrado
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead className="hidden md:table-cell">Setor</TableHead>
                <TableHead className="hidden lg:table-cell">Admissão</TableHead>
                <TableHead className="hidden lg:table-cell">Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/employee/${employee.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={employee.foto_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(employee.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{employee.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{employee.cargo}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {employee.setor || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {employee.data_admissao
                      ? (parseDateOnly(employee.data_admissao) ?? new Date()).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {getContratoLabel(employee.tipo_contrato)}
                  </TableCell>
                  <TableCell>{getStatusBadge(getEffectiveStatus(employee))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/employee/${employee.id}`); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        {filteredEmployees.length} funcionário{filteredEmployees.length !== 1 ? "s" : ""} encontrado{filteredEmployees.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default EmployeeList;
