import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Trash2 } from "lucide-react";
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
import FaultForm from "@/components/forms/FaultForm";
import { formatDateOnlyPtBR } from "@/lib/date";

interface FaultTabProps {
  employeeId: string;
}

const FaultTab = ({ employeeId }: FaultTabProps) => {
  const [faltas, setFaltas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faultToDelete, setFaultToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchFaltas();
  }, [employeeId]);

  const fetchFaltas = async () => {
    const { data } = await supabase
      .from("faltas")
      .select("*")
      .eq("employee_id", employeeId)
      .order("data", { ascending: false });

    setFaltas(data || []);
  };

  const handleSaved = () => {
    setShowForm(false);
    fetchFaltas();
  };

  const handleDeleteClick = (falta: any) => {
    setFaultToDelete(falta);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!faultToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("faltas")
        .delete()
        .eq("id", faultToDelete.id);

      if (error) throw error;

      toast.success("Falta excluída com sucesso");
      setDeleteDialogOpen(false);
      setFaultToDelete(null);
      fetchFaltas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir falta");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Faltas</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Falta
        </Button>
      </div>

      {showForm && (
        <FaultForm
          employeeId={employeeId}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {faltas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma falta registrada
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {faltas.map((falta) => (
              <Card key={falta.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                        {formatDateOnlyPtBR(falta.data)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={falta.justificada ? "default" : "destructive"}>
                        {falta.justificada ? "Justificada" : "Não justificada"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(falta)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                {falta.motivo && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="font-medium">{falta.motivo}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a falta de{" "}
                  <strong>
                    {faultToDelete && formatDateOnlyPtBR(faultToDelete.data)}
                  </strong>
                  ? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default FaultTab;
