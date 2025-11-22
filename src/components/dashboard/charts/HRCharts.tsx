import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import ChartCard from "./ChartCard";
import { Users, TrendingUp, Building2, Briefcase, Calendar } from "lucide-react";

interface HRChartsProps {
  statusData: Array<{ name: string; value: number; color: string }>;
  sectorData: Array<{ name: string; total: number }>;
  contractData: Array<{ name: string; value: number }>;
  evolutionData: Array<{ month: string; total: number; admissions: number; dismissals: number }>;
  ageDistribution: Array<{ faixa: string; masculino: number; feminino: number }>;
  companyDistribution: Array<{ name: string; total: number }>;
}

const HRCharts = ({ statusData, sectorData, contractData, evolutionData, ageDistribution, companyDistribution }: HRChartsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Status Distribution */}
      <ChartCard title="Distribuição por Status" icon={<Users className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload.value}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Employees by Sector */}
      <ChartCard title="Funcionários por Setor" icon={<Building2 className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sectorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Contract Type Distribution */}
      <ChartCard title="Distribuição por Tipo de Contrato" icon={<Briefcase className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={contractData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {contractData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Evolution Over Time - Full Width */}
      <ChartCard title="Evolução do Quadro" icon={<TrendingUp className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
            <Line type="monotone" dataKey="admissions" stroke="hsl(var(--secondary))" strokeWidth={2} name="Admissões" />
            <Line type="monotone" dataKey="dismissals" stroke="hsl(var(--destructive))" strokeWidth={2} name="Demissões" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Age Pyramid */}
      <ChartCard title="Pirâmide Etária" icon={<Users className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ageDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="faixa" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Legend />
            <Bar dataKey="masculino" fill="hsl(var(--primary))" name="Masculino" />
            <Bar dataKey="feminino" fill="hsl(var(--secondary))" name="Feminino" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Company Distribution */}
      <ChartCard title="Funcionários por Empresa" icon={<Building2 className="w-4 h-4" />}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={companyDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default HRCharts;
