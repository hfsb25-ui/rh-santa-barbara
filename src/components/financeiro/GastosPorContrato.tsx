import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FileText } from "lucide-react";
import type { ContratoData, ContratoEvolucaoData } from "./hooks/useFinanceiroData";

interface GastosPorContratoProps {
  data: ContratoData[];
  evolucao: ContratoEvolucaoData[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
];

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

export function GastosPorContrato({ data, evolucao }: GastosPorContratoProps) {
  const pieData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Gastos por Tipo de Contrato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Distribuição Atual</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="custoTotal"
                    nameKey="tipo"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={({ tipo, percentual }) => `${tipo}: ${percentual.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrencyFull(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cards comparativos */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.map((item, index) => (
                <div
                  key={item.tipo}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs font-medium">{item.tipo}</span>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(item.custoTotal)}</p>
                  <p className="text-xs text-muted-foreground">{item.quantidade} funcionários</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Evolução Mensal</h4>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evolucao}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFixo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorIntermitente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorPrestador" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs fill-muted-foreground" />
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
                    dataKey="fixo"
                    name="Fixo"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorFixo)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="intermitente"
                    name="Intermitente"
                    stroke="hsl(var(--secondary))"
                    fillOpacity={1}
                    fill="url(#colorIntermitente)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="prestador"
                    name="Prestador"
                    stroke="hsl(262, 83%, 58%)"
                    fillOpacity={1}
                    fill="url(#colorPrestador)"
                    stackId="1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
