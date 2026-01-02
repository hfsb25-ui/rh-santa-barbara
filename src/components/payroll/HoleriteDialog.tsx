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

  const getSalarioBase = () => {
    if (!employee?.salario) return { valor: 0, sufixo: "/M" };
    const tipo = employee.tipo_salario;
    const sufixo = tipo === "diaria" ? "/D" : tipo === "hora" ? "/H" : "/M";
    return { valor: employee.salario, sufixo };
  };

  const generatePDF = () => {
    if (!pagamento || !empresa || !employee) {
      console.error("Dados insuficientes para gerar PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 10;
    const marginRight = 25; // Espaço para barra de assinatura
    const contentWidth = pageWidth - marginLeft - marginRight;
    
    let yPos = 12;

    // Número + Nome da empresa no topo esquerdo
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`3       ${empresa.nome}`, marginLeft, yPos);
    yPos += 4;

    // Endereço e CNPJ
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (empresa.endereco) {
      const enderecoParts = empresa.endereco.split(",");
      doc.text(`${enderecoParts[0] || ""} ${formatCNPJ(empresa.cnpj)}`, marginLeft, yPos);
      yPos += 3;
      if (enderecoParts.length > 1) {
        doc.text(enderecoParts.slice(1).join(",").trim(), marginLeft, yPos);
        yPos += 3;
      }
    }

    // Período no canto direito
    doc.text(`Período: ${getPeriodoStr()}`, pageWidth - marginRight - 5, yPos - 6, { align: "right" });
    yPos += 2;

    // Linha horizontal
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 4;

    // Dados do funcionário - Primeira linha
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Cód/Contr: Nome:", marginLeft, yPos);
    doc.text("PIS:", marginLeft + 85, yPos);
    doc.text("CBO:", marginLeft + 100, yPos);
    doc.text("C/Custo:", marginLeft + 115, yPos);
    doc.text("Dpto:", marginLeft + 130, yPos);
    doc.text("Setor:", marginLeft + 143, yPos);
    doc.text("Seção:", marginLeft + 156, yPos);
    doc.text("Admissão:", pageWidth - marginRight - 25, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.text(`- / -   ${employee.nome_completo.toUpperCase()}`, marginLeft, yPos);
    doc.text("-", marginLeft + 85, yPos);
    doc.text("-", marginLeft + 100, yPos);
    doc.text("", marginLeft + 115, yPos);
    doc.text("", marginLeft + 130, yPos);
    doc.text("", marginLeft + 143, yPos);
    doc.text("", marginLeft + 156, yPos);
    doc.text(formatDate(employee.data_admissao), pageWidth - marginRight - 25, yPos);
    yPos += 4;

    // Função
    doc.setFont("helvetica", "bold");
    doc.text("Função:", marginLeft + 85, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(employee.cargo?.toUpperCase() || "-", marginLeft + 100, yPos);
    yPos += 6;

    // Título centralizado com fundo
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "F");
    doc.setDrawColor(0);
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "S");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Recibo de Pagamento de Salário", marginLeft + contentWidth / 2, yPos + 1, { align: "center" });
    yPos += 8;

    // Tabela de itens - Header
    const colCod = marginLeft;
    const colDesc = marginLeft + 15;
    const colRef = marginLeft + 85;
    const colVenc = marginLeft + 115;
    const colDesc2 = marginLeft + 145;

    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "S");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Cod.", colCod + 2, yPos);
    doc.text("Descrição", colDesc, yPos);
    doc.text("Referência", colRef, yPos);
    doc.text("Vencimentos", colVenc, yPos);
    doc.text("Descontos", colDesc2, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    const rowHeight = 5;
    const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
    const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];

    // Salário base
    doc.rect(marginLeft, yPos - 3, contentWidth, rowHeight, "S");
    doc.text("1", colCod + 2, yPos);
    doc.text("Dias Salário Normal", colDesc, yPos);
    const salarioBase = getSalarioBase();
    doc.text(`30,00 ${salarioBase.sufixo === "/D" ? "D" : salarioBase.sufixo === "/H" ? "H" : ""}`.trim(), colRef, yPos);
    doc.text(pagamento.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
    yPos += rowHeight;

    // Proventos
    proventos.forEach((item) => {
      doc.rect(marginLeft, yPos - 3, contentWidth, rowHeight, "S");
      doc.text(item.variaveis_folha?.codigo || "-", colCod + 2, yPos);
      doc.text(item.variaveis_folha?.nome || "-", colDesc, yPos);
      doc.text("", colRef, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
      yPos += rowHeight;
    });

    // Descontos
    descontos.forEach((item) => {
      doc.rect(marginLeft, yPos - 3, contentWidth, rowHeight, "S");
      doc.text(item.variaveis_folha?.codigo || "-", colCod + 2, yPos);
      doc.text(item.variaveis_folha?.nome || "-", colDesc, yPos);
      doc.text("", colRef, yPos);
      doc.text("", colVenc, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesc2, yPos);
      yPos += rowHeight;
    });

    // Linhas vazias
    const totalLinhas = 1 + proventos.length + descontos.length;
    const linhasVazias = Math.max(0, 15 - totalLinhas);
    for (let i = 0; i < linhasVazias; i++) {
      doc.rect(marginLeft, yPos - 3, contentWidth, rowHeight, "S");
      yPos += rowHeight;
    }

    // Totais
    const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
    const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);

    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "S");
    doc.setFont("helvetica", "bold");
    doc.text("Total dos Vencimentos", colVenc - 30, yPos);
    doc.text(totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
    doc.text("Total dos Descontos", colDesc2 - 10, yPos);
    doc.text(totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesc2 + 25, yPos);
    yPos += 8;

    // Valor Líquido
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "S");
    doc.setFontSize(10);
    doc.text("Valor Líquido ->", colVenc - 30, yPos + 1);
    doc.text(pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesc2 + 25, yPos + 1);
    yPos += 12;

    // Base de cálculos
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const baseColWidth = contentWidth / 5;
    
    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, yPos - 3, contentWidth, 5, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 5, "S");
    doc.text("Salário Base", marginLeft + 2, yPos);
    doc.text("Base INSS", marginLeft + baseColWidth + 2, yPos);
    doc.text("Base Cálc. FGTS", marginLeft + baseColWidth * 2 + 2, yPos);
    doc.text("FGTS do Mês", marginLeft + baseColWidth * 3 + 2, yPos);
    doc.text("Base Cálc. IRRF", marginLeft + baseColWidth * 4 + 2, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.rect(marginLeft, yPos - 3, contentWidth, 5, "S");
    doc.text(`${salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${salarioBase.sufixo}`, marginLeft + 2, yPos);
    doc.text("0,00", marginLeft + baseColWidth + 2, yPos);
    doc.text(salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), marginLeft + baseColWidth * 2 + 2, yPos);
    const fgts = salarioBase.valor * 0.08;
    doc.text(fgts.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), marginLeft + baseColWidth * 3 + 2, yPos);
    doc.text("0,00", marginLeft + baseColWidth * 4 + 2, yPos);
    yPos += 8;

    // Rodapé
    doc.setFontSize(7);
    doc.text("Processado por: Registrado", marginLeft, yPos);

    // Linha tracejada para corte
    yPos += 5;
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);

    // Barra lateral direita (assinatura)
    const barraX = pageWidth - marginRight + 2;
    const barraY = 10;
    const barraHeight = yPos - barraY;
    
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0);
    doc.rect(barraX, barraY, 20, barraHeight, "S");
    
    // Texto vertical na barra
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    
    // Texto "Declaro ter recebido..."
    const textoDeclaracao = "Declaro ter recebido a importância líquida discriminada neste recibo:";
    doc.text(textoDeclaracao, barraX + 5, barraY + 10, { angle: 90, maxWidth: barraHeight - 40 });
    
    // Linha para assinatura
    doc.line(barraX + 10, barraY + barraHeight - 30, barraX + 10, barraY + barraHeight - 10);
    doc.text("Assinatura", barraX + 12, barraY + barraHeight - 20, { angle: 90 });
    
    // Data
    doc.text("___/___/___", barraX + 16, barraY + barraHeight - 30, { angle: 90 });
    doc.text("Data", barraX + 18, barraY + barraHeight - 20, { angle: 90 });

    // Save
    const nomeArquivo = `recibo-${employee.nome_completo.replace(/\s+/g, "-").toLowerCase()}-${pagamento.mes}-${pagamento.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  if (!pagamento) return null;

  const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
  const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
  const totalProventos = pagamento.valor_bruto + proventos.reduce((sum, p) => sum + p.valor, 0);
  const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);
  const salarioBase = getSalarioBase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibo de Pagamento</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview estilo recibo original */}
            <div className="border border-black bg-white text-black font-mono text-xs relative">
              {/* Barra lateral direita */}
              <div className="absolute right-0 top-0 bottom-0 w-24 border-l border-black flex flex-col items-center justify-between py-4 bg-white">
                <div className="writing-vertical text-[8px] leading-tight px-2 text-center" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  Declaro ter recebido a importância líquida discriminada neste recibo:
                </div>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <div className="border-b border-black w-16"></div>
                  <span className="text-[8px]">Assinatura</span>
                </div>
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="text-[8px]">___/___/___</span>
                  <span className="text-[8px]">Data</span>
                </div>
              </div>

              {/* Conteúdo principal */}
              <div className="pr-28">
                {/* Cabeçalho */}
                <div className="p-2 border-b border-black">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">3&nbsp;&nbsp;&nbsp;&nbsp;{empresa?.nome}</p>
                      <p className="text-[10px]">{empresa?.endereco} {formatCNPJ(empresa?.cnpj)}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <p>Período: {getPeriodoStr()}</p>
                    </div>
                  </div>
                </div>

                {/* Dados do funcionário */}
                <div className="border-b border-black">
                  <div className="grid grid-cols-12 text-[9px] border-b border-black">
                    <div className="col-span-4 p-1 border-r border-black">
                      <span className="font-bold">Cód/Contr: Nome:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">PIS:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">CBO:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">C/Custo:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">Dpto:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">Setor:</span>
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">
                      <span className="font-bold">Seção:</span>
                    </div>
                    <div className="col-span-2 p-1">
                      <span className="font-bold">Admissão:</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 text-[9px]">
                    <div className="col-span-4 p-1 border-r border-black">
                      - / -&nbsp;&nbsp;{employee?.nome_completo?.toUpperCase()}
                    </div>
                    <div className="col-span-1 p-1 border-r border-black">-</div>
                    <div className="col-span-1 p-1 border-r border-black">-</div>
                    <div className="col-span-1 p-1 border-r border-black"></div>
                    <div className="col-span-1 p-1 border-r border-black"></div>
                    <div className="col-span-1 p-1 border-r border-black"></div>
                    <div className="col-span-1 p-1 border-r border-black"></div>
                    <div className="col-span-2 p-1">{formatDate(employee?.data_admissao || null)}</div>
                  </div>
                  <div className="grid grid-cols-12 text-[9px] border-t border-black">
                    <div className="col-span-4 p-1 border-r border-black"></div>
                    <div className="col-span-2 p-1 border-r border-black">
                      <span className="font-bold">Função:</span> {employee?.cargo?.toUpperCase()}
                    </div>
                    <div className="col-span-6 p-1"></div>
                  </div>
                </div>

                {/* Título do recibo */}
                <div className="bg-gray-200 border-b border-black p-1 text-center">
                  <span className="font-bold text-sm">Recibo de Pagamento de Salário</span>
                </div>

                {/* Header da tabela */}
                <div className="grid grid-cols-12 text-[9px] border-b border-black bg-gray-100 font-bold">
                  <div className="col-span-1 p-1 border-r border-black">Cod.</div>
                  <div className="col-span-4 p-1 border-r border-black">Descrição</div>
                  <div className="col-span-2 p-1 border-r border-black text-center">Referência</div>
                  <div className="col-span-2 p-1 border-r border-black text-right">Vencimentos</div>
                  <div className="col-span-3 p-1 text-right">Descontos</div>
                </div>

                {/* Salário base */}
                <div className="grid grid-cols-12 text-[9px] border-b border-black">
                  <div className="col-span-1 p-1 border-r border-black">1</div>
                  <div className="col-span-4 p-1 border-r border-black">Dias Salário Normal</div>
                  <div className="col-span-2 p-1 border-r border-black text-center">30,00 {salarioBase.sufixo === "/D" ? "D" : ""}</div>
                  <div className="col-span-2 p-1 border-r border-black text-right">{pagamento.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-3 p-1 text-right"></div>
                </div>

                {/* Proventos */}
                {proventos.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 text-[9px] border-b border-black">
                    <div className="col-span-1 p-1 border-r border-black">{item.variaveis_folha?.codigo || "-"}</div>
                    <div className="col-span-4 p-1 border-r border-black">{item.variaveis_folha?.nome}</div>
                    <div className="col-span-2 p-1 border-r border-black text-center"></div>
                    <div className="col-span-2 p-1 border-r border-black text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="col-span-3 p-1 text-right"></div>
                  </div>
                ))}

                {/* Descontos */}
                {descontos.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 text-[9px] border-b border-black">
                    <div className="col-span-1 p-1 border-r border-black">{item.variaveis_folha?.codigo || "-"}</div>
                    <div className="col-span-4 p-1 border-r border-black">{item.variaveis_folha?.nome}</div>
                    <div className="col-span-2 p-1 border-r border-black text-center"></div>
                    <div className="col-span-2 p-1 border-r border-black text-right"></div>
                    <div className="col-span-3 p-1 text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                ))}

                {/* Linhas vazias */}
                {Array.from({ length: Math.max(0, 10 - proventos.length - descontos.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="grid grid-cols-12 text-[9px] border-b border-black">
                    <div className="col-span-1 p-1 border-r border-black">&nbsp;</div>
                    <div className="col-span-4 p-1 border-r border-black"></div>
                    <div className="col-span-2 p-1 border-r border-black"></div>
                    <div className="col-span-2 p-1 border-r border-black"></div>
                    <div className="col-span-3 p-1"></div>
                  </div>
                ))}

                {/* Totais */}
                <div className="grid grid-cols-2 text-[9px] border-b border-black bg-gray-100">
                  <div className="p-1 border-r border-black flex justify-between">
                    <span className="font-bold">Total dos Vencimentos</span>
                    <span className="font-bold">{totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="p-1 flex justify-between">
                    <span className="font-bold">Total dos Descontos</span>
                    <span className="font-bold">{totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Valor Líquido */}
                <div className="grid grid-cols-2 text-[9px] border-b border-black bg-gray-200">
                  <div className="p-1 border-r border-black"></div>
                  <div className="p-1 flex justify-between">
                    <span className="font-bold">Valor Líquido -&gt;</span>
                    <span className="font-bold text-sm">{pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Base de cálculos */}
                <div className="grid grid-cols-5 text-[8px] border-b border-black bg-gray-100 font-bold">
                  <div className="p-1 border-r border-black">Salário Base</div>
                  <div className="p-1 border-r border-black">Base INSS</div>
                  <div className="p-1 border-r border-black">Base Cálc. FGTS</div>
                  <div className="p-1 border-r border-black">FGTS do Mês</div>
                  <div className="p-1">Base Cálc. IRRF</div>
                </div>
                <div className="grid grid-cols-5 text-[8px] border-b border-black">
                  <div className="p-1 border-r border-black">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} {salarioBase.sufixo}</div>
                  <div className="p-1 border-r border-black">0,00</div>
                  <div className="p-1 border-r border-black">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <div className="p-1 border-r border-black">{(salarioBase.valor * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <div className="p-1">0,00</div>
                </div>

                {/* Rodapé */}
                <div className="p-1 text-[8px] border-b border-dashed border-black">
                  Processado por: Registrado
                </div>
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
