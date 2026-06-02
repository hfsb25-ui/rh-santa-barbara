import { useEffect, useState } from "react";
import { parseDateOnly } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CalendarX,
  PlayCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";
import { differenceInDays, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VacationMetricsProps {
  filters: VacationFiltersType;
}

interface Metrics {
  totalVacations: number;
  activeVacations: number;
  plannedVacations: number;
  conflicts: number;
  expiredVacations: number;
  expiringVacations: number;
}

export function VacationMetrics({ filters }: VacationMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    totalVacations: 0,
    activeVacations: 0,
    plannedVacations: 0,
    conflicts: 0,
    expiredVacations: 0,
    expiringVacations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [filters]);

  const fetchMetrics = async () => {
    setLoading(true);
    const now = new Date();
    const in90Days = addDays(now, 90);

    let employeesQuery = supabase
      .from("employees")
      .select("id, nome_completo, setor, empresa_id, data_admissao")
      .in("status", ["ativo", "ferias"]);

    if (filters.empresa && filters.empresa !== "all") {
      employeesQuery = employeesQuery.eq("empresa_id", filters.empresa);
    }

    if (filters.setor && filters.setor !== "all") {
      employeesQuery = employeesQuery.eq("setor", filters.setor);
    }

    if (filters.search) {
      employeesQuery = employeesQuery.ilike("nome_completo", `%${filters.search}%`);
    }

    const { data: employees, error: employeesError } = await employeesQuery;

    if (employeesError || !employees || employees.length === 0) {
      setMetrics({
        totalVacations: 0,
        activeVacations: 0,
        plannedVacations: 0,
        conflicts: 0,
        expiredVacations: 0,
        expiringVacations: 0,
      });
      setLoading(false);
      return;
    }

    const employeeIds = employees.map((e: any) => e.id);

    // Férias planejadas
    const { count: plannedTotal } = await supabase
      .from("ferias_planejadas")
      .select("*", { count: "exact", head: true })
      .in("employee_id", employeeIds);

    const { count: planned } = await supabase
      .from("ferias_planejadas")
      .select("*", { count: "exact", head: true })
      .in("employee_id", employeeIds)
      .eq("status", "planejado");

    const nowIso = now.toISOString();

    // Férias confirmadas
    const { count: confirmedTotal } = await supabase
      .from("ferias")
      .select("*", { count: "exact", head: true })
      .in("employee_id", employeeIds);

    // Férias ativas (em andamento)
    const { count: active } = await supabase
      .from("ferias")
      .select("*", { count: "exact", head: true })
      .in("employee_id", employeeIds)
      .lte("periodo_gozo_inicio", nowIso)
      .gte("periodo_gozo_fim", nowIso);

    // Calcular férias vencidas e próximas a vencer
    let expiredCount = 0;
    let expiringCount = 0;

    for (const emp of employees) {
      if (!emp.data_admissao) continue;

      const admissionDate = (parseDateOnly(emp.data_admissao) ?? new Date());
      const daysEmployed = differenceInDays(now, admissionDate);

      // Verificar se tem férias registradas
      const { data: empVacations } = await supabase
        .from("ferias")
        .select("periodo_aquisitivo_fim")
        .eq("employee_id", emp.id)
        .order("periodo_aquisitivo_fim", { ascending: false })
        .limit(1);

      const { data: empPlannedVacations } = await supabase
        .from("ferias_planejadas")
        .select("periodo_fim")
        .eq("employee_id", emp.id)
        .order("periodo_fim", { ascending: false })
        .limit(1);

      // Se trabalha há mais de 1 ano e não tem férias, verificar vencimento
      if (daysEmployed >= 365) {
        const lastVacationEnd = empVacations?.[0]?.periodo_aquisitivo_fim;
        const lastPlannedEnd = empPlannedVacations?.[0]?.periodo_fim;

        const mostRecentEnd = lastVacationEnd || lastPlannedEnd;

        if (!mostRecentEnd) {
          // Nunca tirou férias - calcular se está vencido
          const acquisitionEnd = addDays(admissionDate, 365);
          const deadlineToTake = addDays(acquisitionEnd, 365); // Tem 1 ano para tirar

          if (now > deadlineToTake) {
            expiredCount++;
          } else if (deadlineToTake <= in90Days) {
            expiringCount++;
          }
        }
      }
    }

    // Detectar conflitos (mais de 2 do mesmo setor de férias)
    const { data: activeVacationsData } = await supabase
      .from("ferias")
      .select("employee_id, periodo_gozo_inicio, periodo_gozo_fim")
      .in("employee_id", employeeIds)
      .lte("periodo_gozo_inicio", nowIso)
      .gte("periodo_gozo_fim", nowIso);

    const sectorCounts: Record<string, number> = {};
    if (activeVacationsData) {
      for (const vacation of activeVacationsData) {
        const emp = employees.find((e) => e.id === vacation.employee_id);
        if (emp?.setor) {
          sectorCounts[emp.setor] = (sectorCounts[emp.setor] || 0) + 1;
        }
      }
    }

    const conflictCount = Object.values(sectorCounts).filter((count) => count > 2).length;

    setMetrics({
      totalVacations: (plannedTotal || 0) + (confirmedTotal || 0),
      activeVacations: active || 0,
      plannedVacations: planned || 0,
      conflicts: conflictCount,
      expiredVacations: expiredCount,
      expiringVacations: expiringCount,
    });
    setLoading(false);
  };

  const cards = [
    {
      title: "Total de Férias",
      value: metrics.totalVacations,
      icon: Calendar,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/30",
      tooltip: "Total de férias planejadas e confirmadas",
    },
    {
      title: "Em Andamento",
      value: metrics.activeVacations,
      icon: PlayCircle,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/30",
      tooltip: "Funcionários atualmente de férias",
    },
    {
      title: "Planejadas",
      value: metrics.plannedVacations,
      icon: Clock,
      gradient: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/30",
      tooltip: "Férias aguardando aprovação",
    },
    {
      title: "Férias Vencidas",
      value: metrics.expiredVacations,
      icon: CalendarX,
      gradient: "from-red-500 to-red-600",
      bgLight: "bg-red-50 dark:bg-red-950/30",
      tooltip: "Funcionários com período aquisitivo vencido",
    },
    {
      title: "Próximas a Vencer",
      value: metrics.expiringVacations,
      icon: AlertTriangle,
      gradient: "from-orange-500 to-orange-600",
      bgLight: "bg-orange-50 dark:bg-orange-950/30",
      tooltip: "Vencem nos próximos 90 dias",
    },
    {
      title: "Conflitos",
      value: metrics.conflicts,
      icon: Users,
      gradient: metrics.conflicts > 0 ? "from-red-500 to-red-600" : "from-green-500 to-green-600",
      bgLight: metrics.conflicts > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30",
      tooltip: "Setores com mais de 2 funcionários de férias simultâneas",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Tooltip key={card.title}>
            <TooltipTrigger asChild>
              <Card className={`overflow-hidden transition-all hover:shadow-md cursor-default ${card.bgLight}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {card.title}
                    </span>
                    <div className={`p-1.5 rounded-full bg-gradient-to-br ${card.gradient}`}>
                      <card.icon className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
