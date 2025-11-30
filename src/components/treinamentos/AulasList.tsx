import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, MoveUp, MoveDown, Play } from "lucide-react";
import { AulaForm } from "./AulaForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function AulasList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: aulas, isLoading } = useQuery({
    queryKey: ["aulas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select(`
          *,
          modulo:modulos(titulo, curso:cursos(titulo))
        `)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas"] });
      toast.success("Aula excluída com sucesso!");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir aula");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from("aulas")
        .update({ ordem: newOrder })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas"] });
    },
  });

  const handleEdit = (aula: any) => {
    setEditingAula(aula);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAula(null);
  };

  const handleMoveUp = (aula: any, index: number) => {
    if (index > 0) {
      const prevAula = aulas![index - 1];
      reorderMutation.mutate({ id: aula.id, newOrder: prevAula.ordem });
      reorderMutation.mutate({ id: prevAula.id, newOrder: aula.ordem });
    }
  };

  const handleMoveDown = (aula: any, index: number) => {
    if (aulas && index < aulas.length - 1) {
      const nextAula = aulas[index + 1];
      reorderMutation.mutate({ id: aula.id, newOrder: nextAula.ordem });
      reorderMutation.mutate({ id: nextAula.id, newOrder: aula.ordem });
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Aulas Cadastradas</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Aula
        </Button>
      </div>

      <div className="grid gap-4">
        {aulas?.map((aula, index) => (
          <Card key={aula.id}>
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 flex-1">
                  <img
                    src={`https://img.youtube.com/vi/${aula.youtube_video_id}/mqdefault.jpg`}
                    alt={aula.titulo}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {aula.ordem}. {aula.titulo}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Curso: {aula.modulo?.curso?.titulo} | Módulo:{" "}
                      {aula.modulo?.titulo}
                    </CardDescription>
                    {aula.descricao && (
                      <CardDescription className="mt-2">
                        {aula.descricao}
                      </CardDescription>
                    )}
                    <div className="flex gap-2 mt-2">
                      {aula.duracao_minutos && (
                        <Badge variant="outline">
                          {aula.duracao_minutos} min
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(aula.youtube_url, "_blank")
                        }
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Assistir
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(aula, index)}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(aula, index)}
                    disabled={aulas && index === aulas.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(aula)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(aula.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <AulaForm
        open={isFormOpen}
        onClose={handleCloseForm}
        aula={editingAula}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aula?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
