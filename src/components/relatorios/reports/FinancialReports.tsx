import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ExportButtons from "../ExportButtons";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Loader2 } from "lucide-react";

const FinancialReports = () => {
  const [reportType, setReportType] = useState("payroll");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: payroll, isLoading: loadingPayroll } = useQuery({
    queryKey: ["payroll-report", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folha_pagamento")
        .select("*, employees(nome_completo, cargo, tipo_contrato), empresas(nome)")
        .eq("mes", selectedMonth)
        .eq("ano", selectedYear);
      if (error) throw error;
      return data;
    },
    enabled: reportType === "payroll",
  });

  const { data: salaryHistory, isLoading: loadingSalaryHistory } = useQuery({
    queryKey: ["salary-history-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_reajustes_salariais")
        .select("*, employees(nome_completo, cargo)")
        .order("aplicado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: reportType === "salary-history",
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title =
      reportType === "payroll"
        ? `Relatório de Folha de Pagamento - ${selectedMonth}/${selectedYear}`
        : "Relatório de Histórico Salarial";

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);

    if (reportType === "payroll") {
      const total = payroll?.reduce((sum, p) => sum + Number(p.valor_liquido), 0) || 0;
      doc.text(`Total Geral: R$ ${total.toFixed(2)}`, 14, 36);

      let yPos = 46;
      payroll?.forEach((item, index) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(`${index + 1}. ${item.employees?.nome_completo}`, 14, yPos);
        doc.text(`Empresa: ${item.empresas?.nome}`, 20, yPos + 6);
        doc.text(`Valor Bruto: R$ ${Number(item.valor_bruto).toFixed(2)}`, 20, yPos + 12);
        doc.text(`Valor Líquido: R$ ${Number(item.valor_liquido).toFixed(2)}`, 20, yPos + 18);

        yPos += 26;
      });
    } else {
      let yPos = 46;
      salaryHistory?.forEach((item, index) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(`${index + 1}. ${item.employees?.nome_completo}`, 14, yPos);
        doc.text(
          `Anterior: R$ ${Number(item.salario_anterior).toFixed(2)} → Novo: R$ ${Number(item.salario_novo).toFixed(2)}`,
          20,
          yPos + 6
        );
        doc.text(`Reajuste: ${item.percentual_reajuste}%`, 20, yPos + 12);
        doc.text(`Justificativa: ${item.justificativa}`, 20, yPos + 18);

        yPos += 26;
      });
    }

    doc.save(`relatorio-financeiro-${new Date().getTime()}.pdf`);
  };

  const exportToExcel = () => {
    let data: any[] = [];
    let sheetName = "";

    if (reportType === "payroll") {
      sheetName = "Folha de Pagamento";
      data =
        payroll?.map((item) => ({
          Funcionário: item.employees?.nome_completo,
          Cargo: item.employees?.cargo,
          Empresa: item.empresas?.nome,
          "Tipo Contrato": item.employees?.tipo_contrato,
          "Valor Bruto": Number(item.valor_bruto),
          Descontos: Number(item.descontos),
          "Valor Líquido": Number(item.valor_liquido),
          Mês: item.mes,
          Ano: item.ano,
        })) || [];
    } else {
      sheetName = "Histórico Salarial";
      data =
        salaryHistory?.map((item) => ({
          Funcionário: item.employees?.nome_completo,
          Cargo: item.employees?.cargo,
          "Salário Anterior": Number(item.salario_anterior),
          "Salário Novo": Number(item.salario_novo),
          "Percentual Reajuste": item.percentual_reajuste,
          Justificativa: item.justificativa,
          Data: new Date(item.aplicado_em).toLocaleDateString(),
        })) || [];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `relatorio-financeiro-${new Date().getTime()}.xlsx`);
  };

  const isLoading = loadingPayroll || loadingSalaryHistory;
  const currentData = reportType === "payroll" ? payroll : salaryHistory;

  const totalPayroll = payroll?.reduce((sum, p) => sum + Number(p.valor_liquido), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payroll">Folha de Pagamento</SelectItem>
                  <SelectItem value="salary-history">Histórico Salarial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "payroll" && (
              <>
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleDateString("pt-BR", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <ExportButtons
              onExportPDF={exportToPDF}
              onExportExcel={exportToExcel}
              disabled={!currentData || currentData.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {reportType === "payroll"
              ? `Folha de Pagamento - ${selectedMonth}/${selectedYear}`
              : "Histórico de Reajustes Salariais"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {reportType === "payroll" && `Total: R$ ${totalPayroll.toFixed(2)} | `}
            {currentData?.length || 0} registros
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : currentData && currentData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    {reportType === "payroll" ? (
                      <>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>Valor Líquido</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Anterior</TableHead>
                        <TableHead>Novo</TableHead>
                        <TableHead>Reajuste %</TableHead>
                        <TableHead>Justificativa</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.employees?.nome_completo}
                      </TableCell>
                      <TableCell>{item.employees?.cargo}</TableCell>
                      {reportType === "payroll" ? (
                        <>
                          <TableCell>{item.empresas?.nome}</TableCell>
                          <TableCell>R$ {Number(item.valor_bruto).toFixed(2)}</TableCell>
                          <TableCell>R$ {Number(item.valor_liquido).toFixed(2)}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>R$ {Number(item.salario_anterior).toFixed(2)}</TableCell>
                          <TableCell>R$ {Number(item.salario_novo).toFixed(2)}</TableCell>
                          <TableCell>{item.percentual_reajuste}%</TableCell>
                          <TableCell>{item.justificativa}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;
