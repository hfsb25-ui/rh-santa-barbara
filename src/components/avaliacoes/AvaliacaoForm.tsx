import { useState, useEffect } from "react";
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

interface AvaliacaoFormProps {
  avaliacao?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AvaliacaoForm({ avaliacao, onClose, onSuccess }: AvaliacaoFormProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"individual" | "setor">("individual");
  const [selectedSetor, setSelectedSetor] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

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
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor")
        .eq("status", "ativo")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  // Filter employees by selected sector
  const employeesBySetor = selectedSetor && employees 
    ? employees.filter(emp => emp.setor === selectedSetor) 
    : [];

  const handleSelectAll = () => {
    if (!employeesBySetor || employeesBySetor.length === 0) return;
    
    if (selectedEmployees.length === employeesBySetor.length) {
      setSelectedEmployees([]);
    } else {
      const ids = employeesBySetor
        .filter(emp => emp && emp.id)
        .map(emp => emp.id);
      setSelectedEmployees(ids);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    if (!employeeId) return;
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
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
        <DialogHeader>
          <DialogTitle>
            {avaliacao ? "Editar Avaliação" : "Nova Avaliação"}
          </DialogTitle>
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
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setores?.map((setor) => (
                        <SelectItem key={setor.id} value={setor.nome}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSetor && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Funcionários do setor ({employeesBySetor.length})
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        <CheckSquare className="w-4 h-4 mr-1" />
                        {selectedEmployees.length === employeesBySetor.length 
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
                          return (
                            <div 
                              key={emp.id} 
                              className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleEmployee(emp.id)}
                            >
                              <Checkbox
                                checked={selectedEmployees.includes(emp.id)}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => toggleEmployee(emp.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{emp.nome_completo || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{emp.cargo || '-'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedEmployees.length > 0 && (
                      <p className="text-sm text-primary font-medium">
                        {selectedEmployees.length} funcionário(s) selecionado(s)
                      </p>
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
              <Button 
                type="submit" 
                disabled={loading || (mode === "setor" && selectedEmployees.length === 0)}
              >
                {loading 
                  ? "Salvando..." 
                  : mode === "setor" 
                    ? `Criar ${selectedEmployees.length} Avaliação(ões)` 
                    : "Salvar"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
