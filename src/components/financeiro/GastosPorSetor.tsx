import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Building2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SetorData } from "./hooks/useFinanceiroData";

interface GastosPorSetorProps {
  data: SetorData[];
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

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
];

export function GastosPorSetor({ data }: GastosPorSetorProps) {
  const chartData = data.slice(0, 8).map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Gastos por Setor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gráfico */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  type="category" 
                  dataKey="setor" 
                  width={100}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrencyFull(value)}
                  labelFormatter={(label) => `Setor: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="custoTotal" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela */}
          <div className="space-y-2 max-h-[300px] overflow-auto">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide p-2 bg-muted/50 rounded-lg sticky top-0">
              <span className="col-span-1">#</span>
              <span className="col-span-3">Setor</span>
              <span className="col-span-2 text-right">Func.</span>
              <span className="col-span-3 text-right">Total</span>
              <span className="col-span-3 text-right">Variação</span>
            </div>
            {data.map((item, index) => (
              <div
                key={item.setor}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="col-span-1 font-bold text-muted-foreground">
                  #{index + 1}
                </span>
                <span className="col-span-3 font-medium truncate" title={item.setor}>
                  {item.setor}
                </span>
                <span className="col-span-2 text-right text-muted-foreground">
                  {item.quantidadeFuncionarios}
                </span>
                <span className="col-span-3 text-right font-semibold">
                  {formatCurrency(item.custoTotal)}
                </span>
                <div className="col-span-3 flex justify-end">
                  {item.variacao === 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      <Minus className="h-3 w-3 mr-1" />
                      0%
                    </Badge>
                  ) : item.variacao > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{item.variacao.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge className="bg-secondary text-secondary-foreground text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {item.variacao.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
