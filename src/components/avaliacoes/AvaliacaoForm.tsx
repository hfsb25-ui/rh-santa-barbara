import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, User, CheckSquare } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AvaliacaoFormProps {
  avaliacao?: any;
  onClose: () => void;
  onSuccess: () => void;
}

type EmployeeSelectRow = {
  id: string;
  nome_completo: string | null;
  cargo: string | null;
  setor: string | null;
};

function normalizeEmployeeIds(ids: Array<unknown>): string[] {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id === null || id === undefined) continue;
    const asString = String(id).trim();
    if (!asString) continue;
    unique.add(asString);
  }
  return Array.from(unique);
}

export default function AvaliacaoForm({ avaliacao, onClose, onSuccess }: AvaliacaoFormProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"individual" | "setor">("individual");
  const [selectedSetor, setSelectedSetor] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const selectedEmployeesSet = useMemo(() => new Set(selectedEmployees), [selectedEmployees]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug("[AvaliacaoForm] selectedEmployees updated", {
      mode,
      selectedSetor,
      count: selectedEmployees.length,
    });
  }, [mode, selectedSetor, selectedEmployees.length]);

  const form = useForm({
    defaultValues: {
      employee_id: avaliacao?.employee_id || "",
      tipo: avaliacao?.tipo || "trimestral",
      periodo_inicio: avaliacao?.periodo_inicio || "",
      periodo_fim: avaliacao?.periodo_fim || "",
      observacoes: avaliacao?.observacoes || "",
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["setores-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("id, nome").order("nome");

      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery<EmployeeSelectRow[]>({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor")
        .eq("status", "ativo")
        .order("nome_completo");

      if (error) throw error;
      return (data ?? []) as EmployeeSelectRow[];
    },
  });

  // Filter employees by selected sector
  const employeesBySetor = selectedSetor && employees ? employees.filter((emp) => emp.setor === selectedSetor) : [];

  const handleSelectAll = () => {
    try {
      if (!employeesBySetor || employeesBySetor.length === 0) return;

      const setorIds = normalizeEmployeeIds(employeesBySetor.map((emp) => emp?.id));

      // eslint-disable-next-line no-console
      console.debug("[AvaliacaoForm] handleSelectAll", {
        selectedSetor,
        setorEmployees: employeesBySetor.length,
        setorIds: setorIds.length,
      });

      if (selectedEmployees.length === setorIds.length) {
        setSelectedEmployees([]);
      } else {
        setSelectedEmployees(setorIds);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[AvaliacaoForm] erro ao selecionar todos", err);
      toast.error("Erro ao selecionar funcionários");
    }
  };

  const toggleEmployee = (employeeId: string) => {
    if (!employeeId) return;

    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return Array.from(next);
    });
  };

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (mode === "setor") {
        // Create evaluations for multiple employees
        if (selectedEmployees.length === 0) {
          toast.error("Selecione pelo menos um funcionário");
          setLoading(false);
          return;
        }

        const avaliacoesData = selectedEmployees.map(empId => ({
          employee_id: empId,
          tipo: values.tipo,
          periodo_inicio: values.periodo_inicio,
          periodo_fim: values.periodo_fim,
          observacoes: values.observacoes,
          avaliador_id: user?.id,
          status: "pendente",
        }));

        const { error } = await supabase
          .from("avaliacoes_desempenho")
          .insert(avaliacoesData);

        if (error) throw error;
        toast.success(`${selectedEmployees.length} avaliações criadas com sucesso!`);
      } else {
        // Single employee evaluation
        const avaliacaoData = {
          ...values,
          avaliador_id: user?.id,
          status: "pendente",
        };

        if (avaliacao?.id) {
          const { error } = await supabase
            .from("avaliacoes_desempenho")
            .update(avaliacaoData)
            .eq("id", avaliacao.id);

          if (error) throw error;
          toast.success("Avaliação atualizada com sucesso!");
        } else {
          const { error } = await supabase
            .from("avaliacoes_desempenho")
            .insert(avaliacaoData);

          if (error) throw error;
          toast.success("Avaliação criada com sucesso!");
        }
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar avaliação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ErrorBoundary title="Erro no formulário de avaliação" onClose={onClose}>
          <DialogHeader>
            <DialogTitle>{avaliacao ? "Editar Avaliação" : "Nova Avaliação"}</DialogTitle>
          </DialogHeader>

          {/* Mode selector - only show when creating new */}
          {!avaliacao && (
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => {
                  setMode("individual");
                  setSelectedSetor("");
                  setSelectedEmployees([]);
                }}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-2" />
                Individual
              </Button>
              <Button
                type="button"
                variant={mode === "setor" ? "default" : "outline"}
                onClick={() => {
                  setMode("setor");
                  form.setValue("employee_id", "");
                }}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Por Setor
              </Button>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {mode === "individual" ? (
                <FormField
                  control={form.control}
                  name="employee_id"
                  rules={{ required: "Selecione um funcionário" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funcionário</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o funcionário" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.nome_completo} - {emp.cargo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Setor</Label>
                    <Select
                      value={selectedSetor}
                      onValueChange={(value) => {
                        setSelectedSetor(value);
                        setSelectedEmployees([]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                        {setores && setores.length > 0 ? (
                          setores.map((setor) => (
                            <SelectItem key={setor.id} value={setor.nome}>
                              {setor.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            Nenhum setor cadastrado
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSetor && employeesBySetor && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-sm font-medium">Funcionários do setor ({employeesBySetor.length})</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
                          <CheckSquare className="w-4 h-4 mr-1" />
                          {selectedEmployees.length === normalizeEmployeeIds(employeesBySetor.map((e) => e?.id)).length
                            ? "Desmarcar Todos"
                            : "Selecionar Todos"}
                        </Button>
                      </div>

                      {employeesBySetor.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum funcionário ativo neste setor
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {employeesBySetor.map((emp) => {
                            if (!emp || !emp.id) return null;
                            const isChecked = selectedEmployeesSet.has(emp.id);
                            return (
                              <label
                                key={emp.id}
                                htmlFor={`employee-checkbox-${emp.id}`}
                                className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              >
                                <Checkbox
                                  id={`employee-checkbox-${emp.id}`}
                                  checked={isChecked}
                                  onCheckedChange={() => toggleEmployee(emp.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{emp.nome_completo || "Sem nome"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{emp.cargo || "-"}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {selectedEmployees.length > 0 && (
                        <p className="text-sm text-primary font-medium">{selectedEmployees.length} funcionário(s) selecionado(s)</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="tipo"
                rules={{ required: "Selecione o tipo" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Avaliação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="periodo_inicio"
                  rules={{ required: "Data inicial é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período Inicial</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodo_fim"
                  rules={{ required: "Data final é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período Final</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações gerais sobre a avaliação..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || (mode === "setor" && selectedEmployees.length === 0)}>
                  {loading
                    ? "Salvando..."
                    : mode === "setor"
                      ? `Criar ${selectedEmployees.length} Avaliação(ões)`
                      : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
