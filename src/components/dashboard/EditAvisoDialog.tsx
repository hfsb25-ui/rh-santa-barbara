import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface EditAvisoDialogProps {
  aviso: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EditAvisoDialog = ({ aviso, open, onOpenChange, onSuccess }: EditAvisoDialogProps) => {
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

  useEffect(() => {
    if (aviso) {
      form.reset({
        mensagem: aviso.mensagem,
        data_expiracao: aviso.data_expiracao,
        setores: aviso.setores,
      });
    }
  }, [aviso, form]);

  const fetchSetores = async () => {
    const { data } = await supabase.from("setores").select("*").order("nome");
    if (data) setSetores(data);
  };

  const onSubmit = async (values: AvisoFormValues) => {
    if (!aviso?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("avisos")
        .update({
          mensagem: values.mensagem,
          setores: values.setores,
          data_expiracao: values.data_expiracao,
        })
        .eq("id", aviso.id);

      if (error) throw error;

      toast.success("Aviso atualizado com sucesso!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating aviso:", error);
      toast.error("Erro ao atualizar aviso");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Aviso</DialogTitle>
        </DialogHeader>

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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAvisoDialog;
