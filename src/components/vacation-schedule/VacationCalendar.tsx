import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType, VacationEvent } from "@/components/vacation-schedule/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/vacation-schedule/types";
import { Badge } from "@/components/ui/badge";
import { AddVacationDialog } from "./AddVacationDialog";
import { DayDetailsDialog } from "./DayDetailsDialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VacationCalendarProps {
  filters: VacationFiltersType;
  onRefresh: () => void;
}

export function VacationCalendar({ filters, onRefresh }: VacationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vacations, setVacations] = useState<VacationEvent[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchVacations();
  }, [currentDate, filters]);

  const fetchVacations = async () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const now = new Date();

    let employeesQuery = supabase
      .from("employees")
      .select("id, nome_completo, setor, empresa_id, empresas(nome)");

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
      setVacations([]);
      return;
    }

    const employeesById: Record<string, any> = {};
    for (const emp of employees) {
      employeesById[emp.id] = emp;
    }

    const employeeIds = employees.map((e: any) => e.id);

    const { data: plannedData } = await supabase
      .from("ferias_planejadas")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("periodo_fim", monthStart.toISOString())
      .lte("periodo_inicio", monthEnd.toISOString());

    const { data: confirmedData } = await supabase
      .from("ferias")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("periodo_gozo_fim", monthStart.toISOString())
      .lte("periodo_gozo_inicio", monthEnd.toISOString());

    const allEvents: VacationEvent[] = [];

    (plannedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      allEvents.push({
        employee_id: item.employee_id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "",
        empresa_nome: emp?.empresas?.nome || "",
        periodo_inicio: item.periodo_inicio,
        periodo_fim: item.periodo_fim,
        status: item.status || "planejado",
        dias_totais: item.dias_totais,
      });
    });

    (confirmedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      const start = new Date(item.periodo_gozo_inicio);
      const end = new Date(item.periodo_gozo_fim);
      let status: "planejado" | "aprovado" | "em_andamento" | "concluido";
      if (now < start) status = "aprovado";
      else if (now > end) status = "concluido";
      else status = "em_andamento";

      allEvents.push({
        employee_id: item.employee_id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "",
        empresa_nome: emp?.empresas?.nome || "",
        periodo_inicio: item.periodo_gozo_inicio,
        periodo_fim: item.periodo_gozo_fim,
        status,
        dias_totais: item.dias_totais,
      });
    });

    const filteredEvents =
      filters.status && filters.status !== "all"
        ? allEvents.filter((e) => e.status === filters.status)
        : allEvents;

    setVacations(filteredEvents);
  };

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  };

  const getVacationsForDay = (day: Date) => {
    return vacations.filter((vacation) => {
      const start = new Date(vacation.periodo_inicio);
      const end = new Date(vacation.periodo_fim);
      return day >= start && day <= end;
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowDetailsDialog(true);
  };

  const handleAddVacationFromDetails = () => {
    setShowDetailsDialog(false);
    setShowAddDialog(true);
  };

  // Estatísticas do mês
  const monthStats = useMemo(() => {
    const days = getDaysInMonth();
    let daysWithVacations = 0;
    let maxVacationsInDay = 0;
    let dayWithMostVacations: Date | null = null;
    const uniqueEmployees = new Set<string>();

    days.forEach((day) => {
      const dayVacations = getVacationsForDay(day);
      if (dayVacations.length > 0) {
        daysWithVacations++;
        dayVacations.forEach((v) => uniqueEmployees.add(v.employee_id));
        if (dayVacations.length > maxVacationsInDay) {
          maxVacationsInDay = dayVacations.length;
          dayWithMostVacations = day;
        }
      }
    });

    return {
      daysWithVacations,
      uniqueEmployees: uniqueEmployees.size,
      maxVacationsInDay,
      dayWithMostVacations,
    };
  }, [vacations, currentDate]);

  const days = getDaysInMonth();
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const selectedDayVacations = selectedDate ? getVacationsForDay(selectedDate) : [];

  return (
    <TooltipProvider>
      {/* Resumo Mensal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {monthStats.daysWithVacations}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                dias com férias
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {monthStats.uniqueEmployees}
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">
                funcionários diferentes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {monthStats.maxVacationsInDay}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                máx. ausentes/dia
                {monthStats.dayWithMostVacations && (
                  <span className="block">
                    ({format(monthStats.dayWithMostVacations, "dd/MM")})
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legenda de cores */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[key as keyof typeof STATUS_COLORS].badge}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
              <div className="w-3 h-3 rounded bg-muted" />
              <span className="text-xs text-muted-foreground">Fim de Semana</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center font-semibold text-sm p-2 ${
                  index === 0 || index === 6 
                    ? "text-muted-foreground/60" 
                    : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}

            {/* Empty cells for days before the first day of the month */}
            {[...Array(firstDayOfMonth)].map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px]" />
            ))}

            {days.map((day, index) => {
              const dayVacations = getVacationsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const hasConflict = dayVacations.length > 2;
              const isWeekendDay = isWeekend(day);

              return (
                <div
                  key={index}
                  onClick={() => isCurrentMonth && handleDayClick(day)}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                    ${!isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "hover:bg-accent/50"}
                    ${isCurrentDay ? "border-primary border-2 bg-primary/5" : ""}
                    ${hasConflict ? "ring-2 ring-destructive/50 ring-inset" : ""}
                    ${isWeekendDay && isCurrentMonth ? "bg-muted/30" : ""}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium ${
                      isCurrentDay 
                        ? "text-primary font-bold" 
                        : isWeekendDay 
                        ? "text-muted-foreground" 
                        : ""
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayVacations.length > 0 && (
                      <Badge 
                        variant={hasConflict ? "destructive" : "secondary"} 
                        className="text-xs h-5 px-1.5"
                      >
                        {dayVacations.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayVacations.slice(0, 3).map((vacation, i) => {
                      const colors = STATUS_COLORS[vacation.status];
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-xs p-1 rounded truncate border ${colors.bg} ${colors.border} ${colors.text}`}
                            >
                              {vacation.employee_name.split(" ")[0]}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{vacation.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{vacation.setor}</p>
                              <p className="text-xs">
                                {format(new Date(vacation.periodo_inicio), "dd/MM")} - {format(new Date(vacation.periodo_fim), "dd/MM/yyyy")}
                              </p>
                              <Badge variant="outline" className={`text-xs ${colors.text}`}>
                                {STATUS_LABELS[vacation.status]}
                              </Badge>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayVacations.length > 3 && (
                      <div className="text-xs text-muted-foreground font-medium">
                        +{dayVacations.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DayDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        selectedDate={selectedDate}
        vacations={selectedDayVacations}
        onAddVacation={handleAddVacationFromDetails}
      />

      <AddVacationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        selectedDate={selectedDate}
        onSuccess={() => {
          onRefresh();
          setShowAddDialog(false);
        }}
      />
    </TooltipProvider>
  );
}
