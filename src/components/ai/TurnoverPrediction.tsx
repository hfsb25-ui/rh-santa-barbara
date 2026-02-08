import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RiskFactor {
  factor: string;
  score: number;
  detail: string;
}

interface EmployeeRisk {
  employee_id: string;
  nome: string;
  cargo: string;
  setor: string;
  score: number;
  risk_level: "alto" | "medio" | "baixo";
  factors: RiskFactor[];
  suggestion?: string;
}

interface PredictionData {
  data: EmployeeRisk[];
  summary: {
    total: number;
    alto: number;
    medio: number;
    baixo: number;
  };
}

export function TurnoverPrediction() {
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predictions", {
        body: { type: "turnover" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar predições");

      setPredictions(data);
      toast({
        title: "Análise concluída",
        description: `${data.summary.total} funcionários analisados`,
      });
    } catch (error) {
      console.error("Prediction error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar predições",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "alto":
        return "destructive";
      case "medio":
        return "warning";
      case "baixo":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "alto":
        return <AlertTriangle className="h-4 w-4" />;
      case "medio":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Predição de Risco de Turnover
          </h3>
          <p className="text-sm text-muted-foreground">
            Análise preditiva baseada em avaliações, faltas, TACs e engajamento
          </p>
        </div>
        <Button onClick={fetchPredictions} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar Análise
            </>
          )}
        </Button>
      </div>

      {predictions && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Analisado</p>
                  <p className="text-3xl font-bold">{predictions.summary.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-destructive">Alto Risco</p>
                  <p className="text-3xl font-bold text-destructive">{predictions.summary.alto}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-yellow-600">Médio Risco</p>
                  <p className="text-3xl font-bold text-yellow-600">{predictions.summary.medio}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-green-600">Baixo Risco</p>
                  <p className="text-3xl font-bold text-green-600">{predictions.summary.baixo}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funcionários em Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {predictions.data.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum funcionário com risco significativo identificado
                    </p>
                  ) : (
                    predictions.data.map((employee) => (
                      <Card key={employee.employee_id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{employee.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {employee.cargo} • {employee.setor}
                            </p>
                          </div>
                          <Badge variant={getRiskColor(employee.risk_level) as any}>
                            {getRiskIcon(employee.risk_level)}
                            <span className="ml-1">
                              {employee.score}/100 - {employee.risk_level.charAt(0).toUpperCase() + employee.risk_level.slice(1)}
                            </span>
                          </Badge>
                        </div>

                        <Progress value={employee.score} className="h-2 mb-3" />

                        <div className="space-y-2 mb-3">
                          {employee.factors.map((factor, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{factor.factor}:</span>
                              <span className="text-muted-foreground">{factor.detail}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                +{factor.score}
                              </Badge>
                            </div>
                          ))}
                        </div>

                        {employee.suggestion && (
                          <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{employee.suggestion}</p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {!predictions && !isLoading && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Gerar Análise" para identificar funcionários com risco de turnover</p>
          </div>
        </Card>
      )}
    </div>
  );
}
