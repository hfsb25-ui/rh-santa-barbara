import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function RelatoriosTreinamento() {
  const { data: progressData } = useQuery({
    queryKey: ["relatorios-treinamento"],
    queryFn: async () => {
      // Buscar todos os cursos com módulos e aulas
      const { data: cursos } = await supabase
        .from("cursos")
        .select(`
          *,
          modulos:modulos(
            id,
            aulas:aulas(id)
          )
        `)
        .eq("ativo", true);

      // Buscar progresso dos funcionários
      const { data: progresso } = await supabase
        .from("progresso_treinamento")
        .select(`
          *,
          employee:employees(nome_completo, setor, cargo),
          aula:aulas(
            id,
            modulo:modulos(curso_id)
          )
        `);

      // Calcular estatísticas
      const stats = cursos?.map((curso) => {
        const totalAulas = curso.modulos.reduce(
          (sum: number, mod: any) => sum + (mod.aulas?.length || 0),
          0
        );

        const aulasIds = curso.modulos.flatMap((mod: any) =>
          mod.aulas?.map((a: any) => a.id) || []
        );

        const progressoCurso = progresso?.filter((p: any) =>
          aulasIds.includes(p.aula_id)
        );

        const funcionariosUnicos = new Set(
          progressoCurso?.map((p: any) => p.employee_id)
        );

        const aulasConcluidasTotal = progressoCurso?.filter(
          (p: any) => p.concluida
        ).length || 0;

        const taxaConclusao =
          funcionariosUnicos.size > 0 && totalAulas > 0
            ? (aulasConcluidasTotal / (funcionariosUnicos.size * totalAulas)) *
              100
            : 0;

        return {
          curso,
          totalAulas,
          funcionariosInscritos: funcionariosUnicos.size,
          taxaConclusao: Math.round(taxaConclusao),
        };
      });

      return stats;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Relatórios de Treinamento</h2>
        <p className="text-muted-foreground">
          Acompanhe o progresso dos funcionários nos cursos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {progressData?.map((stat) => (
          <Card key={stat.curso.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{stat.curso.titulo}</CardTitle>
                  <CardDescription className="mt-2">
                    {stat.totalAulas} aulas • {stat.funcionariosInscritos}{" "}
                    funcionários inscritos
                  </CardDescription>
                </div>
                {stat.curso.obrigatorio && (
                  <Badge variant="destructive">Obrigatório</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Taxa de Conclusão</span>
                  <span className="font-medium">{stat.taxaConclusao}%</span>
                </div>
                <Progress value={stat.taxaConclusao} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!progressData || progressData.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum curso cadastrado ainda
          </CardContent>
        </Card>
      )}
    </div>
  );
}
