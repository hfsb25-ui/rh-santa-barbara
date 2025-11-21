import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/contracts/RichTextEditor";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  titulo: z.string().min(3, "Título é obrigatório"),
  descricao: z.string().min(10, "Descrição é obrigatória"),
  empresa_id: z.string().min(1, "Empresa é obrigatória"),
  setor_id: z.string().optional(),
  funcao_id: z.string().optional(),
  tipo_contrato: z.enum(["fixo", "intermitente", "prestador_servico"]),
  tipo_salario: z.enum(["mensal", "diario", "por_hora"]),
  salario: z.string().optional(),
  exibir_salario: z.boolean(),
  quantidade_vagas: z.string().min(1, "Quantidade é obrigatória"),
  requisitos: z.string().min(10, "Requisitos são obrigatórios"),
  beneficios: z.string().optional(),
  data_fechamento: z.string().optional(),
});

interface VagaFormProps {
  vagaId?: string | null;
  onClose: () => void;
}

export default function VagaForm({ vagaId, onClose }: VagaFormProps) {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [funcoes, setFuncoes] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      empresa_id: "",
      setor_id: "",
      funcao_id: "",
      tipo_contrato: "fixo",
      tipo_salario: "mensal",
      salario: "",
      exibir_salario: false,
      quantidade_vagas: "1",
      requisitos: "",
      beneficios: "",
      data_fechamento: "",
    },
  });

  useEffect(() => {
    fetchData();
    if (vagaId) {
      fetchVaga();
    }
  }, [vagaId]);

  const fetchData = async () => {
    const [empresasData, setoresData, funcoesData] = await Promise.all([
      supabase.from("empresas").select("*").order("nome"),
      supabase.from("setores").select("*").order("nome"),
      supabase.from("funcoes").select("*").order("nome"),
    ]);

    setEmpresas(empresasData.data || []);
    setSetores(setoresData.data || []);
    setFuncoes(funcoesData.data || []);
  };

  const fetchVaga = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", vagaId)
        .single();

      if (error) throw error;
      if (data) {
        form.reset({
          titulo: data.titulo,
          descricao: data.descricao,
          empresa_id: data.empresa_id || "",
          setor_id: data.setor_id || "",
          funcao_id: data.funcao_id || "",
          tipo_contrato: data.tipo_contrato,
          tipo_salario: data.tipo_salario,
          salario: data.salario?.toString() || "",
          exibir_salario: data.exibir_salario,
          quantidade_vagas: data.quantidade_vagas.toString(),
          requisitos: data.requisitos,
          beneficios: data.beneficios || "",
          data_fechamento: data.data_fechamento || "",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar vaga:", error);
      toast.error("Erro ao carregar vaga");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const vagaData: any = {
        titulo: values.titulo,
        descricao: values.descricao,
        empresa_id: values.empresa_id,
        tipo_contrato: values.tipo_contrato,
        tipo_salario: values.tipo_salario,
        exibir_salario: values.exibir_salario,
        quantidade_vagas: parseInt(values.quantidade_vagas),
        requisitos: values.requisitos,
        salario: values.salario ? parseFloat(values.salario) : null,
        setor_id: values.setor_id || null,
        funcao_id: values.funcao_id || null,
        beneficios: values.beneficios || null,
        data_fechamento: values.data_fechamento || null,
      };

      if (vagaId) {
        const { error } = await supabase
          .from("vagas")
          .update(vagaData)
          .eq("id", vagaId);

        if (error) throw error;
        toast.success("Vaga atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vagas")
          .insert([vagaData]);

        if (error) throw error;
        toast.success("Vaga criada com sucesso!");
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar vaga:", error);
      toast.error("Erro ao salvar vaga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vagaId ? "Editar Vaga" : "Nova Vaga"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Vaga *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="empresa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {empresas.map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id}>
                            {empresa.nome}
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
                name="setor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {setores.map((setor) => (
                          <SelectItem key={setor.id} value={setor.id}>
                            {setor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="funcao_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {funcoes.map((funcao) => (
                          <SelectItem key={funcao.id} value={funcao.id}>
                            {funcao.nome}
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
                name="tipo_contrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contrato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixo">Fixo</SelectItem>
                        <SelectItem value="intermitente">Intermitente</SelectItem>
                        <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_salario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Salário *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="por_hora">Por Hora</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade_vagas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Vagas *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="exibir_salario"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Exibir salário no anúncio público
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requisitos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisitos *</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beneficios"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefícios</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_fechamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fechamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {vagaId ? "Atualizar" : "Criar"} Vaga
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
