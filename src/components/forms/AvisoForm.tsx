import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, AlertCircle, Info, AlertTriangle, Megaphone, Calendar, FileText, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const avisoSchema = z.object({
  mensagem: z.string().min(1, "A mensagem é obrigatória"),
  data_expiracao: z.string().min(1, "A data de expiração é obrigatória"),
  prioridade: z.string().default("media"),
  categoria: z.string().default("comunicado"),
  data_publicacao: z.string().optional(),
  tipo_destinatario: z.string().default("setor"),
  setores: z.array(z.string()).optional(),
  empresa_id: z.string().optional(),
  funcionarios_ids: z.array(z.string()).optional(),
});

type AvisoFormValues = z.infer<typeof avisoSchema>;

interface AvisoFormProps {
  onSuccess?: () => void;
}

const prioridadeOptions = [
  { value: "baixa", label: "Baixa", color: "bg-green-500" },
  { value: "media", label: "Média", color: "bg-yellow-500" },
  { value: "alta", label: "Alta", color: "bg-orange-500" },
  { value: "urgente", label: "Urgente", color: "bg-red-500" },
];

const categoriaOptions = [
  { value: "comunicado", label: "Comunicado", icon: Megaphone },
  { value: "lembrete", label: "Lembrete", icon: Calendar },
  { value: "alerta", label: "Alerta", icon: AlertTriangle },
  { value: "evento", label: "Evento", icon: Calendar },
  { value: "rh", label: "RH", icon: FileText },
  { value: "info", label: "Informação", icon: Info },
];

const AvisoForm = ({ onSuccess }: AvisoFormProps) => {
  const [setores, setSetores] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<AvisoFormValues>({
    resolver: zodResolver(avisoSchema),
    defaultValues: {
      mensagem: "",
      data_expiracao: "",
      prioridade: "media",
      categoria: "comunicado",
      data_publicacao: "",
      tipo_destinatario: "setor",
      setores: [],
      empresa_id: "",
      funcionarios_ids: [],
    },
  });

  const tipoDestinatario = form.watch("tipo_destinatario");

  useEffect(() => {
    fetchSetores();
    fetchEmpresas();
    fetchFuncionarios();
  }, []);

  const fetchSetores = async () => {
    const { data } = await supabase.from("setores").select("*").order("nome");
    if (data) setSetores(data);
  };

  const fetchEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("nome");
    if (data) setEmpresas(data);
  };

  const fetchFuncionarios = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, nome_completo, setor")
      .eq("status", "ativo")
      .order("nome_completo");
    if (data) setFuncionarios(data);
  };

  const uploadAnexo = async (): Promise<string | null> => {
    if (!anexoFile) return null;

    setIsUploading(true);
    try {
      const fileExt = anexoFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("avisos-anexos")
        .upload(fileName, anexoFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avisos-anexos")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error("Erro ao fazer upload do anexo");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: AvisoFormValues) => {
    // Validate destinatários
    if (values.tipo_destinatario === "setor" && (!values.setores || values.setores.length === 0)) {
      toast.error("Selecione pelo menos um setor");
      return;
    }
    if (values.tipo_destinatario === "empresa" && !values.empresa_id) {
      toast.error("Selecione uma empresa");
      return;
    }
    if (values.tipo_destinatario === "funcionario" && (!values.funcionarios_ids || values.funcionarios_ids.length === 0)) {
      toast.error("Selecione pelo menos um funcionário");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      let anexoUrl = null;
      if (anexoFile) {
        anexoUrl = await uploadAnexo();
      }

      const { error } = await supabase.from("avisos").insert({
        mensagem: values.mensagem,
        data_expiracao: values.data_expiracao,
        prioridade: values.prioridade,
        categoria: values.categoria,
        data_publicacao: values.data_publicacao || null,
        tipo_destinatario: values.tipo_destinatario,
        setores: values.tipo_destinatario === "setor" ? values.setores : [],
        empresa_id: values.tipo_destinatario === "empresa" ? values.empresa_id : null,
        funcionarios_ids: values.tipo_destinatario === "funcionario" ? values.funcionarios_ids : [],
        anexo_url: anexoUrl,
        created_by: userData?.user?.id,
      });

      if (error) throw error;

      toast.success("Aviso criado com sucesso!");
      form.reset();
      setAnexoFile(null);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating aviso:", error);
      toast.error("Erro ao criar aviso");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="mensagem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem do Aviso</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Digite a mensagem do aviso..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="prioridade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {prioridadeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${option.color}`} />
                          {option.label}
                        </div>
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
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_publicacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Publicação (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para publicar imediatamente
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_expiracao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Expiração</FormLabel>
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
          name="tipo_destinatario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Destinatário</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="todos">Todos os funcionários</SelectItem>
                  <SelectItem value="setor">Por Setor</SelectItem>
                  <SelectItem value="empresa">Por Empresa</SelectItem>
                  <SelectItem value="funcionario">Funcionários Específicos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipoDestinatario === "setor" && (
          <FormField
            control={form.control}
            name="setores"
            render={() => (
              <FormItem>
                <FormLabel>Setores que receberão o aviso</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {setores.map((setor) => (
                    <FormField
                      key={setor.id}
                      control={form.control}
                      name="setores"
                      render={({ field }) => (
                        <FormItem
                          key={setor.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(setor.nome)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), setor.nome])
                                  : field.onChange(
                                      field.value?.filter((value) => value !== setor.nome)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{setor.nome}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {tipoDestinatario === "empresa" && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
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
        )}

        {tipoDestinatario === "funcionario" && (
          <FormField
            control={form.control}
            name="funcionarios_ids"
            render={() => (
              <FormItem>
                <FormLabel>Funcionários</FormLabel>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {funcionarios.map((func) => (
                    <FormField
                      key={func.id}
                      control={form.control}
                      name="funcionarios_ids"
                      render={({ field }) => (
                        <FormItem
                          key={func.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(func.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), func.id])
                                  : field.onChange(
                                      field.value?.filter((value) => value !== func.id)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {func.nome_completo}
                            {func.setor && (
                              <span className="text-muted-foreground ml-2">({func.setor})</span>
                            )}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Anexo */}
        <div className="space-y-2">
          <FormLabel>Anexo (opcional)</FormLabel>
          {anexoFile ? (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{anexoFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAnexoFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setAnexoFile(e.target.files?.[0] || null)}
                className="hidden"
                id="anexo-upload"
              />
              <label htmlFor="anexo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Selecionar arquivo</span>
                </div>
              </label>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PDF, Word, Excel, Imagens
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting || isUploading} className="w-full">
          {isSubmitting ? "Criando..." : "Criar Aviso"}
        </Button>
      </form>
    </Form>
  );
};

export default AvisoForm;
