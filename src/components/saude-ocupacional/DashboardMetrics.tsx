import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState({
    total: 0,
    pendentes: 0,
    agendados: 0,
    realizados: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("encaminhamentos_medicos")
        .select("status");

      if (error) throw error;

      const total = data?.length || 0;
      const pendentes = data?.filter((e) => e.status === "pendente").length || 0;
      const agendados = data?.filter((e) => e.status === "agendado").length || 0;
      const realizados = data?.filter((e) => e.status === "realizado").length || 0;

      setMetrics({ total, pendentes, agendados, realizados });
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total de Encaminhamentos",
      value: metrics.total,
      icon: FileText,
      color: "text-blue-500",
    },
    {
      title: "Pendentes",
      value: metrics.pendentes,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      title: "Agendados",
      value: metrics.agendados,
      icon: Calendar,
      color: "text-orange-500",
    },
    {
      title: "Realizados",
      value: metrics.realizados,
      icon: CheckCircle2,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
