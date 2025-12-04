import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { CursoForm } from "./CursoForm";
import { CursoDetalhes } from "./CursoDetalhes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function CursosList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: cursos, isLoading } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select(`
          *,
          setor:setores(nome),
          funcao:funcoes(nome),
          empresa:empresas(nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cursos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      toast.success("Curso excluído com sucesso!");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir curso");
    },
  });

  const handleEdit = (curso: any) => {
    setEditingCurso(curso);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCurso(null);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cursos Cadastrados</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cursos?.map((curso) => (
          <Card key={curso.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="line-clamp-1">{curso.titulo}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {curso.descricao}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
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
                {curso.empresa && (
                  <Badge variant="outline">{curso.empresa.nome}</Badge>
                )}
                {curso.setor && (
                  <Badge variant="outline">{curso.setor.nome}</Badge>
                )}
                {curso.funcao && (
                  <Badge variant="outline">{curso.funcao.nome}</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedCurso(curso)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(curso)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteId(curso.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CursoForm
        open={isFormOpen}
        onClose={handleCloseForm}
        curso={editingCurso}
      />

      <CursoDetalhes
        curso={selectedCurso}
        open={!!selectedCurso}
        onClose={() => setSelectedCurso(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este curso? Esta ação não pode ser
              desfeita e todos os módulos e aulas associados serão excluídos.
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
