import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, addDays, format } from "date-fns";

interface ExperienceAlert {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  data_admissao: string;
  daysUntilMilestone: number;
  milestone: number;
  milestoneDate: Date;
}

interface Config {
  ativo: boolean;
  dias_antecedencia: number;
  marcos_dias: number[];
}

interface ExperiencePeriodAlertsProps {
  selectedEmpresa?: string;
}

export const ExperiencePeriodAlerts = ({ selectedEmpresa }: ExperiencePeriodAlertsProps) => {
  const [alerts, setAlerts] = useState<ExperienceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config?.ativo) {
      fetchExperienceAlerts();
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

  const fetchExperienceAlerts = async () => {
    if (!config) return;

    try {
      let query = supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor, data_admissao")
        .eq("status", "ativo")
        .not("data_admissao", "is", null);

      if (selectedEmpresa && selectedEmpresa !== "all") {
        query = query.eq("empresa_id", selectedEmpresa);
      }

      const { data: employees, error } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const experienceAlerts: ExperienceAlert[] = [];
      const sortedMarcos = [...config.marcos_dias].sort((a, b) => a - b);

      employees?.forEach((emp) => {
        if (!emp.data_admissao) return;

        const admissionDate = new Date(emp.data_admissao);
        const daysSinceAdmission = differenceInDays(today, admissionDate);

        sortedMarcos.forEach((marco, index) => {
          const milestoneDate = addDays(admissionDate, marco);
          const daysUntilMilestone = differenceInDays(milestoneDate, today);
          
          // Check if within alert window and hasn't passed the previous milestone recently
          const previousMarco = index > 0 ? sortedMarcos[index - 1] : 0;
          
          if (daysUntilMilestone >= 0 && daysUntilMilestone <= config.dias_antecedencia && daysSinceAdmission >= previousMarco) {
            experienceAlerts.push({
              id: emp.id,
              nome_completo: emp.nome_completo,
              cargo: emp.cargo,
              setor: emp.setor,
              data_admissao: emp.data_admissao,
              daysUntilMilestone,
              milestone: marco,
              milestoneDate,
            });
          }
        });
      });

      // Sort by days until milestone (most urgent first)
      experienceAlerts.sort((a, b) => a.daysUntilMilestone - b.daysUntilMilestone);
      setAlerts(experienceAlerts);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!config?.ativo || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Período de Experiência
          <Badge variant="secondary" className="ml-auto">
            {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={`${alert.id}-${alert.milestone}`}
            className="flex items-start gap-3 p-3 rounded-lg bg-background border"
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <User className="h-5 w-5 text-warning" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{alert.nome_completo}</p>
              <p className="text-sm text-muted-foreground">
                {alert.cargo} {alert.setor && `• ${alert.setor}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">
                  {alert.daysUntilMilestone === 0 ? (
                    <span className="text-destructive font-medium">
                      Vence hoje - {alert.milestone} dias
                    </span>
                  ) : (
                    <span>
                      Vence em{" "}
                      <span className="font-medium text-warning">
                        {alert.daysUntilMilestone} {alert.daysUntilMilestone === 1 ? "dia" : "dias"}
                      </span>
                      {" "}({alert.milestone} dias - {format(alert.milestoneDate, "dd/MM/yyyy")})
                    </span>
                  )}
                </span>
              </div>
            </div>
            <Badge
              variant={alert.milestone === 45 ? "secondary" : "default"}
              className={alert.milestone === 90 ? "bg-warning text-warning-foreground" : ""}
            >
              {alert.milestone} dias
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
