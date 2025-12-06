import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

interface Variavel {
  id: string;
  nome: string;
  codigo?: string | null;
  tipo: "desconto" | "provento";
}

interface PagamentoItem {
  id: string;
  variavel_id: string;
  valor: number;
  variaveis_folha: Variavel;
}

interface Pagamento {
  id: string;
  employee_id: string;
  valor_bruto: number;
  desconto: number;
  descontos: number;
  valor_liquido: number;
  observacoes: string | null;
  mes: number;
  ano: number;
  tipo_folha: string;
  employees: {
    nome_completo: string;
    cargo: string;
    tipo_contrato: string;
    setor: string | null;
    cpf: string | null;
    data_admissao: string | null;
  };
  folha_pagamento_itens?: PagamentoItem[];
}

interface Employee {
  nome_completo: string;
  cargo: string;
  cpf: string | null;
  data_admissao: string | null;
  setor: string | null;
}

interface Empresa {
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
}

interface HoleriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: Pagamento | null;
  empresaId: string;
}

const TIPO_FOLHA_LABELS: Record<string, string> = {
  salario: "Folha de Salário",
  complementar: "Folha Complementar",
  adiantamento: "Folha de Adiantamento",
  decimo_terceiro: "13º Salário",
};

const HoleriteDialog = ({ open, onOpenChange, pagamento, empresaId }: HoleriteDialogProps) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && pagamento) {
      fetchData();
    }
  }, [open, pagamento, empresaId]);

  const fetchData = async () => {
    if (!pagamento) return;
    
    setLoading(true);
    try {
      // Fetch empresa
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("nome, cnpj, logo_url")
        .eq("id", empresaId)
        .single();
      
      setEmpresa(empresaData);

      // Fetch employee details
      const { data: employeeData } = await supabase
        .from("employees")
        .select("nome_completo, cargo, cpf, data_admissao, setor")
        .eq("id", pagamento.employee_id)
        .single();
      
      setEmployee(employeeData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoFolhaLabel = (tipo: string) => {
    return TIPO_FOLHA_LABELS[tipo] || tipo;
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "-";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const generatePDF = async () => {
    if (!pagamento || !empresa || !employee) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let yPos = 20;

    // Logo
    if (empresa.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = empresa.logo_url!;
        });
        doc.addImage(img, "PNG", 15, yPos - 5, 25, 25);
      } catch (e) {
        console.log("Erro ao carregar logo");
      }
    }

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("HOLERITE", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(getTipoFolhaLabel(pagamento.tipo_folha || "salario"), pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Empresa info
    doc.setFontSize(10);
    doc.text(`Empresa: ${empresa.nome}`, 15, yPos);
    yPos += 5;
    if (empresa.cnpj) {
      doc.text(`CNPJ: ${empresa.cnpj}`, 15, yPos);
      yPos += 5;
    }
    
    const mesNome = new Date(pagamento.ano, pagamento.mes - 1).toLocaleString("pt-BR", { month: "long" });
    doc.text(`Período: ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} / ${pagamento.ano}`, 15, yPos);
    yPos += 10;

    // Separator line
    doc.setDrawColor(200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // Employee info
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO FUNCIONÁRIO", 15, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${employee.nome_completo}`, 15, yPos);
    yPos += 5;
    doc.text(`Cargo: ${employee.cargo}`, 15, yPos);
    doc.text(`Setor: ${employee.setor || "-"}`, pageWidth / 2, yPos);
    yPos += 5;
    doc.text(`CPF: ${formatCPF(employee.cpf)}`, 15, yPos);
    doc.text(`Admissão: ${formatDate(employee.data_admissao)}`, pageWidth / 2, yPos);
    yPos += 10;

    // Separator line
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // Proventos e Descontos
    const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
    const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 4, pageWidth - 30, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO", 20, yPos);
    doc.text("PROVENTOS", pageWidth - 70, yPos, { align: "right" });
    doc.text("DESCONTOS", pageWidth - 20, yPos, { align: "right" });
    yPos += 10;

    doc.setFont("helvetica", "normal");

    // Salário base
    doc.text("Salário Base", 20, yPos);
    doc.text(`R$ ${pagamento.valor_bruto.toFixed(2)}`, pageWidth - 70, yPos, { align: "right" });
    doc.text("-", pageWidth - 20, yPos, { align: "right" });
    yPos += 6;

    // Proventos
    proventos.forEach(item => {
      doc.text(item.variaveis_folha?.nome || "-", 20, yPos);
      doc.text(`R$ ${item.valor.toFixed(2)}`, pageWidth - 70, yPos, { align: "right" });
      doc.text("-", pageWidth - 20, yPos, { align: "right" });
      yPos += 6;
    });

    // Descontos
    descontos.forEach(item => {
      doc.text(item.variaveis_folha?.nome || "-", 20, yPos);
      doc.text("-", pageWidth - 70, yPos, { align: "right" });
      doc.text(`R$ ${item.valor.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
      yPos += 6;
    });

    yPos += 4;

    // Separator line
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // Totals
    const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
    const totalDescontos = pagamento.desconto + descontos.reduce((sum, d) => sum + d.valor, 0);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL PROVENTOS:", 20, yPos);
    doc.text(`R$ ${totalProventos.toFixed(2)}`, pageWidth - 70, yPos, { align: "right" });
    yPos += 6;

    doc.text("TOTAL DESCONTOS:", 20, yPos);
    doc.text(`R$ ${totalDescontos.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 10;

    // Separator line
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Valor líquido
    doc.setFontSize(14);
    doc.text("VALOR LÍQUIDO:", 20, yPos);
    doc.text(`R$ ${pagamento.valor_liquido.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Observações
    if (pagamento.observacoes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Observações:", 15, yPos);
      yPos += 5;
      doc.text(pagamento.observacoes, 15, yPos, { maxWidth: pageWidth - 30 });
      yPos += 15;
    }

    // Signature line
    yPos = Math.max(yPos + 20, 230);
    doc.setLineWidth(0.2);
    doc.line(30, yPos, 90, yPos);
    doc.line(pageWidth - 90, yPos, pageWidth - 30, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text("Assinatura do Empregador", 60, yPos, { align: "center" });
    doc.text("Assinatura do Funcionário", pageWidth - 60, yPos, { align: "center" });

    // Footer
    yPos = 280;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, yPos, { align: "center" });

    // Save
    const nomeArquivo = `holerite-${employee.nome_completo.replace(/\s+/g, "-").toLowerCase()}-${pagamento.mes}-${pagamento.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  if (!pagamento) return null;

  const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
  const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
  const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
  const totalDescontos = pagamento.desconto + descontos.reduce((sum, d) => sum + d.valor, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Holerite</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="border rounded-lg p-6 bg-white dark:bg-card">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">HOLERITE</h2>
                <p className="text-muted-foreground">{getTipoFolhaLabel(pagamento.tipo_folha || "salario")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p><strong>Empresa:</strong> {empresa?.nome}</p>
                  {empresa?.cnpj && <p><strong>CNPJ:</strong> {empresa.cnpj}</p>}
                </div>
                <div className="text-right">
                  <p><strong>Período:</strong> {new Date(pagamento.ano, pagamento.mes - 1).toLocaleString("pt-BR", { month: "long" })} / {pagamento.ano}</p>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="font-semibold mb-2">Dados do Funcionário</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Nome:</strong> {employee?.nome_completo}</p>
                  <p><strong>Cargo:</strong> {employee?.cargo}</p>
                  <p><strong>CPF:</strong> {formatCPF(employee?.cpf || null)}</p>
                  <p><strong>Admissão:</strong> {formatDate(employee?.data_admissao || null)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-right p-2">Proventos</th>
                      <th className="text-right p-2">Descontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2">Salário Base</td>
                      <td className="text-right p-2">R$ {pagamento.valor_bruto.toFixed(2)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                    {proventos.map(item => (
                      <tr key={item.id}>
                        <td className="p-2">{item.variaveis_folha?.nome}</td>
                        <td className="text-right p-2">R$ {item.valor.toFixed(2)}</td>
                        <td className="text-right p-2">-</td>
                      </tr>
                    ))}
                    {descontos.map(item => (
                      <tr key={item.id}>
                        <td className="p-2">{item.variaveis_folha?.nome}</td>
                        <td className="text-right p-2">-</td>
                        <td className="text-right p-2">R$ {item.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-semibold">
                    <tr>
                      <td className="p-2">TOTAIS</td>
                      <td className="text-right p-2 text-green-600">R$ {totalProventos.toFixed(2)}</td>
                      <td className="text-right p-2 text-red-600">R$ {totalDescontos.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-primary/10">
                      <td className="p-2 font-bold" colSpan={2}>VALOR LÍQUIDO</td>
                      <td className="text-right p-2 font-bold text-lg">R$ {pagamento.valor_liquido.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {pagamento.observacoes && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm"><strong>Observações:</strong> {pagamento.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={generatePDF}>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HoleriteDialog;
