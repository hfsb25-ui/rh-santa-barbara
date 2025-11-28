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
import { toast } from "sonner";

interface AvaliacaoFormProps {
  avaliacao?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AvaliacaoForm({ avaliacao, onClose, onSuccess }: AvaliacaoFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    defaultValues: {
      employee_id: avaliacao?.employee_id || "",
      tipo: avaliacao?.tipo || "trimestral",
      periodo_inicio: avaliacao?.periodo_inicio || "",
      periodo_fim: avaliacao?.periodo_fim || "",
      observacoes: avaliacao?.observacoes || "",
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo")
        .eq("status", "ativo")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
