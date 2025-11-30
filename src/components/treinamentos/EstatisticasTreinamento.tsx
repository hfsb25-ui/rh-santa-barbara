import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Users, BookOpen, Award, TrendingUp } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function EstatisticasTreinamento() {
  const { data: stats } = useQuery({
    queryKey: ["estatisticas-treinamento"],
    queryFn: async () => {
      // Buscar todos os cursos
      const { data: cursos } = await supabase
        .from("cursos")
        .select("*")
        .eq("ativo", true);

      // Buscar todos os funcionários
      const { data: funcionarios } = await supabase
        .from("employees")
        .select("id, nome_completo, setor, cargo")
        .eq("status", "ativo");

      // Buscar todo o progresso
      const { data: progresso } = await supabase
        .from("progresso_treinamento")
        .select(`
          *,
          aula:aulas(
            id,
            modulo:modulos(curso_id)
          )
        `);

      // Calcular estatísticas gerais
      const totalCursos = cursos?.length || 0;
      const totalAlunos = funcionarios?.length || 0;
      const totalConclusoes = progresso?.filter((p) => p.concluida).length || 0;

      // Calcular taxa média de conclusão
      let totalTaxaConclusao = 0;
      let cursosComProgresso = 0;

      const estatisticasPorCurso = cursos?.map((curso) => {
        const aulasDoCurso = progresso?.filter((p) => {
          const cursoIdDoProgresso = p.aula?.modulo?.curso_id;
          return cursoIdDoProgresso === curso.id;
        }) || [];

        const totalAulas = aulasDoCurso.length;

        const aulasConcluidasTotal =
          aulasDoCurso.filter((p) => p.concluida).length || 0;

        const funcionariosUnicos = new Set(
          aulasDoCurso.map((p) => p.employee_id)
        );

        const funcionariosInscritos = funcionariosUnicos.size;

        const taxaConclusao =
          aulasConcluidasTotal > 0 && totalAulas > 0
            ? (aulasConcluidasTotal / totalAulas) * 100
            : 0;

        if (funcionariosInscritos > 0) {
          totalTaxaConclusao += taxaConclusao;
          cursosComProgresso++;
        }

        return {
          nome: curso.titulo,
          inscritos: funcionariosInscritos,
          conclusoes: Math.round(taxaConclusao),
        };
      });

      const taxaMediaConclusao =
        cursosComProgresso > 0
          ? Math.round(totalTaxaConclusao / cursosComProgresso)
          : 0;

      // Cursos por setor
      const cursosPorSetor: { [key: string]: number } = {};
      cursos?.forEach((curso) => {
        if (curso.setor_id) {
          cursosPorSetor[curso.setor_id] =
            (cursosPorSetor[curso.setor_id] || 0) + 1;
        }
      });

      // Buscar nomes dos setores
      const { data: setores } = await supabase
        .from("setores")
        .select("id, nome");

      const dadosPorSetor = Object.entries(cursosPorSetor).map(
        ([setorId, total]) => {
          const setor = setores?.find((s) => s.id === setorId);
          return {
            setor: setor?.nome || "Sem setor",
            total,
          };
        }
      );

      // Progresso mensal (últimos 6 meses)
      const hoje = new Date();
      const progressoMensal = [];

      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesAno = data.toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        });

        const conclusoesMes =
          progresso?.filter((p) => {
            if (!p.data_conclusao || !p.concluida) return false;
            const dataConclusao = new Date(p.data_conclusao);
            return (
              dataConclusao.getMonth() === data.getMonth() &&
              dataConclusao.getFullYear() === data.getFullYear()
            );
          }).length || 0;

        progressoMensal.push({
          mes: mesAno,
          conclusoes: conclusoesMes,
        });
      }

      return {
        totalCursos,
        totalAlunos,
        totalConclusoes,
        taxaMediaConclusao,
        estatisticasPorCurso: estatisticasPorCurso || [],
        dadosPorSetor: dadosPorSetor || [],
        progressoMensal,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estatísticas de Treinamentos</h2>
        <p className="text-muted-foreground">
          Visão geral e análise dos cursos e alunos
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCursos || 0}</div>
            <p className="text-xs text-muted-foreground">Cursos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAlunos || 0}</div>
            <p className="text-xs text-muted-foreground">Funcionários ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Conclusões
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalConclusoes || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aulas concluídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa Média de Conclusão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.taxaMediaConclusao || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Média geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Barras - Inscritos por Curso */}
        <Card>
          <CardHeader>
            <CardTitle>Alunos Inscritos por Curso</CardTitle>
            <CardDescription>
              Quantidade de funcionários inscritos em cada curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.estatisticasPorCurso || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="nome"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inscritos" fill="#3b82f6" name="Inscritos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Taxa de Conclusão por Curso */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conclusão por Curso</CardTitle>
            <CardDescription>
              Percentual de conclusão de cada curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.estatisticasPorCurso || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.nome}: ${entry.conclusoes}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="conclusoes"
                >
                  {stats?.estatisticasPorCurso?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Cursos por Setor */}
        {stats?.dadosPorSetor && stats.dadosPorSetor.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cursos por Setor</CardTitle>
              <CardDescription>
                Distribuição de cursos pelos setores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dadosPorSetor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="setor" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#10b981" name="Total de Cursos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Linha - Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Conclusões</CardTitle>
            <CardDescription>
              Aulas concluídas nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.progressoMensal || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conclusoes"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Conclusões"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {(!stats?.estatisticasPorCurso ||
        stats.estatisticasPorCurso.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum dado disponível ainda. Cadastre cursos e acompanhe o
            progresso dos funcionários.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
