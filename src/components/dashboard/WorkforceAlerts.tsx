import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkforceAlert {
  setor_nome: string;
  quantidade_atual: number;
  quantidade_media: number;
  tipo: "abaixo" | "acima";
}

export function WorkforceAlerts() {
  const [alerts, setAlerts] = useState<WorkforceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);

    // Fetch all configurations (only where alerts are active)
    const { data: configData } = await supabase
      .from("configuracao_setor")
      .select(`
        setor_id,
        quantidade_media,
        alertas_ativos,
        setores(nome)
      `)
      .eq("alertas_ativos", true);

    if (!configData || configData.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch current employee count per sector
    const { data: employeesData } = await supabase
      .from("employees")
      .select("setor")
      .eq("status", "ativo");

    // Count employees per sector
    const employeeCount: Record<string, number> = {};
    employeesData?.forEach((emp) => {
      if (emp.setor) {
        employeeCount[emp.setor] = (employeeCount[emp.setor] || 0) + 1;
      }
    });

    // Generate alerts
    const newAlerts: WorkforceAlert[] = [];
    configData.forEach((config: any) => {
      const setorNome = config.setores?.nome;
      if (!setorNome) return;

      const quantidadeAtual = employeeCount[setorNome] || 0;
      const quantidadeMedia = config.quantidade_media;

      if (quantidadeMedia === 0) return;

      if (quantidadeAtual < quantidadeMedia) {
        newAlerts.push({
          setor_nome: setorNome,
          quantidade_atual: quantidadeAtual,
          quantidade_media: quantidadeMedia,
          tipo: "abaixo",
        });
      } else if (quantidadeAtual > quantidadeMedia) {
        newAlerts.push({
          setor_nome: setorNome,
          quantidade_atual: quantidadeAtual,
          quantidade_media: quantidadeMedia,
          tipo: "acima",
        });
      }
    });

    setAlerts(newAlerts);
    setLoading(false);
  };

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertas de Quantidade de Funcionários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            variant={alert.tipo === "abaixo" ? "destructive" : "default"}
          >
            {alert.tipo === "abaixo" ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            <AlertTitle>
              {alert.setor_nome} - Quantidade {alert.tipo === "abaixo" ? "Abaixo" : "Acima"} da Média
            </AlertTitle>
            <AlertDescription>
              O setor <strong>{alert.setor_nome}</strong> possui atualmente{" "}
              <strong>{alert.quantidade_atual}</strong> funcionário(s) ativo(s),
              {alert.tipo === "abaixo" ? " abaixo" : " acima"} da média esperada de{" "}
              <strong>{alert.quantidade_media}</strong> funcionário(s).
              {alert.tipo === "abaixo" && (
                <span className="block mt-1 text-sm">
                  Considere realizar contratações para este setor.
                </span>
              )}
              {alert.tipo === "acima" && (
                <span className="block mt-1 text-sm">
                  O setor está com excesso de funcionários em relação à média configurada.
                </span>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
