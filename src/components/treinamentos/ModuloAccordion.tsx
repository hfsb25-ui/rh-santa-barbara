import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Play,
} from "lucide-react";
import { AulaForm } from "./AulaForm";
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

interface ModuloAccordionProps {
  modulo: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ModuloAccordion({
  modulo,
  index,
  onEdit,
  onDelete,
}: ModuloAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAulaFormOpen, setIsAulaFormOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<any>(null);
  const [deleteAulaId, setDeleteAulaId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: aulas, isLoading } = useQuery({
    queryKey: ["aulas", modulo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("modulo_id", modulo.id)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const deleteAulaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas", modulo.id] });
      toast.success("Aula excluída com sucesso!");
      setDeleteAulaId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir aula");
    },
  });

  const handleEditAula = (aula: any) => {
    setEditingAula(aula);
    setIsAulaFormOpen(true);
  };

  const handleCloseAulaForm = () => {
    setIsAulaFormOpen(false);
    setEditingAula(null);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {index + 1}. {modulo.titulo}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t p-3 bg-muted/30">
              {modulo.descricao && (
                <p className="text-sm text-muted-foreground mb-3">
                  {modulo.descricao}
                </p>
              )}

              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Aulas</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAulaFormOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Nova Aula
                </Button>
              </div>

              {isLoading ? (
                <div className="text-sm text-muted-foreground">
                  Carregando aulas...
                </div>
              ) : aulas && aulas.length > 0 ? (
                <div className="space-y-2">
                  {aulas.map((aula, aulaIndex) => (
                    <div
                      key={aula.id}
                      className="flex items-center gap-3 p-2 bg-background rounded border"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${aula.youtube_video_id}/default.jpg`}
                        alt={aula.titulo}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {aulaIndex + 1}. {aula.titulo}
                        </p>
                        {aula.duracao_minutos && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {aula.duracao_minutos} min
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => window.open(aula.youtube_url, "_blank")}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditAula(aula)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteAulaId(aula.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded bg-background">
                  Nenhuma aula cadastrada neste módulo.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AulaForm
        open={isAulaFormOpen}
        onClose={handleCloseAulaForm}
        aula={editingAula}
        moduloId={modulo.id}
      />

      <AlertDialog
        open={!!deleteAulaId}
        onOpenChange={() => setDeleteAulaId(null)}
      >
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
              onClick={() =>
                deleteAulaId && deleteAulaMutation.mutate(deleteAulaId)
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
