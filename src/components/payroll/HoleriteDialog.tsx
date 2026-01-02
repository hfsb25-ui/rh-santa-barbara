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
  empresa_id: string;
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
  salario: number | null;
  tipo_salario: string | null;
}

interface Empresa {
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
  endereco: string | null;
}

interface HoleriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: Pagamento | null;
  empresaId: string;
}

const TIPO_FOLHA_LABELS: Record<string, string> = {
  salario: "Recibo de Pagamento",
  complementar: "Recibo de Pagamento Complementar",
  adiantamento: "Recibo de Adiantamento",
  decimo_terceiro: "Recibo de 13º Salário",
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

    const empresaIdToFetch = empresaId && empresaId !== "all" ? empresaId : pagamento.empresa_id;

    setLoading(true);
    try {
      if (empresaIdToFetch) {
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("nome, cnpj, logo_url, endereco")
          .eq("id", empresaIdToFetch)
          .single();

        if (empresaError) throw empresaError;
        setEmpresa(empresaData);
      } else {
        setEmpresa(null);
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("nome_completo, cargo, cpf, data_admissao, setor, salario, tipo_salario")
        .eq("id", pagamento.employee_id)
        .single();

      if (employeeError) throw employeeError;
      setEmployee(employeeData);
    } catch (error) {
      console.error("Erro ao carregar dados do holerite:", error);
      setEmpresa(null);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const getTipoFolhaLabel = (tipo: string) => {
    return TIPO_FOLHA_LABELS[tipo] || "Recibo de Pagamento";
  };

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return "";
    const cleaned = cnpj.replace(/\D/g, "");
    if (cleaned.length === 14) {
      return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
    }
    return cnpj;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getPeriodoStr = () => {
    if (!pagamento) return "";
    const ano = pagamento.ano;
    const mes = pagamento.mes;
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    return `${primeiroDia.toLocaleDateString("pt-BR")} Até ${ultimoDia.toLocaleDateString("pt-BR")}`;
  };

  const getSalarioBaseFormatado = () => {
    if (!employee?.salario) return "-";
    const salario = employee.salario;
    const tipo = employee.tipo_salario;
    const sufixo = tipo === "diaria" ? "/D" : tipo === "hora" ? "/H" : "";
    return `${salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${sufixo}`;
  };

  const generatePDF = () => {
    if (!pagamento || !empresa || !employee) {
      console.error("Dados insuficientes para gerar PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let yPos = 15;

    // Header - Nome da empresa
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(empresa.nome, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    // Endereço e CNPJ
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (empresa.endereco) {
      doc.text(empresa.endereco, pageWidth / 2, yPos, { align: "center" });
      yPos += 4;
    }
    if (empresa.cnpj) {
      doc.text(formatCNPJ(empresa.cnpj), pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }

    // Período
    doc.setFontSize(9);
    doc.text(`Período: ${getPeriodoStr()}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // Linha separadora
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 6;

    // Título do recibo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(getTipoFolhaLabel(pagamento.tipo_folha || "salario"), pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // Tabela de dados do funcionário
    const tableStartX = 10;
    const tableWidth = pageWidth - 20;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Linha 1 - Headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "F");
    doc.setDrawColor(0);
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "S");
    
    const col1 = tableStartX + 2;
    const col2 = tableStartX + 30;
    const col3 = tableStartX + 120;
    const col4 = tableStartX + 155;
    
    doc.setFont("helvetica", "bold");
    doc.text("Código:", col1, yPos);
    doc.text("Nome:", col2, yPos);
    doc.text("Setor:", col3, yPos);
    doc.text("Admissão:", col4, yPos);
    yPos += 5;

    // Linha 2 - Values
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "S");
    doc.setFont("helvetica", "normal");
    doc.text("-", col1, yPos);
    doc.text(employee.nome_completo.toUpperCase(), col2, yPos);
    doc.text(employee.setor || "-", col3, yPos);
    doc.text(formatDate(employee.data_admissao), col4, yPos);
    yPos += 8;

    // Tabela de itens
    const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
    const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];

    // Header da tabela de itens
    doc.setFillColor(240, 240, 240);
    doc.rect(tableStartX, yPos - 3, tableWidth, 6, "F");
    doc.rect(tableStartX, yPos - 3, tableWidth, 6, "S");
    
    doc.setFont("helvetica", "bold");
    doc.text("Cód.", tableStartX + 3, yPos);
    doc.text("Descrição", tableStartX + 20, yPos);
    doc.text("Referência", tableStartX + 90, yPos);
    doc.text("Vencimentos", tableStartX + 125, yPos);
    doc.text("Descontos", tableStartX + 160, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    const rowHeight = 5;
    
    // Salário base
    doc.rect(tableStartX, yPos - 3, tableWidth, rowHeight, "S");
    doc.text("001", tableStartX + 3, yPos);
    doc.text("Salário Base", tableStartX + 20, yPos);
    doc.text("-", tableStartX + 90, yPos);
    doc.text(pagamento.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), tableStartX + 125, yPos);
    doc.text("", tableStartX + 160, yPos);
    yPos += rowHeight;

    // Proventos
    proventos.forEach((item, index) => {
      doc.rect(tableStartX, yPos - 3, tableWidth, rowHeight, "S");
      doc.text(item.variaveis_folha?.codigo || String(index + 2).padStart(3, "0"), tableStartX + 3, yPos);
      doc.text(item.variaveis_folha?.nome || "-", tableStartX + 20, yPos);
      doc.text("-", tableStartX + 90, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), tableStartX + 125, yPos);
      doc.text("", tableStartX + 160, yPos);
      yPos += rowHeight;
    });

    // Descontos
    descontos.forEach((item, index) => {
      doc.rect(tableStartX, yPos - 3, tableWidth, rowHeight, "S");
      doc.text(item.variaveis_folha?.codigo || String(proventos.length + index + 2).padStart(3, "0"), tableStartX + 3, yPos);
      doc.text(item.variaveis_folha?.nome || "-", tableStartX + 20, yPos);
      doc.text("-", tableStartX + 90, yPos);
      doc.text("", tableStartX + 125, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), tableStartX + 160, yPos);
      yPos += rowHeight;
    });

    // Linhas vazias para preencher
    for (let i = 0; i < Math.max(0, 3 - proventos.length - descontos.length); i++) {
      doc.rect(tableStartX, yPos - 3, tableWidth, rowHeight, "S");
      yPos += rowHeight;
    }

    yPos += 3;

    // Totais
    const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
    // Total de descontos: somar apenas os itens de desconto do holerite
    const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);

    doc.setFillColor(240, 240, 240);
    doc.rect(tableStartX, yPos - 3, tableWidth, 6, "F");
    doc.rect(tableStartX, yPos - 3, tableWidth, 6, "S");
    doc.setFont("helvetica", "bold");
    doc.text("Total dos Vencimentos", tableStartX + 3, yPos);
    doc.text(totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), tableStartX + 90, yPos);
    doc.text("Total dos Descontos", tableStartX + 120, yPos);
    doc.text(totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), tableStartX + 170, yPos);
    yPos += 8;

    // Valor Líquido
    doc.setFillColor(220, 220, 220);
    doc.rect(tableStartX, yPos - 3, tableWidth, 8, "F");
    doc.rect(tableStartX, yPos - 3, tableWidth, 8, "S");
    doc.setFontSize(11);
    doc.text("Valor Líquido ->", tableStartX + 3, yPos + 1);
    doc.text(`R$ ${pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, tableStartX + 90, yPos + 1);
    yPos += 12;

    // Base de cálculos
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "F");
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "S");
    doc.text("Salário Base", tableStartX + 3, yPos);
    doc.text("Base INSS", tableStartX + 40, yPos);
    doc.text("Base Cálc. FGTS", tableStartX + 75, yPos);
    doc.text("FGTS do Mês", tableStartX + 115, yPos);
    doc.text("Base Cálc. IRRF", tableStartX + 155, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.rect(tableStartX, yPos - 3, tableWidth, 5, "S");
    doc.text(getSalarioBaseFormatado(), tableStartX + 3, yPos);
    doc.text("0,00", tableStartX + 40, yPos);
    doc.text("0,00", tableStartX + 75, yPos);
    doc.text("0,00", tableStartX + 115, yPos);
    doc.text("0,00", tableStartX + 155, yPos);
    yPos += 10;

    // Assinaturas
    yPos = Math.max(yPos + 15, 220);
    doc.setLineWidth(0.3);
    doc.line(25, yPos, 95, yPos);
    doc.line(pageWidth - 95, yPos, pageWidth - 25, yPos);
    yPos += 4;
    doc.setFontSize(8);
    doc.text("Assinatura do Empregador", 60, yPos, { align: "center" });
    doc.text("Assinatura do Funcionário", pageWidth - 60, yPos, { align: "center" });

    // Rodapé
    yPos = 280;
    doc.setFontSize(7);
    doc.setTextColor(128);
    doc.text("Processado por: Sistema RH", tableStartX, yPos);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 10, yPos, { align: "right" });

    // Save
    const nomeArquivo = `recibo-${employee.nome_completo.replace(/\s+/g, "-").toLowerCase()}-${pagamento.mes}-${pagamento.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  if (!pagamento) return null;

  const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
  const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
  const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
  // Total de descontos: somar apenas os itens de desconto do holerite
  const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibo de Pagamento</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview estilo recibo */}
            <div className="border rounded-lg bg-white dark:bg-card text-foreground font-mono text-sm">
              {/* Cabeçalho da empresa */}
              <div className="text-center border-b p-4">
                <h2 className="text-lg font-bold">{empresa?.nome}</h2>
                {empresa?.endereco && (
                  <p className="text-xs text-muted-foreground">{empresa.endereco}</p>
                )}
                {empresa?.cnpj && (
                  <p className="text-xs text-muted-foreground">{formatCNPJ(empresa.cnpj)}</p>
                )}
                <p className="text-xs mt-2">Período: {getPeriodoStr()}</p>
              </div>

              {/* Título */}
              <div className="text-center py-2 border-b bg-muted/30">
                <h3 className="font-bold">{getTipoFolhaLabel(pagamento.tipo_folha || "salario")}</h3>
              </div>

              {/* Dados do funcionário */}
              <div className="border-b">
                <div className="grid grid-cols-4 text-xs bg-muted/50 border-b">
                  <div className="p-2 border-r font-semibold">Código:</div>
                  <div className="p-2 border-r font-semibold">Nome:</div>
                  <div className="p-2 border-r font-semibold">Setor:</div>
                  <div className="p-2 font-semibold">Admissão:</div>
                </div>
                <div className="grid grid-cols-4 text-xs">
                  <div className="p-2 border-r">-</div>
                  <div className="p-2 border-r font-medium">{employee?.nome_completo?.toUpperCase()}</div>
                  <div className="p-2 border-r">{employee?.setor || "-"}</div>
                  <div className="p-2">{formatDate(employee?.data_admissao || null)}</div>
                </div>
              </div>

              {/* Tabela de itens */}
              <div className="border-b">
                <div className="grid grid-cols-5 text-xs bg-muted/50 border-b font-semibold">
                  <div className="p-2 border-r">Cód.</div>
                  <div className="p-2 border-r col-span-2">Descrição</div>
                  <div className="p-2 border-r text-right">Vencimentos</div>
                  <div className="p-2 text-right">Descontos</div>
                </div>
                
                {/* Salário Base */}
                <div className="grid grid-cols-5 text-xs border-b">
                  <div className="p-2 border-r">001</div>
                  <div className="p-2 border-r col-span-2">Salário Base</div>
                  <div className="p-2 border-r text-right">{pagamento.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <div className="p-2 text-right"></div>
                </div>

                {/* Proventos */}
                {proventos.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-5 text-xs border-b">
                    <div className="p-2 border-r">{item.variaveis_folha?.codigo || String(index + 2).padStart(3, "0")}</div>
                    <div className="p-2 border-r col-span-2">{item.variaveis_folha?.nome}</div>
                    <div className="p-2 border-r text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="p-2 text-right"></div>
                  </div>
                ))}

                {/* Descontos */}
                {descontos.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-5 text-xs border-b">
                    <div className="p-2 border-r">{item.variaveis_folha?.codigo || String(proventos.length + index + 2).padStart(3, "0")}</div>
                    <div className="p-2 border-r col-span-2">{item.variaveis_folha?.nome}</div>
                    <div className="p-2 border-r text-right"></div>
                    <div className="p-2 text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="grid grid-cols-2 text-xs border-b bg-muted/30">
                <div className="p-2 border-r flex justify-between">
                  <span className="font-semibold">Total dos Vencimentos</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">{totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span className="font-semibold">Total dos Descontos</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">{totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Valor Líquido */}
              <div className="p-3 bg-primary/10 border-b flex justify-between items-center">
                <span className="font-bold text-base">Valor Líquido →</span>
                <span className="font-bold text-lg">R$ {pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Base de cálculos */}
              <div className="text-xs">
                <div className="grid grid-cols-5 bg-muted/50 border-b font-semibold">
                  <div className="p-2 border-r">Salário Base</div>
                  <div className="p-2 border-r">Base INSS</div>
                  <div className="p-2 border-r">Base Cálc. FGTS</div>
                  <div className="p-2 border-r">FGTS do Mês</div>
                  <div className="p-2">Base Cálc. IRRF</div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="p-2 border-r">{getSalarioBaseFormatado()}</div>
                  <div className="p-2 border-r">0,00</div>
                  <div className="p-2 border-r">0,00</div>
                  <div className="p-2 border-r">0,00</div>
                  <div className="p-2">0,00</div>
                </div>
              </div>

              {/* Rodapé */}
              <div className="p-2 text-xs text-muted-foreground border-t flex justify-between">
                <span>Processado por: Sistema RH</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={generatePDF} disabled={loading || !empresa || !employee}>
                <Download className="w-4 h-4 mr-2" />
                {loading ? "Carregando..." : "Baixar PDF"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HoleriteDialog;
