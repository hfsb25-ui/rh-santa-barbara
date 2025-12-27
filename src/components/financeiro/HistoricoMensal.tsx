import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HistoricoData } from "./hooks/useFinanceiroData";

interface HistoricoMensalProps {
  data: HistoricoData[];
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

export function HistoricoMensal({ data }: HistoricoMensalProps) {
  // Inverter para mostrar do mais antigo ao mais recente no gráfico
  const chartData = [...data].reverse().map(item => ({
    ...item,
    label: `${item.mes.substring(0, 3)}/${item.ano.toString().slice(-2)}`,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Histórico Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gráfico */}
        <div className="h-[300px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorLiquido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
              <YAxis tickFormatter={formatCurrency} className="text-xs fill-muted-foreground" />
              <Tooltip
                formatter={(value: number) => formatCurrencyFull(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalBruto"
                name="Valor Bruto"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorBruto)"
              />
              <Area
                type="monotone"
                dataKey="totalLiquido"
                name="Valor Líquido"
                stroke="hsl(var(--secondary))"
                fillOpacity={1}
                fill="url(#colorLiquido)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="text-left p-2">Mês/Ano</th>
                <th className="text-right p-2">Bruto</th>
                <th className="text-right p-2">Descontos</th>
                <th className="text-right p-2">Líquido</th>
                <th className="text-right p-2">Pagamentos</th>
                <th className="text-right p-2">Variação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={`${item.ano}-${item.mesNumero}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-2 font-medium">
                    {item.mes}/{item.ano}
                  </td>
                  <td className="text-right p-2 font-semibold">
                    {formatCurrencyFull(item.totalBruto)}
                  </td>
                  <td className="text-right p-2 text-destructive">
                    {formatCurrencyFull(item.totalDescontos)}
                  </td>
                  <td className="text-right p-2 text-secondary font-medium">
                    {formatCurrencyFull(item.totalLiquido)}
                  </td>
                  <td className="text-right p-2 text-muted-foreground">
                    {item.quantidadePagamentos}
                  </td>
                  <td className="text-right p-2">
                    {index === data.length - 1 ? (
                      <Badge variant="secondary" className="text-xs">
                        <Minus className="h-3 w-3 mr-1" />
                        Base
                      </Badge>
                    ) : item.diferencaPercentual === 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        <Minus className="h-3 w-3 mr-1" />
                        0%
                      </Badge>
                    ) : item.diferencaPercentual > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{item.diferencaPercentual.toFixed(1)}%
                      </Badge>
                    ) : (
                      <Badge className="bg-secondary text-secondary-foreground text-xs">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {item.diferencaPercentual.toFixed(1)}%
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
