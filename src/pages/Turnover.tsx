import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isWithinInterval } from "date-fns";

export default function Turnover() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
  });

  const calculateTurnover = () => {
    if (!employees || !startDate || !endDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Funcionários ativos no início do período
    const activeAtStart = employees.filter(emp => {
      if (!emp.data_admissao) return false;
      const admissionDate = parseISO(emp.data_admissao);
      return admissionDate <= start;
    }).length;

    // Funcionários demitidos durante o período
    const dismissed = employees.filter(emp => {
      if (emp.status !== 'demitido' || !emp.updated_at) return false;
      const updateDate = parseISO(emp.updated_at);
      return isWithinInterval(updateDate, { start, end });
    }).length;

    // Novos funcionários contratados durante o período
    const hired = employees.filter(emp => {
      if (!emp.data_admissao) return false;
      const admissionDate = parseISO(emp.data_admissao);
      return isWithinInterval(admissionDate, { start, end });
    }).length;

    // Funcionários ativos no final do período
    const activeAtEnd = employees.filter(emp => {
      if (!emp.data_admissao) return false;
      const admissionDate = parseISO(emp.data_admissao);
      return admissionDate <= end && emp.status !== 'demitido';
    }).length;

    const averageEmployees = (activeAtStart + activeAtEnd) / 2;
    const turnoverRate = averageEmployees > 0 ? (dismissed / averageEmployees) * 100 : 0;

    return {
      activeAtStart,
      activeAtEnd,
      dismissed,
      hired,
      averageEmployees,
      turnoverRate,
    };
  };

  const stats = calculateTurnover();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
      <h1 className="text-3xl font-bold mb-6">Relatório de Turnover</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecionar Período</CardTitle>
          <CardDescription>
            Escolha o período para análise do turnover
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Funcionários Ativos (Início)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeAtStart}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionários Ativos (Fim)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeAtEnd}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demissões</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.dismissed}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contratações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.hired}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Média de Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.averageEmployees.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.turnoverRate.toFixed(2)}%</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}