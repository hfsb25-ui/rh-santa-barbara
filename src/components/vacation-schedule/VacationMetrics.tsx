import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";

interface VacationMetricsProps {
  filters: VacationFiltersType;
}

export function VacationMetrics({ filters }: VacationMetricsProps) {
  const [metrics, setMetrics] = useState({
    totalVacations: 0,
    activeVacations: 0,
    plannedVacations: 0,
    conflicts: 0,
  });

  useEffect(() => {
    fetchMetrics();
  }, [filters]);

  const fetchMetrics = async () => {
    const now = new Date();
    
    let query = supabase.from("ferias_planejadas").select("*, employees!inner(empresa_id, setor)", { count: "exact" });

    if (filters.empresa && filters.empresa !== "all") {
      query = query.eq("employees.empresa_id", filters.empresa);
    }

    if (filters.setor && filters.setor !== "all") {
      query = query.eq("employees.setor", filters.setor);
    }

    const { count: total, data: allVacations } = await query;

    const { count: planned } = await supabase
      .from("ferias_planejadas")
      .select("*", { count: "exact" })
      .eq("status", "planejado");

    const { count: active } = await supabase
      .from("ferias_planejadas")
      .select("*", { count: "exact" })
      .eq("status", "em_andamento");

    setMetrics({
      totalVacations: total || 0,
      activeVacations: active || 0,
      plannedVacations: planned || 0,
      conflicts: 0,
    });
  };

  const cards = [
    {
      title: "Total de Férias",
      value: metrics.totalVacations,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      title: "Férias Ativas",
      value: metrics.activeVacations,
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Planejadas",
      value: metrics.plannedVacations,
      icon: CheckCircle,
      color: "text-purple-500",
    },
    {
      title: "Conflitos Detectados",
      value: metrics.conflicts,
      icon: AlertTriangle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
