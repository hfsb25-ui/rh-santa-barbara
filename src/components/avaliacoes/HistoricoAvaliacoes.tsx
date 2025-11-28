import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HistoricoAvaliacoesProps {
  employeeId: string;
}

export default function HistoricoAvaliacoes({ employeeId }: HistoricoAvaliacoesProps) {
  const { data: avaliacoes } = useQuery({
    queryKey: ["historico-avaliacoes", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("status", "concluida")
        .order("periodo_fim", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: notas } = useQuery({
    queryKey: ["notas-historico", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_avaliacao")
        .select(`
          *,
          avaliacao:avaliacoes_desempenho!inner(employee_id, periodo_fim, status),
          criterio:criterios_avaliacao(nome)
        `)
        .eq("avaliacao.employee_id", employeeId)
        .eq("avaliacao.status", "concluida");

      if (error) throw error;
      return data;
    },
  });

  const chartData = avaliacoes?.map((av) => ({
    periodo: new Date(av.periodo_fim).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
    nota: Number(av.nota_final || 0),
  })) || [];

  const mediaGeral = avaliacoes?.length
    ? (avaliacoes.reduce((sum, av) => sum + Number(av.nota_final || 0), 0) / avaliacoes.length).toFixed(2)
    : "0";

  const ultimaNota = Number(avaliacoes?.[avaliacoes.length - 1]?.nota_final || 0);
  const penultimaNota = Number(avaliacoes?.[avaliacoes.length - 2]?.nota_final || ultimaNota);
  const tendencia = ultimaNota - penultimaNota;

  const tipoLabels = {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avaliacoes?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{mediaGeral}</div>
              <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tendência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {tendencia > 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">+{tendencia.toFixed(2)}</span>
                </>
              ) : tendencia < 0 ? (
                <>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-500">{tendencia.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-2xl font-bold">0.00</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="nota"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Histórico de Avaliações</h3>
        {avaliacoes?.map((avaliacao) => (
          <Card key={avaliacao.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    Avaliação {tipoLabels[avaliacao.tipo as keyof typeof tipoLabels]}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(avaliacao.periodo_inicio).toLocaleDateString()} até{" "}
                    {new Date(avaliacao.periodo_fim).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{avaliacao.nota_final}</span>
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                </div>
              </div>
            </CardHeader>
            {avaliacao.observacoes && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{avaliacao.observacoes}</p>
              </CardContent>
            )}
          </Card>
        ))}

        {(!avaliacoes || avaliacoes.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma avaliação concluída ainda
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
