import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SectorList() {
  const queryClient = useQueryClient();

  const { data: setores, isLoading } = useQuery({
    queryKey: ["setores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("setores")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Setor excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["setores"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir setor");
    }
  };

  if (isLoading) return <div>Carregando setores...</div>;

  return (
    <div className="space-y-2">
      {setores?.length === 0 ? (
        <p className="text-muted-foreground">Nenhum setor cadastrado</p>
      ) : (
        setores?.map((setor) => (
          <div
            key={setor.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <span>{setor.nome}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o setor "{setor.nome}"?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(setor.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))
      )}
    </div>
  );
}