import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import ChartCard from "./ChartCard";
import { DollarSign, TrendingUp, Building2, Briefcase } from "lucide-react";

interface FinancialChartsProps {
  payrollBySector: Array<{ name: string; value: number }>;
  payrollEvolution: Array<{ month: string; value: number }>;
  salaryDistribution: Array<{ faixa: string; fixo: number; intermitente: number; prestador: number }>;
  payrollByContractType: Array<{ month: string; fixo: number; intermitente: number; prestador: number }>;
}

const FinancialCharts = ({ payrollBySector, payrollEvolution, salaryDistribution, payrollByContractType }: FinancialChartsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Payroll by Sector */}
      <ChartCard title="Folha de Pagamento por Setor" icon={<Building2 className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={payrollBySector} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={formatCurrency} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payroll Evolution */}
      <ChartCard title="Evolução da Folha de Pagamento" icon={<TrendingUp className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={payrollEvolution}>
            <defs>
              <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatCurrency} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPayroll)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Salary Distribution by Contract Type */}
      <ChartCard title="Distribuição Salarial por Tipo de Contrato" icon={<Briefcase className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salaryDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Bar dataKey="fixo" fill="hsl(var(--chart-1))" name="Fixo" />
            <Bar dataKey="intermitente" fill="hsl(var(--chart-2))" name="Intermitente" />
            <Bar dataKey="prestador" fill="hsl(var(--chart-3))" name="Prestador" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payroll by Contract Type Evolution */}
      <ChartCard title="Custo Total por Tipo de Contrato" icon={<DollarSign className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={payrollByContractType}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatCurrency} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Legend />
            <Area type="monotone" dataKey="fixo" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" name="Fixo" />
            <Area type="monotone" dataKey="intermitente" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" name="Intermitente" />
            <Area type="monotone" dataKey="prestador" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" name="Prestador" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default FinancialCharts;
