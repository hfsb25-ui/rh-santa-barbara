import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Play, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface TreinamentosCardProps {
  employeeId: string;
}

export function TreinamentosCard({ employeeId }: TreinamentosCardProps) {
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const queryClient = useQueryClient();

  const { data: cursosDisponiveis, data: progresso } = useQuery({
    queryKey: ["cursos-funcionario", employeeId],
    queryFn: async () => {
      // Buscar dados do funcionário
      const { data: employee } = await supabase
        .from("employees")
        .select("setor, cargo, empresa_id")
        .eq("id", employeeId)
        .single();

      if (!employee) return [];

      // Buscar cursos disponíveis
      const { data: cursos } = await supabase
        .from("cursos")
        .select(`
          *,
          modulos:modulos(
            *,
            aulas:aulas(*)
          )
        `)
        .eq("ativo", true);

      // Filtrar cursos relevantes para o funcionário
      const cursosRelevantes = cursos?.filter((curso) => {
        if (!curso.empresa_id && !curso.setor_id && !curso.funcao_id) {
          return true; // Curso para todos
        }

        const matchEmpresa = !curso.empresa_id || curso.empresa_id === employee.empresa_id;
        const matchSetor = !curso.setor_id;
        const matchFuncao = !curso.funcao_id;

        return matchEmpresa && matchSetor && matchFuncao;
      });

      // Buscar progresso
      const { data: progressoData } = await supabase
        .from("progresso_treinamento")
        .select("*")
        .eq("employee_id", employeeId);

      // Calcular progresso para cada curso
      return cursosRelevantes?.map((curso) => {
        const totalAulas = curso.modulos.reduce(
          (sum: number, mod: any) => sum + (mod.aulas?.length || 0),
          0
        );
        const aulasIds = curso.modulos.flatMap((mod: any) =>
          mod.aulas?.map((a: any) => a.id) || []
        );
        const aulasConcluidas = progressoData?.filter(
          (p) => aulasIds.includes(p.aula_id) && p.concluida
        ).length || 0;

        const percentual = totalAulas > 0 ? (aulasConcluidas / totalAulas) * 100 : 0;

        // Adicionar info de conclusão em cada aula
        const modulosComProgresso = curso.modulos.map((modulo: any) => ({
          ...modulo,
          aulas: modulo.aulas.map((aula: any) => ({
            ...aula,
            concluida: progressoData?.some(
              (p) => p.aula_id === aula.id && p.concluida
            ),
          })),
        }));

        return {
          ...curso,
          modulos: modulosComProgresso,
          totalAulas,
          aulasConcluidas,
          percentual: Math.round(percentual),
        };
      });
    },
  });

  // Reset timer when a new lesson is selected
  useEffect(() => {
    if (selectedAula) {
      const durationSeconds = (selectedAula.duracao_minutos || 1) * 60;
      setRemainingSeconds(durationSeconds);
      setVideoStartTime(Date.now());
    } else {
      setVideoStartTime(null);
      setRemainingSeconds(0);
    }
  }, [selectedAula]);

  // Countdown timer
  useEffect(() => {
    if (!videoStartTime || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - videoStartTime) / 1000);
      const durationSeconds = (selectedAula?.duracao_minutos || 1) * 60;
      const remaining = Math.max(0, durationSeconds - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoStartTime, selectedAula]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const canMarkComplete = remainingSeconds <= 0;

  const marcarConcluida = useMutation({
    mutationFn: async (aulaId: string) => {
      if (!canMarkComplete) {
        throw new Error("Aguarde o tempo da aula terminar");
      }
      const { error } = await supabase.from("progresso_treinamento").upsert({
        employee_id: employeeId,
        aula_id: aulaId,
        concluida: true,
        data_conclusao: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos-funcionario"] });
      toast.success("Aula marcada como concluída!");
      setSelectedAula(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao marcar aula");
    },
  });

  const handleOpenAula = async (aula: any) => {
    if (aula.concluida) {
      toast.info("Esta aula já foi concluída");
    }
    setSelectedAula(aula);
    
    // Registrar último acesso
    await supabase.from("progresso_treinamento").upsert({
      employee_id: employeeId,
      aula_id: aula.id,
      ultimo_acesso: new Date().toISOString(),
    }, {
      onConflict: 'employee_id,aula_id',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Meus Treinamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cursosDisponiveis && cursosDisponiveis.length > 0 ? (
            cursosDisponiveis.map((curso) => (
              <div key={curso.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{curso.titulo}</h4>
                      {curso.obrigatorio && (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                      {curso.percentual === 100 && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {curso.aulasConcluidas} de {curso.totalAulas} aulas concluídas
                    </p>
                  </div>
                </div>
                <Progress value={curso.percentual} />
                <div className="space-y-2 mt-2">
                  {curso.modulos.map((modulo: any) => (
                    <div key={modulo.id} className="ml-4 space-y-1">
                      <p className="text-sm font-medium">{modulo.titulo}</p>
                      {modulo.aulas.map((aula: any) => (
                        <Button
                          key={aula.id}
                          variant={aula.concluida ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => handleOpenAula(aula)}
                        >
                          {aula.concluida ? (
                            <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                          ) : (
                            <Play className="h-3 w-3 mr-2" />
                          )}
                          {aula.titulo}
                          {aula.duracao_minutos && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {aula.duracao_minutos} min
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum treinamento disponível no momento
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAula} onOpenChange={() => setSelectedAula(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAula?.titulo}
              {selectedAula?.duracao_minutos && (
                <Badge variant="outline" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedAula.duracao_minutos} min
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedAula && (
            <div className="space-y-4">
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedAula.youtube_video_id}`}
                  title={selectedAula.titulo}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {selectedAula.descricao && (
                <p className="text-sm text-muted-foreground">
                  {selectedAula.descricao}
                </p>
              )}
              
              {selectedAula.concluida ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Aula já concluída</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {!canMarkComplete && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        Assista a aula por completo. Tempo restante:{" "}
                        <strong>{formatTime(remainingSeconds)}</strong>
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={() => marcarConcluida.mutate(selectedAula.id)}
                    className="w-full"
                    disabled={!canMarkComplete || marcarConcluida.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {canMarkComplete
                      ? "Marcar como Concluída"
                      : `Aguarde ${formatTime(remainingSeconds)}`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
