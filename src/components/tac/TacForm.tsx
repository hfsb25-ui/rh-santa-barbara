import { useState, useEffect } from "react";
import { todayISO } from "@/lib/date";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileWarning, Send } from "lucide-react";

const tacSchema = z.object({
  employee_id: z.string().min(1, "Selecione um funcionário"),
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  tipo: z.enum(["advertencia_verbal", "advertencia_escrita", "suspensao", "compromisso"]),
  data_ocorrencia: z.string().min(1, "Data da ocorrência é obrigatória"),
  descricao: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  observacoes: z.string().optional(),
});

type TacFormValues = z.infer<typeof tacSchema>;

interface TacFormProps {
  onSuccess: () => void;
}

const tipoLabels = {
  advertencia_verbal: "Advertência Verbal",
  advertencia_escrita: "Advertência Escrita",
  suspensao: "Suspensão",
  compromisso: "Termo de Compromisso",
};

const TacForm = ({ onSuccess }: TacFormProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const form = useForm<TacFormValues>({
    resolver: zodResolver(tacSchema),
    defaultValues: {
      employee_id: "",
      titulo: "",
      tipo: "advertencia_verbal",
      data_ocorrencia: todayISO(),
      descricao: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, nome_completo, cargo, setor, empresa_id, empresas(nome)")
      .in("status", ["ativo", "ferias"])
      .order("nome_completo");

    if (data) {
      setEmployees(data);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setSelectedEmployee(employee);
    form.setValue("employee_id", employeeId);
  };

  const onSubmit = async (values: TacFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("tacs").insert({
        employee_id: values.employee_id,
        titulo: values.titulo,
        tipo: values.tipo,
        data_ocorrencia: values.data_ocorrencia,
        descricao: values.descricao,
        observacoes: values.observacoes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("TAC publicado com sucesso!");
      form.reset();
      setSelectedEmployee(null);
      onSuccess();
    } catch (error) {
      console.error("Error creating TAC:", error);
      toast.error("Erro ao criar TAC");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-warning" />
          Novo Termo de Ajustamento de Conduta
        </CardTitle>
        <CardDescription>
          Preencha os dados do TAC. O funcionário receberá uma notificação na sua dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select onValueChange={handleEmployeeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome_completo} - {emp.cargo}
                          {emp.empresas?.nome && ` (${emp.empresas.nome})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedEmployee && (
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p><strong>Setor:</strong> {selectedEmployee.setor || "Não informado"}</p>
                <p><strong>Cargo:</strong> {selectedEmployee.cargo}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do TAC</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(tipoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Advertência por atraso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_ocorrencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Ocorrência</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Termo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o motivo e as condições do termo..."
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Publicando..." : "Publicar TAC"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TacForm;
