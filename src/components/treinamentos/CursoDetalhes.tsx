import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ModuloAccordion } from "./ModuloAccordion";
import { ModuloForm } from "./ModuloForm";
import { CursoForm } from "./CursoForm";
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

interface CursoDetalhesProps {
  curso: any;
  open: boolean;
  onClose: () => void;
}

export function CursoDetalhes({ curso, open, onClose }: CursoDetalhesProps) {
  const [isModuloFormOpen, setIsModuloFormOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<any>(null);
  const [isCursoFormOpen, setIsCursoFormOpen] = useState(false);
  const [deleteModuloId, setDeleteModuloId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: modulos, isLoading } = useQuery({
    queryKey: ["modulos", curso?.id],
    queryFn: async () => {
      if (!curso?.id) return [];
      const { data, error } = await supabase
        .from("modulos")
        .select("*")
        .eq("curso_id", curso.id)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!curso?.id,
  });

  const deleteModuloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modulos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos", curso?.id] });
      toast.success("Módulo excluído com sucesso!");
      setDeleteModuloId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir módulo");
    },
  });

  const handleEditModulo = (modulo: any) => {
    setEditingModulo(modulo);
    setIsModuloFormOpen(true);
  };

  const handleCloseModuloForm = () => {
    setIsModuloFormOpen(false);
    setEditingModulo(null);
  };

  if (!curso) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle className="text-xl">{curso.titulo}</SheetTitle>
                {curso.descricao && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {curso.descricao}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {curso.obrigatorio && (
                    <Badge variant="destructive">Obrigatório</Badge>
                  )}
                  {curso.ativo ? (
                    <Badge variant="default">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  {curso.carga_horaria && (
                    <Badge variant="outline">{curso.carga_horaria}h</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCursoFormOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Módulos</h3>
              <Button size="sm" onClick={() => setIsModuloFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Módulo
              </Button>
            </div>

            {isLoading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : modulos && modulos.length > 0 ? (
              <div className="space-y-2">
                {modulos.map((modulo, index) => (
                  <ModuloAccordion
                    key={modulo.id}
                    modulo={modulo}
                    index={index}
                    onEdit={() => handleEditModulo(modulo)}
                    onDelete={() => setDeleteModuloId(modulo.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>Nenhum módulo cadastrado.</p>
                <p className="text-sm mt-1">
                  Clique em "Novo Módulo" para começar.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ModuloForm
        open={isModuloFormOpen}
        onClose={handleCloseModuloForm}
        modulo={editingModulo}
        cursoId={curso.id}
      />

      <CursoForm
        open={isCursoFormOpen}
        onClose={() => setIsCursoFormOpen(false)}
        curso={curso}
      />

      <AlertDialog
        open={!!deleteModuloId}
        onOpenChange={() => setDeleteModuloId(null)}
      >
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
              onClick={() =>
                deleteModuloId && deleteModuloMutation.mutate(deleteModuloId)
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
