import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ExportButtons from "../ExportButtons";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Loader2 } from "lucide-react";

const EmployeeReports = () => {
  const [reportType, setReportType] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedContractType, setSelectedContractType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sectors
  const { data: sectors } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees with filters
  const { data: employees, isLoading } = useQuery({
    queryKey: [
      "employees-report",
      selectedCompany,
      selectedSector,
      selectedContractType,
      selectedStatus,
      selectedGender,
    ],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, empresas(nome)");

      if (selectedCompany !== "all") {
        query = query.eq("empresa_id", selectedCompany);
      }
      if (selectedSector !== "all") {
        query = query.eq("setor", selectedSector);
      }
      if (selectedContractType !== "all") {
        query = query.eq("tipo_contrato", selectedContractType as any);
      }
      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus as any);
      }
      if (selectedGender !== "all") {
        query = query.eq("sexo", selectedGender);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getReportTitle = () => {
    switch (reportType) {
      case "gender":
        return "Relatório de Funcionários por Sexo";
      case "company":
        return "Relatório de Funcionários por Empresa";
      case "sector":
        return "Relatório de Funcionários por Setor";
      case "contract":
        return "Relatório de Funcionários por Tipo de Contrato";
      case "status":
        return "Relatório de Funcionários por Status";
      default:
        return "Relatório Completo de Funcionários";
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = getReportTitle();
    
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total: ${employees?.length || 0} funcionários`, 14, 36);

    let yPos = 46;
    
    employees?.forEach((emp, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`${index + 1}. ${emp.nome_completo}`, 14, yPos);
      doc.text(`Cargo: ${emp.cargo}`, 20, yPos + 6);
      if (emp.empresas) doc.text(`Empresa: ${emp.empresas.nome}`, 20, yPos + 12);
      if (emp.setor) doc.text(`Setor: ${emp.setor}`, 20, yPos + 18);
      doc.text(`Status: ${emp.status}`, 20, yPos + 24);
      if (emp.sexo) doc.text(`Sexo: ${emp.sexo}`, 20, yPos + 30);
      
      yPos += 40;
    });

    doc.save(`relatorio-funcionarios-${new Date().getTime()}.pdf`);
  };

  const exportToExcel = () => {
    const data = employees?.map((emp) => ({
      Nome: emp.nome_completo,
      CPF: emp.cpf,
      Cargo: emp.cargo,
      Empresa: emp.empresas?.nome || "-",
      Setor: emp.setor || "-",
      "Tipo Contrato": emp.tipo_contrato,
      Status: emp.status,
      Sexo: emp.sexo || "-",
      Salário: emp.salario,
      "Data Admissão": emp.data_admissao,
    }));

    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Funcionários");
    XLSX.writeFile(wb, `relatorio-funcionarios-${new Date().getTime()}.xlsx`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativo: "Ativo",
      ferias: "Férias",
      afastado: "Afastado",
      demitido: "Demitido",
    };
    return labels[status] || status;
  };

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
                  <SelectItem value="all">Lista Completa</SelectItem>
                  <SelectItem value="gender">Por Sexo</SelectItem>
                  <SelectItem value="company">Por Empresa</SelectItem>
                  <SelectItem value="sector">Por Setor</SelectItem>
                  <SelectItem value="contract">Por Tipo de Contrato</SelectItem>
                  <SelectItem value="status">Por Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sectors?.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={selectedContractType} onValueChange={setSelectedContractType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="intermitente">Intermitente</SelectItem>
                  <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                  <SelectItem value="demitido">Demitido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <ExportButtons
              onExportPDF={exportToPDF}
              onExportExcel={exportToExcel}
              disabled={!employees || employees.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{getReportTitle()}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {employees?.length || 0} funcionários
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : employees && employees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sexo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.nome_completo}</TableCell>
                      <TableCell>{employee.cargo}</TableCell>
                      <TableCell>{employee.empresas?.nome || "-"}</TableCell>
                      <TableCell>{employee.setor || "-"}</TableCell>
                      <TableCell>{employee.tipo_contrato}</TableCell>
                      <TableCell>{getStatusLabel(employee.status || "")}</TableCell>
                      <TableCell>{employee.sexo || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum funcionário encontrado com os filtros selecionados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReports;
