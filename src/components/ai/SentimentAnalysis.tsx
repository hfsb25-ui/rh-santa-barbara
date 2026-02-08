import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, RefreshCw, Brain } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface SentimentData {
  analysis: string;
  data: {
    totalComments: number;
  };
}

export function SentimentAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);

  const analyzeSentiment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-reports", {
        body: { type: "sentiment" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao analisar sentimentos");

      setSentiment(data);
      toast({
        title: "Análise concluída",
        description: `${data.data.totalComments} comentários analisados`,
      });
    } catch (error) {
      console.error("Sentiment error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao analisar sentimentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise de Sentimento
          </h3>
          <p className="text-sm text-muted-foreground">
            Análise de comentários das avaliações de desempenho
          </p>
        </div>
        <Button onClick={analyzeSentiment} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Analisar Comentários
            </>
          )}
        </Button>
      </div>

      {sentiment && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="text-3xl font-bold">{sentiment.data.totalComments}</p>
                  <p className="text-sm text-muted-foreground">Comentários Analisados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Resultado da Análise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{sentiment.analysis}</ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {!sentiment && !isLoading && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Analisar Comentários" para processar os comentários das avaliações</p>
            <p className="text-xs mt-2">A análise identifica padrões positivos e negativos nos feedbacks</p>
          </div>
        </Card>
      )}
    </div>
  );
}
