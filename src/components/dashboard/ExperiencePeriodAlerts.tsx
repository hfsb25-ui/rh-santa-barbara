import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, Calendar, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ExperienceEmployee {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  data_admissao: string;
  daysWorked: number;
  daysRemaining: number;
  progress: number;
  nextMilestone: number | null;
  daysUntilMilestone: number | null;
}

interface Config {
  ativo: boolean;
  dias_antecedencia: number;
  marcos_dias: number[];
}

interface ExperiencePeriodAlertsProps {
  selectedEmpresa?: string;
}

const STORAGE_KEY = "experience_alerts_expanded";

export const ExperiencePeriodAlerts = ({ selectedEmpresa }: ExperiencePeriodAlertsProps) => {
  const [isHidden, setIsHidden] = useState(() => {
    // Default to hidden (minimized), only show if explicitly set to expanded
    return localStorage.getItem(STORAGE_KEY) !== "true";
  });
  const [employees, setEmployees] = useState<ExperienceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config?.ativo) {
      fetchExperienceEmployees();
    } else if (config !== null) {
      setLoading(false);
    }
  }, [selectedEmpresa, config]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracao_alertas_experiencia")
        .select("ativo, dias_antecedencia, marcos_dias")
        .single();

      if (error) {
        console.error("Error fetching config:", error);
        setConfig({ ativo: true, dias_antecedencia: 7, marcos_dias: [45, 90] });
        return;
      }

      setConfig(data);
    } catch (error) {
      console.error("Error:", error);
      setConfig({ ativo: true, dias_antecedencia: 7, marcos_dias: [45, 90] });
    }
  };

  const fetchExperienceEmployees = async () => {
    if (!config) return;

    try {
      let query = supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor, data_admissao")
        .in("status", ["ativo", "ferias"])
        .not("data_admissao", "is", null);

      if (selectedEmpresa && selectedEmpresa !== "all") {
        query = query.eq("empresa_id", selectedEmpresa);
      }

      const { data: employeesData, error } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxExperienceDays = Math.max(...config.marcos_dias);
      const sortedMarcos = [...config.marcos_dias].sort((a, b) => a - b);

      const experienceEmployees: ExperienceEmployee[] = [];

      employeesData?.forEach((emp) => {
        if (!emp.data_admissao) return;

        const admissionDate = new Date(emp.data_admissao);
        const daysWorked = differenceInDays(today, admissionDate);

        // Only show employees still in experience period (up to max milestone)
        if (daysWorked >= 0 && daysWorked < maxExperienceDays) {
          const daysRemaining = maxExperienceDays - daysWorked;
          const progress = Math.min((daysWorked / maxExperienceDays) * 100, 100);

          // Find next milestone
          let nextMilestone: number | null = null;
          let daysUntilMilestone: number | null = null;

          for (const marco of sortedMarcos) {
            if (daysWorked < marco) {
              nextMilestone = marco;
              daysUntilMilestone = marco - daysWorked;
              break;
            }
          }

          experienceEmployees.push({
            id: emp.id,
            nome_completo: emp.nome_completo,
            cargo: emp.cargo,
            setor: emp.setor,
            data_admissao: emp.data_admissao,
            daysWorked,
            daysRemaining,
            progress,
            nextMilestone,
            daysUntilMilestone,
          });
        }
      });

      // Sort by days remaining (most urgent first)
      experienceEmployees.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setEmployees(experienceEmployees);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = () => {
    localStorage.setItem(STORAGE_KEY, "false");
    setIsHidden(true);
  };

  const handleShow = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsHidden(false);
  };

  if (loading) {
    return null;
  }

  if (!config?.ativo || employees.length === 0) {
    return null;
  }

  // Show collapsed state when hidden
  if (isHidden) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShow}
        className="gap-2 border-warning/50 text-warning hover:bg-warning/10"
      >
        <Eye className="h-4 w-4" />
        Mostrar Período de Experiência ({employees.length})
      </Button>
    );
  }

  const getUrgencyColor = (daysRemaining: number, daysUntilMilestone: number | null) => {
    if (daysUntilMilestone !== null && daysUntilMilestone <= 7) {
      return "text-destructive";
    }
    if (daysRemaining <= 15) {
      return "text-warning";
    }
    return "text-muted-foreground";
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-warning" />
          Período de Experiência
          <Badge variant="secondary" className="ml-auto mr-2">
            {employees.length} {employees.length === 1 ? "funcionário" : "funcionários"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleHide}
            title="Esconder"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-background border"
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <User className="h-5 w-5 text-warning" />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">{emp.nome_completo}</p>
                <Badge
                  variant={emp.daysUntilMilestone && emp.daysUntilMilestone <= 7 ? "destructive" : "secondary"}
                >
                  {emp.daysRemaining} dias restantes
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {emp.cargo} {emp.setor && `• ${emp.setor}`}
              </p>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {emp.daysWorked} dias trabalhados
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(emp.progress)}%
                  </span>
                </div>
                <Progress value={emp.progress} className="h-2" />
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Admissão: {format(new Date(emp.data_admissao), "dd/MM/yyyy")}</span>
                </div>
                {emp.nextMilestone && emp.daysUntilMilestone !== null && (
                  <div className={`flex items-center gap-1 ${getUrgencyColor(emp.daysRemaining, emp.daysUntilMilestone)}`}>
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      {emp.daysUntilMilestone === 0 
                        ? `Vence hoje (${emp.nextMilestone} dias)`
                        : `${emp.daysUntilMilestone}d para ${emp.nextMilestone} dias`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};