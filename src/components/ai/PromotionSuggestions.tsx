import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, Award, Star, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PromotionCandidate {
  employee_id: string;
  nome: string;
  cargo: string;
  setor: string;
  score: number;
  factors: string[];
}

interface PromotionData {
  data: PromotionCandidate[];
  total: number;
}

export function PromotionSuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [promotions, setPromotions] = useState<PromotionData | null>(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predictions", {
        body: { type: "promotion" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao buscar sugestões");

      setPromotions(data);
      toast({
        title: "Análise concluída",
        description: `${data.total} candidatos identificados`,
      });
    } catch (error) {
      console.error("Promotion error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao buscar sugestões",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-muted-foreground";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-muted";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Sugestões de Promoção
          </h3>
          <p className="text-sm text-muted-foreground">
            Funcionários com melhor desempenho e potencial para promoção
          </p>
        </div>
        <Button onClick={fetchPromotions} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Candidatos
            </>
          )}
        </Button>
      </div>

      {promotions && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <Star className="h-8 w-8 text-yellow-500" />
                <div className="text-center">
                  <p className="text-3xl font-bold">{promotions.total}</p>
                  <p className="text-sm text-muted-foreground">Candidatos Identificados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de Candidatos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {promotions.data.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum candidato identificado com os critérios atuais
                    </p>
                  ) : (
                    promotions.data.map((candidate, index) => (
                      <Card key={candidate.employee_id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{candidate.nome}</h4>
                              <p className="text-sm text-muted-foreground">
                                {candidate.cargo} • {candidate.setor}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getScoreColor(candidate.score)}`}>
                              {candidate.score}
                            </p>
                            <p className="text-xs text-muted-foreground">pontos</p>
                          </div>
                        </div>

                        <Progress 
                          value={candidate.score} 
                          className="h-2 mb-3"
                        />

                        <div className="flex flex-wrap gap-2">
                          {candidate.factors.map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Critérios de Avaliação</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Avaliação ≥ 8</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Tempo ≥ 1 ano</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Cursos concluídos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Sem TACs recentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Boa frequência</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!promotions && !isLoading && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Buscar Candidatos" para identificar funcionários com potencial de promoção</p>
          </div>
        </Card>
      )}
    </div>
  );
}
