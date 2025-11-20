import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Funcao {
  id: string;
  nome: string;
  cbo: string | null;
}

interface FuncaoListProps {
  funcoes: Funcao[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDeleted: () => void;
}

const FuncaoList = ({ funcoes, isLoading, onEdit, onDeleted }: FuncaoListProps) => {
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a função "${nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("funcoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Função excluída com sucesso!");
      onDeleted();
    } catch (error) {
      console.error("Erro ao excluir função:", error);
      toast.error("Erro ao excluir função");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!funcoes || funcoes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma função cadastrada
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome da Função</TableHead>
          <TableHead>CBO</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {funcoes.map((funcao) => (
          <TableRow key={funcao.id}>
            <TableCell className="font-medium">{funcao.nome}</TableCell>
            <TableCell>{funcao.cbo || "-"}</TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(funcao.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(funcao.id, funcao.nome)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default FuncaoList;
