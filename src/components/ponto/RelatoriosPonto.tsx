import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generatePontoPDF } from "@/lib/pdfGeneratorPonto";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const TIPO_DIA_LABELS: Record<string, string> = {
  normal: "Normal",
  abonado: "Abonado",
  falta: "Falta",
  ferias: "Férias",
  atestado: "Atestado",
};

export function RelatoriosPonto() {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [exporting, setExporting] = useState(false);

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-for-relatorio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo")
        .order("nome_completo");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["relatorio-ponto", selectedEmployee, selectedMonth],
    queryFn: async () => {
      if (!selectedEmployee || !selectedMonth) return null;
      
      const [year, month] = selectedMonth.split("-");
      const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
      
      const { data: registros, error: regError } = await supabase
        .from("registros_ponto")
        .select("*")
        .eq("employee_id", selectedEmployee)
        .gte("data", startDate)
        .lte("data", endDate)
        .order("data");
      
      if (regError) throw regError;

      const { data: employeeData, error: empError } = await supabase
        .from("employees")
        .select("nome_completo, cargo, setor, empresa_id")
        .eq("id", selectedEmployee)
        .single();
      
      if (empError) throw empError;

      const { data: config, error: configError } = await supabase
        .from("configuracao_horas_trabalho")
        .select("*")
        .eq("employee_id", selectedEmployee)
        .maybeSingle();
      
      if (configError) throw configError;

      let empresa = null;
      if (employeeData.empresa_id) {
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome, logo_url")
          .eq("id", employeeData.empresa_id)
          .single();
        empresa = empresaData;
      }

      const horasDiarias = config?.horas_diarias_esperadas || 8.00;
      const diasUteis = registros.filter(r => r.tipo_dia === "normal").length;
      const horasEsperadas = diasUteis * horasDiarias;
      const horasTrabalhadas = registros.reduce((sum, r) => sum + (r.horas_trabalhadas || 0), 0);
      const saldo = horasTrabalhadas - horasEsperadas;

      return {
        registros,
        horasEsperadas,
        horasTrabalhadas,
        saldo,
        horasDiarias,
        employee: employeeData,
        empresa,
      };
    },
    enabled: !!selectedEmployee && !!selectedMonth,
  });

  const getSaldoBadge = (saldo: number) => {
    if (saldo > 0) {
      return <Badge variant="default" className="bg-green-500">+{saldo.toFixed(2)}h</Badge>;
    } else if (saldo < 0) {
      return <Badge variant="destructive">{saldo.toFixed(2)}h</Badge>;
    } else {
      return <Badge variant="secondary">0.00h</Badge>;
    }
  };

  const handleExportPDF = async () => {
    if (!report || !report.employee) return;
    
    setExporting(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const mesFormatado = format(new Date(parseInt(year), parseInt(month) - 1), "MMMM 'de' yyyy", { locale: ptBR });
      
      await generatePontoPDF({
        employee: report.employee,
        mes: mesFormatado,
        registros: report.registros,
        horasEsperadas: report.horasEsperadas,
        horasTrabalhadas: report.horasTrabalhadas,
        saldo: report.saldo,
        horasDiarias: report.horasDiarias,
        empresa: report.empresa || undefined,
      });
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!report || !report.employee) return;
    
    setExporting(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const mesFormatado = format(new Date(parseInt(year), parseInt(month) - 1), "MMMM 'de' yyyy", { locale: ptBR });
      
      // Cabeçalho
      const header = [
        ["RELATÓRIO DE PONTO"],
        [`Período: ${mesFormatado}`],
        [],
        ["DADOS DO FUNCIONÁRIO"],
        [`Nome: ${report.employee.nome_completo}`],
        [`Cargo: ${report.employee.cargo}`],
        [`Setor: ${report.employee.setor || "-"}`],
        [`Horas Diárias Esperadas: ${report.horasDiarias.toFixed(2)}h`],
        [],
      ];

      // Dados da tabela
      const tableHeader = [["Data", "Tipo", "Entrada", "Saída", "Início Intervalo", "Fim Intervalo", "Horas", "Observações"]];
      
      const tableData = report.registros.map((reg) => {
        const dataFormatada = format(new Date(reg.data + "T00:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR });
        return [
          dataFormatada,
          TIPO_DIA_LABELS[reg.tipo_dia] || reg.tipo_dia,
          reg.hora_entrada || "-",
          reg.hora_saida || "-",
          reg.hora_inicio_intervalo || "-",
          reg.hora_fim_intervalo || "-",
          reg.horas_trabalhadas ? `${reg.horas_trabalhadas.toFixed(2)}h` : "0.00h",
          reg.observacoes || "-",
        ];
      });

      // Resumo
      const resumo = [
        [],
        ["RESUMO DO PERÍODO"],
        [`Horas Esperadas: ${report.horasEsperadas.toFixed(2)}h`],
        [`Horas Trabalhadas: ${report.horasTrabalhadas.toFixed(2)}h`],
        [`Saldo: ${report.saldo >= 0 ? "+" : ""}${report.saldo.toFixed(2)}h`],
      ];

      // Combinar tudo
      const wsData = [...header, ...tableHeader, ...tableData, ...resumo];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Larguras das colunas
      ws["!cols"] = [
        { wch: 20 }, // Data
        { wch: 15 }, // Tipo
        { wch: 10 }, // Entrada
        { wch: 10 }, // Saída
        { wch: 15 }, // Início Intervalo
        { wch: 15 }, // Fim Intervalo
        { wch: 10 }, // Horas
        { wch: 30 }, // Observações
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório de Ponto");
      
      const fileName = `relatorio_ponto_${report.employee.nome_completo.replace(/\s+/g, "_")}_${selectedMonth.replace("/", "-")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Excel gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      toast.error("Erro ao gerar Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Relatórios de Ponto</h2>
        <p className="text-muted-foreground">
          Visualize relatórios detalhados e saldo de horas dos funcionários
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee-relatorio">Funcionário *</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent>
              {loadingEmployees ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : (
                employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome_completo} - {emp.cargo}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="month-relatorio">Mês *</Label>
          <Input
            id="month-relatorio"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {loadingReport && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Horas Esperadas</div>
              <div className="text-2xl font-bold">{report.horasEsperadas.toFixed(2)}h</div>
            </div>
            <div className="p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Horas Trabalhadas</div>
              <div className="text-2xl font-bold">{report.horasTrabalhadas.toFixed(2)}h</div>
            </div>
            <div className="p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Saldo de Horas</div>
              <div className="text-2xl font-bold">{getSaldoBadge(report.saldo)}</div>
            </div>
            <div className="p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Horas/Dia Esperadas</div>
              <div className="text-2xl font-bold">{report.horasDiarias.toFixed(2)}h</div>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.registros.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">
                      {format(new Date(reg.data + "T00:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reg.tipo_dia === "falta" ? "destructive" : "secondary"}>
                        {TIPO_DIA_LABELS[reg.tipo_dia]}
                      </Badge>
                    </TableCell>
                    <TableCell>{reg.hora_entrada || "-"}</TableCell>
                    <TableCell>{reg.hora_saida || "-"}</TableCell>
                    <TableCell>
                      {reg.hora_inicio_intervalo && reg.hora_fim_intervalo
                        ? `${reg.hora_inicio_intervalo} - ${reg.hora_fim_intervalo}`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {reg.horas_trabalhadas?.toFixed(2) || "0.00"}h
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reg.observacoes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
