import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area, AreaChart } from "recharts";
import ChartCard from "./ChartCard";
import { AlertCircle, TrendingUp, Package, Activity } from "lucide-react";

interface StockChartsProps {
  lowStockItems: Array<{ name: string; current: number; minimum: number }>;
  topDistributed: Array<{ name: string; quantity: number }>;
  stockEvolution: Array<{ month: string; entradas: number; saidas: number; saldo: number }>;
}

const StockCharts = ({ lowStockItems, topDistributed, stockEvolution }: StockChartsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Low Stock Items */}
      <ChartCard title="Itens com Estoque Baixo" icon={<AlertCircle className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={lowStockItems.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Bar dataKey="current" fill="hsl(var(--destructive))" name="Atual" radius={[0, 8, 8, 0]} />
            <Bar dataKey="minimum" fill="hsl(var(--warning))" name="Mínimo" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Distributed Items */}
      <ChartCard title="Top 10 Itens Mais Distribuídos" icon={<TrendingUp className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topDistributed}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Bar dataKey="quantity" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} name="Quantidade" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stock Evolution */}
      <ChartCard title="Evolução de Estoque" icon={<Activity className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stockEvolution}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="entradas" stroke="hsl(var(--secondary))" strokeWidth={2} name="Entradas" />
            <Line type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" strokeWidth={2} name="Saídas" />
            <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stock Movement Summary */}
      <ChartCard title="Resumo de Movimentação" icon={<Package className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stockEvolution}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="entradas" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorEntradas)" name="Entradas" />
            <Area type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorSaidas)" name="Saídas" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default StockCharts;
