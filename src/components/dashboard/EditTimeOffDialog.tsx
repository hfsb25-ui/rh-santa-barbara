import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { toast } from "sonner";

interface EditTimeOffDialogProps {
  employeeId: string;
  employeeName: string;
  currentAmount: number;
  onUpdated: () => void;
}

const EditTimeOffDialog = ({ employeeId, employeeName, currentAmount, onUpdated }: EditTimeOffDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newAmount = parseInt(formData.get("quantidade_folgas") as string);
    const observacao = formData.get("observacao") as string;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update employee
      const { error: updateError } = await supabase
        .from("employees")
        .update({ 
          quantidade_folgas: newAmount,
          ultima_alteracao_folgas: new Date().toISOString()
        })
        .eq("id", employeeId);

      if (updateError) throw updateError;

      // Insert history record
      const { error: historyError } = await supabase
        .from("historico_folgas")
        .insert({
          employee_id: employeeId,
          quantidade_anterior: currentAmount,
          quantidade_nova: newAmount,
          alterado_por: user?.id,
          observacao: observacao || null,
        });

      if (historyError) throw historyError;

      toast.success("Quantidade de folgas atualizada!");
      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error("Erro ao atualizar folgas:", error);
      toast.error("Erro ao atualizar quantidade de folgas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Folgas - {employeeName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Quantidade de Folgas</Label>
            <Input
              name="quantidade_folgas"
              type="number"
              defaultValue={currentAmount}
              required
              min="0"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Quantidade atual: {currentAmount}
            </p>
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              name="observacao"
              placeholder="Motivo da alteração..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTimeOffDialog;
