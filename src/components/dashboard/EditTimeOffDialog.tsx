import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    const { error } = await supabase
      .from("employees")
      .update({ 
        quantidade_folgas: newAmount,
        ultima_alteracao_folgas: new Date().toISOString()
      })
      .eq("id", employeeId);

    setLoading(false);
    if (error) {
      toast.error("Erro ao atualizar quantidade de folgas");
      console.error(error);
    } else {
      toast.success("Quantidade de folgas atualizada!");
      setOpen(false);
      onUpdated();
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
