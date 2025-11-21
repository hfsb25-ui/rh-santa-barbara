import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Manager {
  user_id: string;
  profiles: {
    nome_completo: string;
    email: string;
  } | null;
}

interface EditManagerDialogProps {
  manager: Manager | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditManagerDialog({
  manager,
  open,
  onOpenChange,
  onSuccess,
}: EditManagerDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!manager) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nomeCompleto = formData.get("nome_completo") as string;
    const senha = formData.get("senha") as string;

    try {
      // Chamar edge function para atualizar gestor
      const { error: functionError } = await supabase.functions.invoke('update-manager', {
        body: {
          user_id: manager.user_id,
          nome_completo: nomeCompleto,
          senha: senha.trim() !== '' ? senha : undefined,
        }
      });

      if (functionError) throw functionError;

      // Atualizar profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ nome_completo: nomeCompleto })
        .eq("id", manager.user_id);

      if (profileError) throw profileError;

      toast.success("Gestor atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar gestor:", error);
      toast.error(error.message || "Erro ao atualizar gestor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Gestor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome_completo" className="text-sm font-medium">
              Nome Completo
            </label>
            <Input
              id="nome_completo"
              name="nome_completo"
              required
              defaultValue={manager.profiles?.nome_completo}
              placeholder="Nome completo do gestor"
            />
          </div>

          <div>
            <label htmlFor="senha" className="text-sm font-medium">
              Nova Senha (deixe em branco para manter a atual)
            </label>
            <Input
              id="senha"
              name="senha"
              type="password"
              placeholder="Nova senha (opcional)"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
