import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import EditTimeOffDialog from "./EditTimeOffDialog";

interface TimeOffListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmployeeTimeOff {
  id: string;
  nome_completo: string;
  cargo: string;
  quantidade_folgas: number;
}

const TimeOffListDialog = ({ open, onOpenChange }: TimeOffListDialogProps) => {
  const [employees, setEmployees] = useState<EmployeeTimeOff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployeeTimeOff();
    }
  }, [open]);

  const fetchEmployeeTimeOff = async () => {
    setLoading(true);
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, quantidade_folgas")
        .order("nome_completo");

      if (employeesError) throw employeesError;

      setEmployees(employeesData || []);
    } catch (error) {
      console.error("Erro ao buscar folgas:", error);
      toast.error("Erro ao carregar dados de folgas");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = ["Nome Completo", "Cargo", "Quantidade de Folgas"];
    const csvContent = [
      headers.join(","),
      ...employees.map(emp => 
        `"${emp.nome_completo}","${emp.cargo}",${emp.quantidade_folgas}`
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `folgas_funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Lista exportada com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Folgas na Casa - Todos os Funcionários</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {employees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum funcionário cadastrado
              </p>
            ) : (
              <div className="grid gap-3">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {employee.nome_completo}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {employee.cargo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {employee.quantidade_folgas}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {employee.quantidade_folgas === 1 ? "folga" : "folgas"}
                            </p>
                          </div>
                          <EditTimeOffDialog
                            employeeId={employee.id}
                            employeeName={employee.nome_completo}
                            currentAmount={employee.quantidade_folgas}
                            onUpdated={fetchEmployeeTimeOff}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TimeOffListDialog;
