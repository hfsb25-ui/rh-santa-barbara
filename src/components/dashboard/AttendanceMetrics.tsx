import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface AttendanceMetricsProps {
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absenteeismRate: number;
  topAbsentEmployees: Array<{ name: string; total: number; justified: number; unjustified: number }>;
  absenceEvolution: Array<{ month: string; justified: number; unjustified: number }>;
}

const AttendanceMetrics = ({ 
  totalAbsences, 
  justifiedAbsences, 
  unjustifiedAbsences,
  absenteeismRate,
  topAbsentEmployees,
  absenceEvolution
}: AttendanceMetricsProps) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Absences */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Faltas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAbsences}</div>
            <p className="text-xs text-muted-foreground mt-1">Mês atual</p>
          </CardContent>
        </Card>

        {/* Justified */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Justificadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{justifiedAbsences}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAbsences > 0 ? `${((justifiedAbsences / totalAbsences) * 100).toFixed(0)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>

        {/* Unjustified */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Justificadas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unjustifiedAbsences}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAbsences > 0 ? `${((unjustifiedAbsences / totalAbsences) * 100).toFixed(0)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>

        {/* Absenteeism Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Absenteísmo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absenteeismRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Do período</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Absent Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funcionários com Mais Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            {topAbsentEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma falta registrada
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAbsentEmployees} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="justified" fill="hsl(var(--secondary))" stackId="a" name="Justificadas" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unjustified" fill="hsl(var(--destructive))" stackId="a" name="Não Justificadas" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Absence Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            {absenceEvolution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados de evolução
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={absenceEvolution}>
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
                  <Line type="monotone" dataKey="justified" stroke="hsl(var(--secondary))" strokeWidth={2} name="Justificadas" />
                  <Line type="monotone" dataKey="unjustified" stroke="hsl(var(--destructive))" strokeWidth={2} name="Não Justificadas" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceMetrics;
