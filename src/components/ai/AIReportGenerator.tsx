import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Calendar, Download, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface ReportData {
  report: string;
  data: {
    month: number;
    year: number;
    employees: number;
    admissoes: number;
    desligamentos: number;
    ferias: number;
    faltas: number;
    faltasNaoJustificadas: number;
    tacs: number;
    avaliacoes: number;
    avaliacoesMedia: number;
    treinamentos: number;
  };
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function AIReportGenerator() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-reports", {
        body: { 
          type: "monthly",
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear)
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar relatório");

      setReport(data);
      toast({
        title: "Relatório gerado",
        description: `Relatório de ${MONTHS[parseInt(selectedMonth) - 1]}/${selectedYear} pronto`,
      });
    } catch (error) {
      console.error("Report error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar relatório",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    const content = `RELATÓRIO MENSAL DE RH - ${MONTHS[report.data.month - 1]} de ${report.data.year}\n\n${report.report}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-rh-${report.data.year}-${String(report.data.month).padStart(2, '0')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerador de Relatórios com IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Relatórios mensais automáticos com insights e análises
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>

            {report && (
              <Button variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Funcionários</p>
                <p className="text-xl font-bold">{report.data.employees}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Admissões</p>
                <p className="text-xl font-bold text-green-600">+{report.data.admissoes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Desligamentos</p>
                <p className="text-xl font-bold text-red-600">-{report.data.desligamentos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Faltas</p>
                <p className="text-xl font-bold">{report.data.faltas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">TACs</p>
                <p className="text-xl font-bold">{report.data.tacs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Média Avaliações</p>
                <p className="text-xl font-bold">{report.data.avaliacoesMedia.toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Relatório de {MONTHS[report.data.month - 1]} de {report.data.year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{report.report}</ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {!report && !isLoading && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione o mês e ano e clique em "Gerar Relatório" para criar um relatório com IA</p>
          </div>
        </Card>
      )}
    </div>
  );
}
