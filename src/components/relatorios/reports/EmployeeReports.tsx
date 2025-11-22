import { useState, useMemo } from "react";
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
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const EmployeeReports = () => {
  const [reportType, setReportType] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedContractType, setSelectedContractType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const paginatedData = useMemo(() => {
    if (!employees) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return employees.slice(startIndex, endIndex);
  }, [employees, currentPage]);

  const totalPages = Math.ceil((employees?.length || 0) / itemsPerPage);

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
    doc.setFontSize(14);
    doc.text(getReportTitle(), 14, 15);
    doc.setFontSize(9);
    doc.text(`${new Date().toLocaleDateString()} | Total: ${employees?.length || 0}`, 14, 22);

    // Tabela compacta
    let yPos = 30;
    const lineHeight = 6;
    
    employees?.forEach((emp, i) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 15;
      }
      
      const line = `${i + 1}. ${emp.nome_completo} | ${emp.cargo} | ${emp.empresas?.nome || '-'} | ${emp.status}`;
      doc.text(line, 14, yPos);
      yPos += lineHeight;
    });

    doc.save(`funcionarios-${new Date().getTime()}.pdf`);
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
            {employees?.length || 0} registros | Página {currentPage} de {totalPages}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : employees && employees.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2">Nome</TableHead>
                      <TableHead className="py-2">Cargo</TableHead>
                      <TableHead className="py-2">Empresa</TableHead>
                      <TableHead className="py-2">Setor</TableHead>
                      <TableHead className="py-2">Contrato</TableHead>
                      <TableHead className="py-2">Status</TableHead>
                      <TableHead className="py-2">Sexo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="py-2 font-medium">{employee.nome_completo}</TableCell>
                        <TableCell className="py-2">{employee.cargo}</TableCell>
                        <TableCell className="py-2">{employee.empresas?.nome || "-"}</TableCell>
                        <TableCell className="py-2">{employee.setor || "-"}</TableCell>
                        <TableCell className="py-2">{employee.tipo_contrato}</TableCell>
                        <TableCell className="py-2">{getStatusLabel(employee.status || "")}</TableCell>
                        <TableCell className="py-2">{employee.sexo || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
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
