import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload, CheckCircle } from "lucide-react";

const formSchema = z.object({
  nome_completo: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  endereco: z.string().optional(),
  carta_apresentacao: z.string().optional(),
  experiencia_resumo: z.string().optional(),
});

interface CandidaturaFormProps {
  vagaId: string;
  vagaTitulo: string;
  onSuccess: () => void;
}

export default function CandidaturaForm({ vagaId, vagaTitulo, onSuccess }: CandidaturaFormProps) {
  const [loading, setLoading] = useState(false);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      telefone: "",
      cpf: "",
      data_nascimento: "",
      endereco: "",
      carta_apresentacao: "",
      experiencia_resumo: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      let curriculum_url = null;

      // Upload do currículo se houver
      if (curriculumFile) {
        const fileExt = curriculumFile.name.split('.').pop();
        const fileName = `${vagaId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('curriculos')
          .upload(fileName, curriculumFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('curriculos')
          .getPublicUrl(fileName);

        curriculum_url = urlData.publicUrl;
      }

      // Criar candidatura
      const { error } = await supabase
        .from('candidaturas')
        .insert([{
          vaga_id: vagaId,
          nome_completo: values.nome_completo,
          email: values.email,
          telefone: values.telefone,
          cpf: values.cpf,
          data_nascimento: values.data_nascimento,
          endereco: values.endereco,
          carta_apresentacao: values.carta_apresentacao,
          experiencia_resumo: values.experiencia_resumo,
          curriculum_url,
        }]);

      if (error) throw error;

      setSuccess(true);
      toast.success("Candidatura enviada com sucesso!");
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error("Erro ao enviar candidatura:", error);
      toast.error("Erro ao enviar candidatura. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Candidatura Enviada!</h2>
          <p className="text-muted-foreground">
            Sua candidatura para {vagaTitulo} foi enviada com sucesso. 
            Entraremos em contato em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidatar-se para: {vagaTitulo}</CardTitle>
        <CardDescription>Preencha seus dados para enviar sua candidatura</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento *</FormLabel>
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
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Currículo (PDF)</FormLabel>
              <div className="mt-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCurriculumFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="carta_apresentacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carta de Apresentação</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experiencia_resumo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumo da Experiência</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Candidatura"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
