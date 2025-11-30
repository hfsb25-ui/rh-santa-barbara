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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AulaFormProps {
  open: boolean;
  onClose: () => void;
  aula?: any;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function AulaForm({ open, onClose, aula }: AulaFormProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      modulo_id: "",
      titulo: "",
      descricao: "",
      youtube_url: "",
      duracao_minutos: 0,
      ordem: 0,
    },
  });

  const { data: modulos } = useQuery({
    queryKey: ["modulos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("modulos")
        .select("*, curso:cursos(titulo)")
        .order("ordem");
      return data || [];
    },
  });

  useEffect(() => {
    if (aula) {
      reset({
        modulo_id: aula.modulo_id,
        titulo: aula.titulo,
        descricao: aula.descricao || "",
        youtube_url: aula.youtube_url,
        duracao_minutos: aula.duracao_minutos || 0,
        ordem: aula.ordem,
      });
    } else {
      reset({
        modulo_id: "",
        titulo: "",
        descricao: "",
        youtube_url: "",
        duracao_minutos: 0,
        ordem: 0,
      });
    }
  }, [aula, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const videoId = extractYouTubeVideoId(data.youtube_url);
      if (!videoId) {
        throw new Error("URL do YouTube inválida");
      }

      const payload = {
        ...data,
        youtube_video_id: videoId,
      };

      if (aula) {
        const { error } = await supabase
          .from("aulas")
          .update(payload)
          .eq("id", aula.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("aulas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas"] });
      toast.success(
        aula ? "Aula atualizada com sucesso!" : "Aula criada com sucesso!"
      );
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar aula");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aula ? "Editar Aula" : "Nova Aula"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="modulo_id">Módulo *</Label>
            <Select
              value={watch("modulo_id")}
              onValueChange={(value) => setValue("modulo_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um módulo" />
              </SelectTrigger>
              <SelectContent>
                {modulos?.map((modulo) => (
                  <SelectItem key={modulo.id} value={modulo.id}>
                    {modulo.curso?.titulo} - {modulo.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" {...register("titulo", { required: true })} />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} rows={3} />
          </div>

          <div>
            <Label htmlFor="youtube_url">URL do YouTube *</Label>
            <Input
              id="youtube_url"
              placeholder="https://www.youtube.com/watch?v=..."
              {...register("youtube_url", { required: true })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Cole o link completo do vídeo do YouTube
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duracao_minutos">Duração (minutos)</Label>
              <Input
                id="duracao_minutos"
                type="number"
                {...register("duracao_minutos", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                {...register("ordem", { valueAsNumber: true })}
              />
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
