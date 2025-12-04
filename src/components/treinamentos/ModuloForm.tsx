import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";

interface ModuloFormProps {
  open: boolean;
  onClose: () => void;
  modulo?: any;
  cursoId: string;
}

export function ModuloForm({ open, onClose, modulo, cursoId }: ModuloFormProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      titulo: "",
      descricao: "",
      ordem: 0,
    },
  });

  useEffect(() => {
    if (modulo) {
      reset({
        titulo: modulo.titulo,
        descricao: modulo.descricao || "",
        ordem: modulo.ordem,
      });
    } else {
      reset({
        titulo: "",
        descricao: "",
        ordem: 0,
      });
    }
  }, [modulo, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        curso_id: cursoId,
      };

      if (modulo) {
        const { error } = await supabase
          .from("modulos")
          .update(payload)
          .eq("id", modulo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modulos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos", cursoId] });
      toast.success(
        modulo
          ? "Módulo atualizado com sucesso!"
          : "Módulo criado com sucesso!"
      );
      onClose();
    },
    onError: () => {
      toast.error("Erro ao salvar módulo");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modulo ? "Editar Módulo" : "Novo Módulo"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" {...register("titulo", { required: true })} />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} rows={3} />
          </div>

          <div>
            <Label htmlFor="ordem">Ordem</Label>
            <Input
              id="ordem"
              type="number"
              {...register("ordem", { valueAsNumber: true })}
            />
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
