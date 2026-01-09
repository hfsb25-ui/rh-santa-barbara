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

const MESES = [
  "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

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

  const getMesAnoStr = () => {
    if (!pagamento) return "";
    return `${MESES[pagamento.mes]}/${pagamento.ano}`;
  };

  const getSalarioBase = () => {
    if (!employee?.salario) return { valor: 0, sufixo: "/M" };
    const tipo = employee.tipo_salario;
    const sufixo = tipo === "diaria" ? "/D" : tipo === "hora" ? "/H" : "/M";
    return { valor: employee.salario, sufixo };
  };

  const generatePDF = async () => {
    if (!pagamento || !empresa || !employee) {
      console.error("Dados insuficientes para gerar PDF");
      return;
    }

    const doc = new jsPDF({ format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 10;
    const signatureBarWidth = 25;
    const marginRight = signatureBarWidth + 5;
    const contentWidth = pageWidth - marginLeft - marginRight;
    
    let yPos = 15;

    // Título principal
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recibo de Pagamento de Salário", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    // CNPJ e período
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}`, marginLeft, yPos);
    doc.text(getMesAnoStr(), pageWidth - marginRight, yPos, { align: "right" });
    yPos += 8;

    // Linha horizontal
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 6;

    // Dados do funcionário - Linha 1
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Código:", marginLeft, yPos);
    doc.text("Nome do Funcionário:", marginLeft + 25, yPos);
    doc.text("CBO:", marginLeft + 100, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.text("-", marginLeft + 12, yPos);
    doc.text(employee.nome_completo.toUpperCase(), marginLeft + 55, yPos);
    doc.text(employee.cargo || "-", marginLeft + 110, yPos);
    yPos += 6;

    // Dados do funcionário - Linha 2
    doc.setFont("helvetica", "bold");
    doc.text("Admissão:", marginLeft, yPos);
    doc.text("Emp.:", marginLeft + 35, yPos);
    doc.text("Local:", marginLeft + 55, yPos);
    doc.text("Depto.:", marginLeft + 75, yPos);
    doc.text("Setor:", marginLeft + 95, yPos);
    doc.text("Seção:", marginLeft + 115, yPos);
    doc.text("Fl.:", marginLeft + 135, yPos);
    doc.text("Dependentes:", marginLeft + 150, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.text(formatDate(employee.data_admissao), marginLeft + 15, yPos);
    doc.text("-", marginLeft + 42, yPos);
    doc.text("-", marginLeft + 62, yPos);
    doc.text("-", marginLeft + 85, yPos);
    doc.text(employee.setor || "-", marginLeft + 102, yPos);
    doc.text("-", marginLeft + 122, yPos);
    doc.text("-", marginLeft + 140, yPos);
    doc.text("0", marginLeft + 168, yPos);
    yPos += 8;

    // Tabela de itens - Header
    const colCod = marginLeft;
    const colDesc = marginLeft + 15;
    const colRef = marginLeft + 75;
    const colVenc = marginLeft + 105;
    const colDesconto = marginLeft + 140;

    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "F");
    doc.setDrawColor(0);
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "S");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Cód.", colCod + 2, yPos);
    doc.text("Descrição", colDesc, yPos);
    doc.text("Referência", colRef, yPos);
    doc.text("Vencimentos", colVenc, yPos);
    doc.text("Descontos", colDesconto, yPos);
    yPos += 6;

    // Área de itens
    const itemsStartY = yPos - 3;
    const rowHeight = 5;
    
    doc.setFont("helvetica", "normal");
    const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
    const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
    const salarioBase = getSalarioBase();

    // Salário base
    doc.text("101", colCod + 2, yPos);
    doc.text("Salário Base", colDesc, yPos);
    doc.text("", colRef, yPos);
    doc.text(salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
    yPos += rowHeight;

    // Proventos
    proventos.forEach((item) => {
      doc.text(item.variaveis_folha?.codigo || "-", colCod + 2, yPos);
      doc.text(item.variaveis_folha?.nome || "-", colDesc, yPos);
      doc.text("", colRef, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
      yPos += rowHeight;
    });

    // Descontos
    descontos.forEach((item) => {
      doc.text(item.variaveis_folha?.codigo || "-", colCod + 2, yPos);
      doc.text(item.variaveis_folha?.nome || "-", colDesc, yPos);
      doc.text("", colRef, yPos);
      doc.text("", colVenc, yPos);
      doc.text(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesconto, yPos);
      yPos += rowHeight;
    });

    // Linhas vazias para preencher
    const totalLinhas = 1 + proventos.length + descontos.length;
    const linhasVazias = Math.max(0, 10 - totalLinhas);
    for (let i = 0; i < linhasVazias; i++) {
      yPos += rowHeight;
    }

    // Borda da área de itens
    const itemsEndY = yPos - 3;
    doc.rect(marginLeft, itemsStartY, contentWidth, itemsEndY - itemsStartY, "S");

    // Totais
    const totalProventos = salarioBase.valor + proventos.reduce((sum, p) => sum + p.valor, 0);
    const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);

    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 6, "S");
    doc.setFont("helvetica", "bold");
    doc.text("Total de Vencimentos", colVenc - 28, yPos);
    doc.text(totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colVenc, yPos);
    doc.text("Total de Descontos", colDesconto - 5, yPos);
    doc.text(totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesconto + 28, yPos);
    yPos += 8;

    // Valor Líquido
    doc.setFillColor(220, 220, 220);
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 7, "S");
    doc.setFontSize(10);
    doc.text("Valor Líquido:", colVenc - 20, yPos + 1);
    doc.text(pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), colDesconto + 28, yPos + 1);
    yPos += 12;

    // Base de cálculos
    const baseColWidth = contentWidth / 7;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, yPos - 3, contentWidth, 10, "F");
    doc.rect(marginLeft, yPos - 3, contentWidth, 10, "S");

    const baseLabels = ["Salário Base", "Sal. Contr.", "INSS", "Base Cálc. FGTS", "FGTS do Mês", "Base Cálc. IRRF", "Faixa IRRF"];
    baseLabels.forEach((label, i) => {
      doc.text(label, marginLeft + i * baseColWidth + 2, yPos);
    });
    yPos += 4;

    doc.setFont("helvetica", "normal");
    const fgts = salarioBase.valor * 0.08;
    const baseValues = [
      `${salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      "0,00",
      salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      fgts.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      "0,00",
      "-"
    ];
    baseValues.forEach((val, i) => {
      doc.text(val, marginLeft + i * baseColWidth + 2, yPos);
    });
    yPos += 10;

    // Linha tracejada de corte
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    doc.setFontSize(6);
    doc.text("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - corte aqui - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -", pageWidth / 2, yPos + 3, { align: "center" });
    doc.setLineDashPattern([], 0);

    // Barra lateral de assinatura
    const barraX = pageWidth - signatureBarWidth;
    const barraY = 12;
    const barraHeight = yPos - barraY - 5;
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(barraX, barraY, signatureBarWidth - 5, barraHeight, "S");

    // Texto vertical
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    
    // Texto da declaração (vertical)
    const textoDeclaracao = "DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO";
    doc.text(textoDeclaracao, barraX + 6, barraY + 10, { angle: 90, maxWidth: barraHeight - 40 });

    // Assinatura do funcionário
    doc.setFontSize(5);
    doc.text("ASSINATURA DO FUNCIONÁRIO", barraX + 12, barraY + 10, { angle: 90 });
    doc.line(barraX + 14, barraY + barraHeight - 40, barraX + 14, barraY + barraHeight - 15);

    // Data
    doc.text("_____/_____/_____", barraX + 18, barraY + barraHeight - 35, { angle: 90 });
    doc.text("DATA", barraX + 18, barraY + barraHeight - 15, { angle: 90 });

    // Save
    const nomeArquivo = `holerite-${employee.nome_completo.replace(/\s+/g, "-").toLowerCase()}-${MESES[pagamento.mes]}-${pagamento.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  if (!pagamento) return null;

  const proventos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
  const descontos = pagamento.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
  const salarioBase = getSalarioBase();
  const totalProventos = salarioBase.valor + proventos.reduce((sum, p) => sum + p.valor, 0);
  const totalDescontos = descontos.reduce((sum, d) => sum + d.valor, 0);

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
            {/* Preview do holerite */}
            <div className="border border-border bg-white text-black font-mono text-xs relative p-4">
              <div className="flex">
                {/* Conteúdo principal */}
                <div className="flex-1 pr-20">
                  {/* Título */}
                  <div className="text-center border-b-2 border-black pb-2 mb-3">
                    <h2 className="text-lg font-bold">Recibo de Pagamento de Salário</h2>
                  </div>

                  {/* CNPJ e Período */}
                  <div className="flex justify-between mb-3 border-b border-black pb-2">
                    <span className="text-[10px]">CNPJ: {formatCNPJ(empresa?.cnpj)}</span>
                    <span className="text-[10px] font-semibold">{getMesAnoStr()}</span>
                  </div>

                  {/* Dados do funcionário - Primeira linha */}
                  <div className="grid grid-cols-12 gap-1 text-[9px] border-b border-gray-300 pb-1 mb-1">
                    <div className="col-span-2">
                      <span className="font-bold">Código:</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-6">
                      <span className="font-bold">Nome do Funcionário:</span>
                      <br />
                      <span>{employee?.nome_completo?.toUpperCase()}</span>
                    </div>
                    <div className="col-span-4">
                      <span className="font-bold">CBO:</span>
                      <br />
                      <span>{employee?.cargo || "-"}</span>
                    </div>
                  </div>

                  {/* Dados do funcionário - Segunda linha */}
                  <div className="grid grid-cols-12 gap-1 text-[8px] border-b border-gray-300 pb-1 mb-2">
                    <div className="col-span-2">
                      <span className="font-bold">Admissão</span>
                      <br />
                      <span>{formatDate(employee?.data_admissao || null)}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-bold">Emp.</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-bold">Local</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-bold">Depto.</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-bold">Setor</span>
                      <br />
                      <span>{employee?.setor || "-"}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-bold">Seção</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-bold">Fl.</span>
                      <br />
                      <span>-</span>
                    </div>
                    <div className="col-span-3">
                      <span className="font-bold">Dependentes</span>
                      <br />
                      <span>0</span>
                    </div>
                  </div>

                  {/* Tabela de itens - Header */}
                  <div className="grid grid-cols-12 text-[9px] bg-gray-200 font-bold border border-black">
                    <div className="col-span-1 p-1 border-r border-gray-400">Cód.</div>
                    <div className="col-span-4 p-1 border-r border-gray-400">Descrição</div>
                    <div className="col-span-2 p-1 text-center border-r border-gray-400">Referência</div>
                    <div className="col-span-2 p-1 text-right border-r border-gray-400">Vencimentos</div>
                    <div className="col-span-3 p-1 text-right">Descontos</div>
                  </div>

                  {/* Tabela de itens - Conteúdo */}
                  <div className="border-l border-r border-b border-black">
                    {/* Salário base */}
                    <div className="grid grid-cols-12 text-[9px] border-b border-gray-200">
                      <div className="col-span-1 p-1">101</div>
                      <div className="col-span-4 p-1">Salário Base</div>
                      <div className="col-span-2 p-1 text-center"></div>
                      <div className="col-span-2 p-1 text-right">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="col-span-3 p-1 text-right"></div>
                    </div>

                    {/* Proventos */}
                    {proventos.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 text-[9px] border-b border-gray-200">
                        <div className="col-span-1 p-1">{item.variaveis_folha?.codigo || "-"}</div>
                        <div className="col-span-4 p-1">{item.variaveis_folha?.nome}</div>
                        <div className="col-span-2 p-1 text-center"></div>
                        <div className="col-span-2 p-1 text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        <div className="col-span-3 p-1 text-right"></div>
                      </div>
                    ))}

                    {/* Descontos */}
                    {descontos.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 text-[9px] border-b border-gray-200">
                        <div className="col-span-1 p-1">{item.variaveis_folha?.codigo || "-"}</div>
                        <div className="col-span-4 p-1">{item.variaveis_folha?.nome}</div>
                        <div className="col-span-2 p-1 text-center"></div>
                        <div className="col-span-2 p-1 text-right"></div>
                        <div className="col-span-3 p-1 text-right">{item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}

                    {/* Linhas vazias */}
                    {Array.from({ length: Math.max(0, 8 - proventos.length - descontos.length - 1) }).map((_, i) => (
                      <div key={`empty-${i}`} className="grid grid-cols-12 text-[9px] border-b border-gray-200 h-5">
                        <div className="col-span-1 p-1"></div>
                        <div className="col-span-4 p-1"></div>
                        <div className="col-span-2 p-1"></div>
                        <div className="col-span-2 p-1"></div>
                        <div className="col-span-3 p-1"></div>
                      </div>
                    ))}
                  </div>

                  {/* Totais */}
                  <div className="grid grid-cols-2 text-[9px] border border-black bg-gray-100">
                    <div className="p-1 flex justify-between border-r border-gray-400">
                      <span className="font-bold">Total de Vencimentos</span>
                      <span className="font-bold">{totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-1 flex justify-between">
                      <span className="font-bold">Total de Descontos</span>
                      <span className="font-bold">{totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Valor Líquido */}
                  <div className="flex justify-between text-[10px] border border-black bg-gray-200 p-1">
                    <span className="font-bold">Valor Líquido:</span>
                    <span className="font-bold text-sm">{pagamento.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Base de cálculos */}
                  <div className="mt-3 border border-black">
                    <div className="grid grid-cols-7 text-[7px] bg-gray-100 font-bold">
                      <div className="p-1 border-r border-gray-300">Salário Base</div>
                      <div className="p-1 border-r border-gray-300">Sal. Contr.</div>
                      <div className="p-1 border-r border-gray-300">INSS</div>
                      <div className="p-1 border-r border-gray-300">Base Cálc. FGTS</div>
                      <div className="p-1 border-r border-gray-300">FGTS do Mês</div>
                      <div className="p-1 border-r border-gray-300">Base Cálc. IRRF</div>
                      <div className="p-1">Faixa IRRF</div>
                    </div>
                    <div className="grid grid-cols-7 text-[7px] border-t border-gray-300">
                      <div className="p-1 border-r border-gray-300">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="p-1 border-r border-gray-300">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="p-1 border-r border-gray-300">0,00</div>
                      <div className="p-1 border-r border-gray-300">{salarioBase.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="p-1 border-r border-gray-300">{(salarioBase.valor * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="p-1 border-r border-gray-300">0,00</div>
                      <div className="p-1">-</div>
                    </div>
                  </div>

                  {/* Linha de corte */}
                  <div className="mt-4 border-t-2 border-dashed border-gray-400 pt-1 text-center text-[8px] text-gray-500">
                    - - - - - - - - - - - - - - - - - - corte aqui - - - - - - - - - - - - - - - - - -
                  </div>
                </div>

                {/* Barra lateral de assinatura */}
                <div className="absolute right-4 top-4 bottom-16 w-16 border-l border-t border-r border-b border-black flex flex-col items-center justify-between py-4 bg-white">
                  <div 
                    className="text-[7px] leading-tight px-1 text-center font-bold" 
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO
                  </div>
                  <div 
                    className="text-[6px] leading-tight px-1 text-center" 
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    ASSINATURA DO FUNCIONÁRIO
                  </div>
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="border-b border-black w-12 transform -rotate-90"></div>
                  </div>
                  <div 
                    className="text-[7px] leading-tight px-1 text-center" 
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    _____/_____/_____
                    <br />
                    DATA
                  </div>
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
