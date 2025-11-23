import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VacationTimelineProps {
  filters: VacationFiltersType;
}

interface TimelineVacation {
  id: string;
  employee_name: string;
  setor: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_totais: number;
  status: string;
}

export function VacationTimeline({ filters }: VacationTimelineProps) {
  const [vacations, setVacations] = useState<TimelineVacation[]>([]);
  const [groupBy, setGroupBy] = useState<"setor" | "empresa">("setor");

  useEffect(() => {
    fetchVacations();
  }, [filters]);

  const fetchVacations = async () => {
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

    // 2) Férias planejadas
    const { data: plannedData, error: plannedError } = await supabase
      .from("ferias_planejadas")
      .select("*")
      .in("employee_id", employeeIds);

    // 3) Férias confirmadas (tabela ferias)
    const { data: confirmedData, error: confirmedError } = await supabase
      .from("ferias")
      .select("*")
      .in("employee_id", employeeIds);

    if (plannedError || confirmedError) {
      setVacations([]);
      return;
    }

    const allVacations: TimelineVacation[] = [];

    (plannedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      allVacations.push({
        id: item.id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "Sem Setor",
        empresa_nome: emp?.empresas?.nome || "Sem Empresa",
        periodo_inicio: item.periodo_inicio,
        periodo_fim: item.periodo_fim,
        dias_totais: item.dias_totais,
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

      allVacations.push({
        id: item.id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "Sem Setor",
        empresa_nome: emp?.empresas?.nome || "Sem Empresa",
        periodo_inicio: item.periodo_gozo_inicio,
        periodo_fim: item.periodo_gozo_fim,
        dias_totais: item.dias_totais,
        status,
      });
    });

    // Filtro por status (aplicado após combinar planejadas + confirmadas)
    const filteredVacations =
      filters.status && filters.status !== "all"
        ? allVacations.filter((v) => v.status === filters.status)
        : allVacations;

    // Ordenar por início asc
    filteredVacations.sort(
      (a, b) => new Date(a.periodo_inicio).getTime() - new Date(b.periodo_inicio).getTime()
    );

    setVacations(filteredVacations);
  };
  const groupedVacations = vacations.reduce((acc, vacation) => {
    const key = groupBy === "setor" ? vacation.setor : vacation.empresa_nome;
    if (!acc[key]) acc[key] = [];
    acc[key].push(vacation);
    return acc;
  }, {} as Record<string, TimelineVacation[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planejado":
        return "bg-blue-500";
      case "aprovado":
        return "bg-green-500";
      case "em_andamento":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Timeline de Férias</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={groupBy === "setor" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setGroupBy("setor")}
            >
              Por Setor
            </Badge>
            <Badge
              variant={groupBy === "empresa" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setGroupBy("empresa")}
            >
              Por Empresa
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedVacations).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <h3 className="font-semibold text-lg border-b pb-2">{group}</h3>
              <div className="space-y-3">
                {items.map((vacation) => (
                  <div key={vacation.id} className="flex items-center gap-4">
                    <div className="w-48 text-sm truncate" title={vacation.employee_name}>
                      {vacation.employee_name}
                    </div>
                    <div className="flex-1 relative h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className={`absolute h-full ${getStatusColor(vacation.status)} opacity-70 rounded-lg`}
                        style={{
                          left: 0,
                          width: `${(vacation.dias_totais / 30) * 100}%`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center px-2 text-xs text-foreground font-medium">
                        {format(new Date(vacation.periodo_inicio), "dd/MM", { locale: ptBR })} -{" "}
                        {format(new Date(vacation.periodo_fim), "dd/MM", { locale: ptBR })} ({vacation.dias_totais} dias)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedVacations).length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              Nenhuma féria encontrada com os filtros selecionados
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
