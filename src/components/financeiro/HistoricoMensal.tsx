import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart,
  Area,
  Line,
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
      <CardContent className="px-2 sm:px-6">
        {/* Gráfico */}
        <div className="h-[250px] sm:h-[300px] mb-6 -mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                name="Valor em conta"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorBruto)"
              />
              <Area
                type="monotone"
                dataKey="totalLiquido"
                name="Valor em mãos"
                stroke="hsl(var(--secondary))"
                fillOpacity={1}
                fill="url(#colorLiquido)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela - Versão Desktop */}
        <div className="hidden md:block overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="text-left p-2">Mês/Ano</th>
                <th className="text-right p-2">Em conta</th>
                <th className="text-right p-2">Descontos</th>
                <th className="text-right p-2">Em mãos</th>
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

        {/* Cards - Versão Mobile */}
        <div className="md:hidden space-y-3 max-h-[400px] overflow-auto">
          {data.map((item, index) => (
            <div
              key={`mobile-${item.ano}-${item.mesNumero}`}
              className="bg-muted/30 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  {item.mes}/{item.ano}
                </span>
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
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Em conta:</span>
                  <p className="font-semibold">{formatCurrencyFull(item.totalBruto)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Descontos:</span>
                  <p className="text-destructive">{formatCurrencyFull(item.totalDescontos)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Em mãos:</span>
                  <p className="text-secondary font-medium">{formatCurrencyFull(item.totalLiquido)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pagamentos:</span>
                  <p>{item.quantidadePagamentos}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
