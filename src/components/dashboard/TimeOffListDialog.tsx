import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TimeOffListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmployeeTimeOff {
  id: string;
  nome_completo: string;
  cargo: string;
  timeOffCount: number;
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
      // Buscar todos os funcionários
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo")
        .order("nome_completo");

      if (employeesError) throw employeesError;

      if (employeesData) {
        // Para cada funcionário, buscar quantidade de folgas
        const employeesWithTimeOff = await Promise.all(
          employeesData.map(async (employee) => {
            const { count } = await supabase
              .from("folgas")
              .select("*", { count: "exact", head: true })
              .eq("employee_id", employee.id);

            return {
              id: employee.id,
              nome_completo: employee.nome_completo,
              cargo: employee.cargo,
              timeOffCount: count || 0,
            };
          })
        );

        setEmployees(employeesWithTimeOff);
      }
    } catch (error) {
      console.error("Erro ao buscar folgas:", error);
      toast.error("Erro ao carregar dados de folgas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Folgas na Casa - Todos os Funcionários</DialogTitle>
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
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {employee.nome_completo}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {employee.cargo}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {employee.timeOffCount}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {employee.timeOffCount === 1 ? "folga" : "folgas"}
                          </p>
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
