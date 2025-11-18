import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
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

  useEffect(() => {
    fetchEmployees();
  }, [empresaId]);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, statusFilter, employees]);

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

  const filterEmployees = () => {
    let filtered = employees;

    if (statusFilter !== "all") {
      filtered = filtered.filter((emp) => emp.status === statusFilter);
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
    const variants: any = {
      ativo: "default",
      ferias: "secondary",
      afastado: "destructive",
      demitido: "outline",
    };
    const labels: any = {
      ativo: "Ativo",
      ferias: "Férias",
      afastado: "Afastado",
      demitido: "Demitido",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
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
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="ferias">Férias</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="demitido">Demitido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum funcionário encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {employee.nome_completo}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {employee.cargo}
                    </p>
                    {employee.setor && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {employee.setor}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(employee.status)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/employee/${employee.id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
