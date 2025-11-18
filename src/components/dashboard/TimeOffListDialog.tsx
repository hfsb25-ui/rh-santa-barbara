import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import EditTimeOffDialog from "./EditTimeOffDialog";
import jsPDF from "jspdf";

interface TimeOffListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmployeeTimeOff {
  id: string;
  nome_completo: string;
  cargo: string;
  quantidade_folgas: number;
  ultima_alteracao_folgas: string | null;
}

const TimeOffListDialog = ({ open, onOpenChange }: TimeOffListDialogProps) => {
  const [employees, setEmployees] = useState<EmployeeTimeOff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployeeTimeOff();
    }
  }, [open]);

  const fetchEmployeeTimeOff = async () => {
    setLoading(true);
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, quantidade_folgas, ultima_alteracao_folgas")
        .order("nome_completo");

      if (employeesError) throw employeesError;

      setEmployees(employeesData || []);
    } catch (error) {
      console.error("Erro ao buscar folgas:", error);
      toast.error("Erro ao carregar dados de folgas");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (employees.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Hotel Fazenda Santa Bárbara", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.text("FOLGAS NA CASA - RELATÓRIO DE FUNCIONÁRIOS", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const currentDate = new Date().toLocaleDateString("pt-BR");
    doc.text(`Data: ${currentDate}`, pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 15;

    // Table header
    doc.setFont("helvetica", "bold");
    doc.text("Nome Completo", 20, yPosition);
    doc.text("Cargo", 100, yPosition);
    doc.text("Folgas", 170, yPosition);
    
    yPosition += 8;
    doc.setFont("helvetica", "normal");

    // Employee data
    employees.forEach((emp) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const nameText = doc.splitTextToSize(emp.nome_completo, 75);
      const cargoText = doc.splitTextToSize(emp.cargo, 65);
      
      doc.text(nameText, 20, yPosition);
      doc.text(cargoText, 100, yPosition);
      doc.text(emp.quantidade_folgas.toString(), 170, yPosition);
      
      yPosition += Math.max(nameText.length, cargoText.length) * 5 + 3;
    });

    // Footer
    yPosition += 10;
    doc.setFontSize(8);
    doc.text(
      `Total de funcionários: ${employees.length}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );

    // Save PDF
    const fileName = `Folgas_Funcionarios_${currentDate.replace(/\//g, "-")}.pdf`;
    doc.save(fileName);
    
    toast.success("Lista exportada em PDF com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Folgas na Casa - Todos os Funcionários</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {employees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum funcionário cadastrado
              </p>
            ) : (
              <div className="grid gap-3">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {employee.nome_completo}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {employee.cargo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {employee.quantidade_folgas}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {employee.quantidade_folgas === 1 ? "folga" : "folgas"}
                            </p>
                            {employee.ultima_alteracao_folgas && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Alterado em: {new Date(employee.ultima_alteracao_folgas).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            )}
                          </div>
                          <EditTimeOffDialog
                            employeeId={employee.id}
                            employeeName={employee.nome_completo}
                            currentAmount={employee.quantidade_folgas}
                            onUpdated={fetchEmployeeTimeOff}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TimeOffListDialog;
