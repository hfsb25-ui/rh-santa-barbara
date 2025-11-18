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
import { toast } from "sonner";

const avisoSchema = z.object({
  mensagem: z.string().min(1, "A mensagem é obrigatória"),
  data_expiracao: z.string().min(1, "A data de expiração é obrigatória"),
  setores: z.array(z.string()).min(1, "Selecione pelo menos um setor"),
});

type AvisoFormValues = z.infer<typeof avisoSchema>;

interface AvisoFormProps {
  onSuccess?: () => void;
}

const AvisoForm = ({ onSuccess }: AvisoFormProps) => {
  const [setores, setSetores] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AvisoFormValues>({
    resolver: zodResolver(avisoSchema),
    defaultValues: {
      mensagem: "",
      data_expiracao: "",
      setores: [],
    },
  });

  useEffect(() => {
    fetchSetores();
  }, []);

  const fetchSetores = async () => {
    const { data } = await supabase.from("setores").select("*").order("nome");
    if (data) setSetores(data);
  };

  const onSubmit = async (values: AvisoFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("avisos").insert({
        mensagem: values.mensagem,
        setores: values.setores,
        data_expiracao: values.data_expiracao,
        created_by: userData?.user?.id,
      });

      if (error) throw error;

      toast.success("Aviso criado com sucesso!");
      form.reset();
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

        <FormField
          control={form.control}
          name="setores"
          render={() => (
            <FormItem>
              <FormLabel>Setores que receberão o aviso</FormLabel>
              <div className="space-y-2">
                {setores.map((setor) => (
                  <FormField
                    key={setor.id}
                    control={form.control}
                    name="setores"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={setor.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(setor.nome)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, setor.nome])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== setor.nome
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {setor.nome}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Aviso"}
        </Button>
      </form>
    </Form>
  );
};

export default AvisoForm;
