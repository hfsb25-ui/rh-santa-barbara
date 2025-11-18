import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Bell } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import EditAvisoDialog from "./EditAvisoDialog";

interface ManageAvisosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ManageAvisosDialog = ({ open, onOpenChange }: ManageAvisosDialogProps) => {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editAviso, setEditAviso] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      fetchAvisos();
    }
  }, [open]);

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvisos(data || []);
    } catch (error) {
      console.error("Error fetching avisos:", error);
      toast.error("Erro ao carregar avisos");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("avisos").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Aviso excluído com sucesso!");
      setDeleteId(null);
      fetchAvisos();
    } catch (error) {
      console.error("Error deleting aviso:", error);
      toast.error("Erro ao excluir aviso");
    }
  };

  const isExpired = (dataExpiracao: string) => {
    return new Date(dataExpiracao) < new Date();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Gerenciar Avisos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {avisos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum aviso cadastrado
              </p>
            ) : (
              avisos.map((aviso) => (
                <Card key={aviso.id} className={isExpired(aviso.data_expiracao) ? "opacity-60" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <span>Aviso</span>
                        {isExpired(aviso.data_expiracao) ? (
                          <Badge variant="secondary">Expirado</Badge>
                        ) : (
                          <Badge variant="default">Ativo</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditAviso(aviso)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(aviso.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{aviso.mensagem}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">Setores:</span>
                      {aviso.setores.map((setor: string, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {setor}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Válido até: {new Date(aviso.data_expiracao).toLocaleDateString("pt-BR")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <EditAvisoDialog
        aviso={editAviso}
        open={!!editAviso}
        onOpenChange={(open) => !open && setEditAviso(null)}
        onSuccess={() => {
          setEditAviso(null);
          fetchAvisos();
        }}
      />
    </>
  );
};

export default ManageAvisosDialog;
