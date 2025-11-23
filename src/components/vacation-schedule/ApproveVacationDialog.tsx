import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VacationForm from "@/components/forms/VacationForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApproveVacationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plannedVacation: any | null;
  onSuccess: () => void;
}

export function ApproveVacationDialog({
  open,
  onOpenChange,
  plannedVacation,
  onSuccess,
}: ApproveVacationDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleVacationSaved = async () => {
    if (!plannedVacation) return;

    setLoading(true);
    
    // Deletar a férias planejada após aprovação
    const { error } = await supabase
      .from("ferias_planejadas")
      .delete()
      .eq("id", plannedVacation.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao remover férias planejadas");
      return;
    }

    toast.success("Férias aprovadas com sucesso!");
    onSuccess();
    onOpenChange(false);
  };

  if (!plannedVacation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aprovar Férias Planejadas</DialogTitle>
        </DialogHeader>
        <VacationForm
          employeeId={plannedVacation.employee_id}
          onSaved={handleVacationSaved}
          onCancel={() => onOpenChange(false)}
          initialData={{
            periodoGozoInicio: plannedVacation.periodo_inicio,
            periodoGozoFim: plannedVacation.periodo_fim,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
