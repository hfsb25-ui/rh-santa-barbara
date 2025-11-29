import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Search } from "lucide-react";

export function ConfiguracaoHoras() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingHours, setEditingHours] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-with-hours-config"],
    queryFn: async () => {
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor")
        .eq("status", "ativo")
        .order("nome_completo");
      
      if (empError) throw empError;

      const { data: configData, error: configError } = await supabase
        .from("configuracao_horas_trabalho")
        .select("*");
      
      if (configError) throw configError;

      const configMap = new Map(configData.map(c => [c.employee_id, c]));

      return empData.map(emp => ({
        ...emp,
        horasDiarias: configMap.get(emp.id)?.horas_diarias_esperadas || 8.00,
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ employeeId, hours }: { employeeId: string; hours: number }) => {
      const { error } = await supabase
        .from("configuracao_horas_trabalho")
        .upsert({
          employee_id: employeeId,
          horas_diarias_esperadas: hours,
        }, {
          onConflict: "employee_id"
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["employees-with-hours-config"] });
      setEditingHours({});
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const handleSave = (employeeId: string) => {
    const hours = parseFloat(editingHours[employeeId]);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Digite um valor válido de horas");
      return;
    }
    updateMutation.mutate({ employeeId, hours });
  };

  const filteredEmployees = employees?.filter(emp =>
    emp.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Configuração de Horas Esperadas</h2>
        <p className="text-muted-foreground">
          Defina a quantidade de horas diárias esperadas para cada funcionário
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar funcionário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Horas Diárias</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees?.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.nome_completo}</TableCell>
                  <TableCell>{emp.cargo}</TableCell>
                  <TableCell>{emp.setor || "-"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingHours[emp.id] ?? emp.horasDiarias}
                      onChange={(e) => setEditingHours({
                        ...editingHours,
                        [emp.id]: e.target.value
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSave(emp.id)}
                      disabled={
                        updateMutation.isPending ||
                        !editingHours[emp.id] ||
                        parseFloat(editingHours[emp.id]) === emp.horasDiarias
                      }
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
