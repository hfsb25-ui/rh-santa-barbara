import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, MoveUp, MoveDown } from "lucide-react";
import { ModuloForm } from "./ModuloForm";
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
import { toast } from "sonner";

export function ModulosList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: modulos, isLoading } = useQuery({
    queryKey: ["modulos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos")
        .select("*, curso:cursos(titulo)")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modulos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos"] });
      toast.success("Módulo excluído com sucesso!");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir módulo");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from("modulos")
        .update({ ordem: newOrder })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos"] });
    },
  });

  const handleEdit = (modulo: any) => {
    setEditingModulo(modulo);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingModulo(null);
  };

  const handleMoveUp = (modulo: any, index: number) => {
    if (index > 0) {
      const prevModulo = modulos![index - 1];
      reorderMutation.mutate({ id: modulo.id, newOrder: prevModulo.ordem });
      reorderMutation.mutate({ id: prevModulo.id, newOrder: modulo.ordem });
    }
  };

  const handleMoveDown = (modulo: any, index: number) => {
    if (modulos && index < modulos.length - 1) {
      const nextModulo = modulos[index + 1];
      reorderMutation.mutate({ id: modulo.id, newOrder: nextModulo.ordem });
      reorderMutation.mutate({ id: nextModulo.id, newOrder: modulo.ordem });
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Módulos Cadastrados</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Módulo
        </Button>
      </div>

      <div className="grid gap-4">
        {modulos?.map((modulo, index) => (
          <Card key={modulo.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {modulo.ordem}. {modulo.titulo}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Curso: {modulo.curso?.titulo}
                  </CardDescription>
                  {modulo.descricao && (
                    <CardDescription className="mt-2">
                      {modulo.descricao}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(modulo, index)}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(modulo, index)}
                    disabled={modulos && index === modulos.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(modulo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(modulo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <ModuloForm
        open={isFormOpen}
        onClose={handleCloseForm}
        modulo={editingModulo}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este módulo? Todas as aulas
              associadas também serão excluídas.
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
