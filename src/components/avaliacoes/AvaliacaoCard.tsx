import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Edit, Trash2, Eye, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AvaliacaoCardProps {
  avaliacao: any;
  onEdit: (avaliacao: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function AvaliacaoCard({ avaliacao, onEdit, onDelete, onRefresh }: AvaliacaoCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvaliarDialog, setShowAvaliarDialog] = useState(false);
  const [notas, setNotas] = useState<any>({});

  const { data: criterios } = useQuery({
    queryKey: ["criterios-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criterios_avaliacao")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const { data: notasExistentes } = useQuery({
    queryKey: ["notas-avaliacao", avaliacao.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_avaliacao")
        .select("*, criterio:criterios_avaliacao(*)")
        .eq("avaliacao_id", avaliacao.id);

      if (error) throw error;
      return data;
    },
    enabled: showDetails,
  });

  const statusColors = {
    pendente: "bg-yellow-500",
    em_andamento: "bg-blue-500",
    concluida: "bg-green-500",
  };

  const statusLabels = {
    pendente: "Pendente",
    em_andamento: "Em Andamento",
    concluida: "Concluída",
  };

  const tipoLabels = {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  const handleAvaliar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Inserir/atualizar notas
      for (const criterioId of Object.keys(notas)) {
        const nota = notas[criterioId];
        
        const { error } = await supabase
          .from("notas_avaliacao")
          .upsert({
            avaliacao_id: avaliacao.id,
            criterio_id: criterioId,
            nota_gestor: nota.nota,
            comentario_gestor: nota.comentario,
          }, {
            onConflict: "avaliacao_id,criterio_id"
          });

        if (error) throw error;
      }

      // Calcular nota final
      const notaValues = Object.values(notas).map((n: any) => n.nota).filter(Boolean);
      const notaFinal = notaValues.length > 0
        ? Number((notaValues.reduce((a: number, b: number) => a + b, 0) / notaValues.length).toFixed(2))
        : null;

      // Atualizar avaliação
      const { error } = await supabase
        .from("avaliacoes_desempenho")
        .update({
          status: "concluida",
          nota_final: notaFinal,
          avaliacao_gestor_concluida: true,
        })
        .eq("id", avaliacao.id);

      if (error) throw error;

      toast.success("Avaliação concluída com sucesso!");
      setShowAvaliarDialog(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao salvar avaliação: " + error.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avaliacao.employee?.foto_url} />
                <AvatarFallback>
                  {avaliacao.employee?.nome_completo?.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{avaliacao.employee?.nome_completo}</h3>
                <p className="text-sm text-muted-foreground">
                  {avaliacao.employee?.cargo} - {avaliacao.employee?.setor}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[avaliacao.status as keyof typeof statusColors]}>
                {statusLabels[avaliacao.status as keyof typeof statusLabels]}
              </Badge>
              <Badge variant="outline">{tipoLabels[avaliacao.tipo as keyof typeof tipoLabels]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium">
                {new Date(avaliacao.periodo_inicio).toLocaleDateString()} até{" "}
                {new Date(avaliacao.periodo_fim).toLocaleDateString()}
              </span>
            </div>

            {avaliacao.nota_final && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Nota Final:</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-lg">{avaliacao.nota_final}</span>
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetails(true)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver Detalhes
              </Button>

              {avaliacao.status !== "concluida" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowAvaliarDialog(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Avaliar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(avaliacao)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Informações Gerais</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Funcionário:</span>
                  <p className="font-medium">{avaliacao.employee?.nome_completo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{tipoLabels[avaliacao.tipo as keyof typeof tipoLabels]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">{statusLabels[avaliacao.status as keyof typeof statusLabels]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nota Final:</span>
                  <p className="font-medium">{avaliacao.nota_final || "Não avaliado"}</p>
                </div>
              </div>
            </div>

            {notasExistentes && notasExistentes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Critérios Avaliados</h4>
                <div className="space-y-3">
                  {notasExistentes.map((nota) => (
                    <div key={nota.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{nota.criterio?.nome}</p>
                          <p className="text-xs text-muted-foreground">{nota.criterio?.descricao}</p>
                        </div>
                        <div className="flex gap-4">
                          {nota.nota_funcionario && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Auto</p>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">{nota.nota_funcionario}</span>
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                              </div>
                            </div>
                          )}
                          {nota.nota_gestor && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Gestor</p>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">{nota.nota_gestor}</span>
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {(nota.comentario_funcionario || nota.comentario_gestor) && (
                        <div className="text-xs space-y-1">
                          {nota.comentario_funcionario && (
                            <p><span className="font-medium">Funcionário:</span> {nota.comentario_funcionario}</p>
                          )}
                          {nota.comentario_gestor && (
                            <p><span className="font-medium">Gestor:</span> {nota.comentario_gestor}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {avaliacao.observacoes && (
              <div>
                <h4 className="font-semibold mb-2">Observações</h4>
                <p className="text-sm text-muted-foreground">{avaliacao.observacoes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Avaliar */}
      <Dialog open={showAvaliarDialog} onOpenChange={setShowAvaliarDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliar Desempenho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {criterios?.map((criterio) => (
              <div key={criterio.id} className="border rounded-lg p-4 space-y-3">
                <div>
                  <Label className="font-semibold">{criterio.nome}</Label>
                  {criterio.descricao && (
                    <p className="text-xs text-muted-foreground">{criterio.descricao}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nota (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Digite a nota"
                    value={notas[criterio.id]?.nota || ""}
                    onChange={(e) => setNotas({
                      ...notas,
                      [criterio.id]: {
                        ...notas[criterio.id],
                        nota: parseInt(e.target.value),
                      },
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comentário</Label>
                  <Textarea
                    placeholder="Adicione um comentário sobre este critério..."
                    value={notas[criterio.id]?.comentario || ""}
                    onChange={(e) => setNotas({
                      ...notas,
                      [criterio.id]: {
                        ...notas[criterio.id],
                        comentario: e.target.value,
                      },
                    })}
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAvaliarDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAvaliar}>
                Concluir Avaliação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onDelete(avaliacao.id);
              setShowDeleteDialog(false);
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
