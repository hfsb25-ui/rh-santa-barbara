import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";
import { Badge } from "@/components/ui/badge";
import { AddVacationDialog } from "./AddVacationDialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VacationCalendarProps {
  filters: VacationFiltersType;
  onRefresh: () => void;
}

interface VacationEvent {
  employee_id: string;
  employee_name: string;
  setor: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: string;
}

export function VacationCalendar({ filters, onRefresh }: VacationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vacations, setVacations] = useState<VacationEvent[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchVacations();
  }, [currentDate, filters]);

  const fetchVacations = async () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const now = new Date();

    // 1) Buscar funcionários conforme os filtros
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

    // 2) Férias planejadas no mês
    const { data: plannedData, error: plannedError } = await supabase
      .from("ferias_planejadas")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("periodo_fim", monthStart.toISOString())
      .lte("periodo_inicio", monthEnd.toISOString());

    // 3) Férias confirmadas (tabela ferias) no mês
    const { data: confirmedData, error: confirmedError } = await supabase
      .from("ferias")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("periodo_gozo_fim", monthStart.toISOString())
      .lte("periodo_gozo_inicio", monthEnd.toISOString());

    if (plannedError || confirmedError) {
      setVacations([]);
      return;
    }

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
      });
    });

    (confirmedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      const start = new Date(item.periodo_gozo_inicio);
      const end = new Date(item.periodo_gozo_fim);
      let status: string;
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
      });
    });

    // Filtro por status (aplicado após combinar planejadas + confirmadas)
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
    setShowAddDialog(true);
  };

  const days = getDaysInMonth();
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-muted-foreground p-2"
              >
                {day}
              </div>
            ))}

            {days.map((day, index) => {
              const dayVacations = getVacationsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={index}
                  onClick={() => isCurrentMonth && handleDayClick(day)}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                    ${!isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "hover:bg-accent"}
                    ${isCurrentDay ? "border-primary border-2" : ""}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium ${isCurrentDay ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayVacations.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayVacations.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayVacations.slice(0, 2).map((vacation, i) => (
                      <div
                        key={i}
                        className="text-xs p-1 bg-secondary rounded truncate"
                        title={`${vacation.employee_name} - ${vacation.setor}`}
                      >
                        {vacation.employee_name}
                      </div>
                    ))}
                    {dayVacations.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayVacations.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AddVacationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        selectedDate={selectedDate}
        onSuccess={() => {
          onRefresh();
          setShowAddDialog(false);
        }}
      />
    </>
  );
}
