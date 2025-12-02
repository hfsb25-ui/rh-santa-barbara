import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, FileText, Save, CheckCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ChecklistExecucaoProps {
  checklistId: string;
  onUpdate: () => void;
}

export function ChecklistExecucao({ checklistId, onUpdate }: ChecklistExecucaoProps) {
  const [checklist, setChecklist] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchChecklist = async () => {
    try {
      const { data: checklistData, error: checklistError } = await supabase
        .from("plano_checklist_funcionario")
        .select(`
          *,
          employee:employees(nome_completo, cargo, setor)
        `)
        .eq("id", checklistId)
        .single();

      if (checklistError) throw checklistError;

      const { data: itensData, error: itensError } = await supabase
        .from("plano_checklist_funcionario_itens")
        .select("*")
        .eq("checklist_funcionario_id", checklistId)
        .order("ordem");

      if (itensError) throw itensError;

      setChecklist(checklistData);
      setItens(itensData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar checklist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [checklistId]);

  const toggleItem = async (itemId: string, concluido: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("plano_checklist_funcionario_itens")
        .update({
          concluido,
          data_conclusao: concluido ? new Date().toISOString() : null,
          concluido_por: concluido ? user?.id : null,
        })
        .eq("id", itemId);

      if (error) throw error;

      setItens((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                concluido,
                data_conclusao: concluido ? new Date().toISOString() : null,
              }
            : item
        )
      );
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateObservacao = async (itemId: string, observacoes: string) => {
    try {
      const { error } = await supabase
        .from("plano_checklist_funcionario_itens")
        .update({ observacoes })
        .eq("id", itemId);

      if (error) throw error;

      setItens((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, observacoes } : item
        )
      );
    } catch (error: any) {
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const concluirChecklist = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("plano_checklist_funcionario")
        .update({
          status: "concluido",
          data_conclusao: new Date().toISOString().split("T")[0],
        })
        .eq("id", checklistId);

      if (error) throw error;

      toast({
        title: "Checklist concluído",
        description: "O processo foi finalizado com sucesso.",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao concluir checklist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getItemStatus = (item: any) => {
    if (item.concluido) return "concluido";
    if (!item.prazo_dias || !checklist?.data_inicio) return "pendente";
    
    const prazoData = addDays(new Date(checklist.data_inicio), item.prazo_dias);
    if (isPast(prazoData)) return "atrasado";
    return "pendente";
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const todosConcluidos = itens.every((item) => item.concluido);
  const obrigatoriosConcluidos = itens
    .filter((item) => item.obrigatorio)
    .every((item) => item.concluido);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {itens.filter((i) => i.concluido).length}
          </div>
          <div className="text-xs text-muted-foreground">Concluídos</div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-amber-600">
            {itens.filter((i) => !i.concluido).length}
          </div>
          <div className="text-xs text-muted-foreground">Pendentes</div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {itens.filter((i) => getItemStatus(i) === "atrasado").length}
          </div>
          <div className="text-xs text-muted-foreground">Atrasados</div>
        </div>
      </div>

      <div className="space-y-3">
        {itens.map((item) => {
          const status = getItemStatus(item);
          const prazoData = item.prazo_dias && checklist?.data_inicio
            ? addDays(new Date(checklist.data_inicio), item.prazo_dias)
            : null;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                status === "concluido"
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                  : status === "atrasado"
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                  : "bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.concluido}
                  onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          item.concluido ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.titulo}
                      </span>
                      {item.obrigatorio && (
                        <Badge variant="secondary" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "concluido" && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                      {status === "atrasado" && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Atrasado
                        </Badge>
                      )}
                      {status === "pendente" && prazoData && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Prazo: {format(prazoData, "dd/MM", { locale: ptBR })}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {item.descricao && (
                    <p className="text-sm text-muted-foreground">{item.descricao}</p>
                  )}

                  {item.concluido && item.data_conclusao && (
                    <p className="text-xs text-muted-foreground">
                      Concluído em:{" "}
                      {format(new Date(item.data_conclusao), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}

                  <div className="pt-2">
                    <Textarea
                      placeholder="Observações..."
                      value={item.observacoes || ""}
                      onChange={(e) => {
                        setItens((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, observacoes: e.target.value } : i
                          )
                        );
                      }}
                      onBlur={() => updateObservacao(item.id, item.observacoes || "")}
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={!obrigatoriosConcluidos || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Concluir Processo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Concluir processo?</AlertDialogTitle>
              <AlertDialogDescription>
                {todosConcluidos
                  ? "Todos os itens foram concluídos. Deseja finalizar este processo?"
                  : `Ainda existem ${itens.filter((i) => !i.concluido).length} itens pendentes. Deseja finalizar mesmo assim?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={concluirChecklist}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
