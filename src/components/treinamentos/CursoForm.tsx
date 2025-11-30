import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CursoFormProps {
  open: boolean;
  onClose: () => void;
  curso?: any;
}

export function CursoForm({ open, onClose, curso }: CursoFormProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      titulo: "",
      descricao: "",
      carga_horaria: 0,
      empresa_id: "all",
      setor_id: "all",
      funcao_id: "all",
      obrigatorio: false,
      ativo: true,
    },
  });

  const { data: empresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .order("nome");
      return data || [];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["setores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("setores")
        .select("*")
        .order("nome");
      return data || [];
    },
  });

  const { data: funcoes } = useQuery({
    queryKey: ["funcoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("funcoes")
        .select("*")
        .order("nome");
      return data || [];
    },
  });

  useEffect(() => {
    if (curso) {
      reset({
        titulo: curso.titulo,
        descricao: curso.descricao || "",
        carga_horaria: curso.carga_horaria || 0,
        empresa_id: curso.empresa_id || "all",
        setor_id: curso.setor_id || "all",
        funcao_id: curso.funcao_id || "all",
        obrigatorio: curso.obrigatorio,
        ativo: curso.ativo,
      });
    } else {
      reset({
        titulo: "",
        descricao: "",
        carga_horaria: 0,
        empresa_id: "all",
        setor_id: "all",
        funcao_id: "all",
        obrigatorio: false,
        ativo: true,
      });
    }
  }, [curso, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        empresa_id: data.empresa_id === "all" ? null : data.empresa_id,
        setor_id: data.setor_id === "all" ? null : data.setor_id,
        funcao_id: data.funcao_id === "all" ? null : data.funcao_id,
      };

      if (curso) {
        const { error } = await supabase
          .from("cursos")
          .update(payload)
          .eq("id", curso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cursos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      toast.success(
        curso ? "Curso atualizado com sucesso!" : "Curso criado com sucesso!"
      );
      onClose();
    },
    onError: () => {
      toast.error("Erro ao salvar curso");
    },
  });

  const obrigatorio = watch("obrigatorio");
  const ativo = watch("ativo");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {curso ? "Editar Curso" : "Novo Curso"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" {...register("titulo", { required: true })} />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} rows={3} />
          </div>

          <div>
            <Label htmlFor="carga_horaria">Carga Horária (horas)</Label>
            <Input
              id="carga_horaria"
              type="number"
              min="0"
              {...register("carga_horaria", { valueAsNumber: true })}
              placeholder="Ex: 40"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={watch("empresa_id")}
                onValueChange={(value) => setValue("empresa_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {empresas?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="setor_id">Setor</Label>
              <Select
                value={watch("setor_id")}
                onValueChange={(value) => setValue("setor_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {setores?.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="funcao_id">Função</Label>
              <Select
                value={watch("funcao_id")}
                onValueChange={(value) => setValue("funcao_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {funcoes?.map((funcao) => (
                    <SelectItem key={funcao.id} value={funcao.id}>
                      {funcao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="obrigatorio"
                checked={obrigatorio}
                onCheckedChange={(checked) => setValue("obrigatorio", checked)}
              />
              <Label htmlFor="obrigatorio">Curso Obrigatório</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={(checked) => setValue("ativo", checked)}
              />
              <Label htmlFor="ativo">Curso Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
