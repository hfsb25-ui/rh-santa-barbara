import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Play, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

interface TreinamentosCardProps {
  employeeId: string;
}

export function TreinamentosCard({ employeeId }: TreinamentosCardProps) {
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: cursosDisponiveis } = useQuery({
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
      const { data: progresso } = await supabase
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
        const aulasConcluidas = progresso?.filter(
          (p) => aulasIds.includes(p.aula_id) && p.concluida
        ).length || 0;

        const percentual = totalAulas > 0 ? (aulasConcluidas / totalAulas) * 100 : 0;

        return {
          ...curso,
          totalAulas,
          aulasConcluidas,
          percentual: Math.round(percentual),
        };
      });
    },
  });

  const marcarConcluida = useMutation({
    mutationFn: async (aulaId: string) => {
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
  });

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
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => setSelectedAula(aula)}
                        >
                          <Play className="h-3 w-3 mr-2" />
                          {aula.titulo}
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
            <DialogTitle>{selectedAula?.titulo}</DialogTitle>
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
              <Button
                onClick={() => marcarConcluida.mutate(selectedAula.id)}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Concluída
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
