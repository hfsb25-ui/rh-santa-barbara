import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from "lucide-react";
import type { HistoricoData, TendenciaData } from "./hooks/useFinanceiroData";

interface AnaliseTendenciasProps {
  historico: HistoricoData[];
  tendencia: TendenciaData;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function AnaliseTendencias({ historico, tendencia }: AnaliseTendenciasProps) {
  // Inverter histórico para ordem cronológica
  const historicoOrdenado = [...historico].reverse();

  // Preparar dados para o gráfico
  const chartData: Array<{ label: string; valor: number | null; mediaMovel: number | null; projecao?: number }> = historicoOrdenado.map((item, index) => ({
    label: `${item.mes.substring(0, 3)}/${item.ano.toString().slice(-2)}`,
    valor: item.totalBruto,
    mediaMovel: tendencia.mediaMovel[index - 2] || null,
  }));

  // Adicionar projeções
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const ultimoItem = historicoOrdenado[historicoOrdenado.length - 1];
  if (ultimoItem && tendencia.projecao.length > 0) {
    let mesNum = ultimoItem.mesNumero;
    let ano = ultimoItem.ano;

    tendencia.projecao.forEach((valor, index) => {
      mesNum += 1;
      if (mesNum > 12) {
        mesNum = 1;
        ano += 1;
      }
      chartData.push({
        label: `${MESES[mesNum - 1]}/${ano.toString().slice(-2)} (P)`,
        valor: null as any,
        mediaMovel: null,
        projecao: valor,
      });
    });
  }

  const indicadorConfig = {
    crescente: {
      label: "Tendência Crescente",
      icon: TrendingUp,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      description: "Os custos estão aumentando de forma consistente",
    },
    estavel: {
      label: "Tendência Estável",
      icon: Minus,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      description: "Os custos estão se mantendo estáveis",
    },
    decrescente: {
      label: "Tendência Decrescente",
      icon: TrendingDown,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      description: "Os custos estão diminuindo de forma consistente",
    },
  };

  const config = indicadorConfig[tendencia.indicador];
  const Icon = config.icon;

  // Calcular média geral
  const mediaGeral = historicoOrdenado.length > 0
    ? historicoOrdenado.reduce((sum, h) => sum + h.totalBruto, 0) / historicoOrdenado.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LineChartIcon className="h-5 w-5 text-primary" />
          Tendências e Projeções
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indicador de Tendência */}
        <div className={`p-4 rounded-lg ${config.bgColor} flex items-center gap-4`}>
          <div className={`p-3 rounded-full bg-background`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
              <YAxis tickFormatter={formatCurrency} className="text-xs fill-muted-foreground" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrencyFull(value),
                  name === "valor" ? "Valor Real" : name === "mediaMovel" ? "Média Móvel" : "Projeção"
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <ReferenceLine 
                y={mediaGeral} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: "Média", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="valor"
                name="Valor Real"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="mediaMovel"
                name="Média Móvel (3m)"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="projecao"
                name="Projeção"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                dot={{ fill: "hsl(262, 83%, 58%)", strokeWidth: 2 }}
                strokeDasharray="10 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo de Projeção */}
        {tendencia.projecao.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {tendencia.projecao.map((valor, index) => {
              let mesNum = historicoOrdenado[historicoOrdenado.length - 1]?.mesNumero || 1;
              let ano = historicoOrdenado[historicoOrdenado.length - 1]?.ano || new Date().getFullYear();
              for (let i = 0; i <= index; i++) {
                mesNum += 1;
                if (mesNum > 12) {
                  mesNum = 1;
                  ano += 1;
                }
              }
              return (
                <div key={index} className="p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {MESES[mesNum - 1]}/{ano}
                  </p>
                  <p className="font-bold text-primary">{formatCurrency(valor)}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Projeção
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Média do Período</p>
            <p className="font-bold">{formatCurrency(mediaGeral)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
            <p className="font-bold text-secondary">
              {formatCurrency(Math.min(...historicoOrdenado.map(h => h.totalBruto).filter(v => v > 0)) || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Máximo</p>
            <p className="font-bold text-destructive">
              {formatCurrency(Math.max(...historicoOrdenado.map(h => h.totalBruto)) || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Meses Analisados</p>
            <p className="font-bold">{historicoOrdenado.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
