import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "";
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

  const getTableData = () => {
    const proventos = pagamento?.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "provento") || [];
    const descontosItens = pagamento?.folha_pagamento_itens?.filter(i => i.variaveis_folha?.tipo === "desconto") || [];
    const salarioBase = getSalarioBase();

    const rows: { cod: string; desc: string; ref: string; prov: string; desc2: string }[] = [];

    // Salário base
    rows.push({
      cod: "101",
      desc: "Salário Base",
      ref: "",
      prov: formatCurrency(salarioBase.valor),
      desc2: "",
    });

    // Proventos
    proventos.forEach((item) => {
      rows.push({
        cod: item.variaveis_folha?.codigo || "-",
        desc: item.variaveis_folha?.nome || "-",
        ref: "",
        prov: formatCurrency(item.valor),
        desc2: "",
      });
    });

    // Descontos
    descontosItens.forEach((item) => {
      rows.push({
        cod: item.variaveis_folha?.codigo || "-",
        desc: item.variaveis_folha?.nome || "-",
        ref: "",
        prov: "",
        desc2: formatCurrency(item.valor),
      });
    });

    // Preencher até 8 linhas (compacto para caber na página)
    while (rows.length < 8) {
      rows.push({ cod: "", desc: "", ref: "", prov: "", desc2: "" });
    }

    const totalProventos = salarioBase.valor + proventos.reduce((sum, p) => sum + p.valor, 0);
    const totalDescontos = descontosItens.reduce((sum, d) => sum + d.valor, 0);

    return { rows, totalProventos, totalDescontos };
  };

  const generatePDF = async () => {
    if (!pagamento || !empresa || !employee) return;

    const doc = new jsPDF({ format: "a4", orientation: "portrait" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ml = 10;
    const mr = 10;
    const cw = pw - ml - mr;
    let y = 12;

    const salarioBase = getSalarioBase();
    const { rows, totalProventos, totalDescontos } = getTableData();
    const fgts = salarioBase.valor * 0.08;

    // ===== BORDA EXTERNA DO RECIBO =====
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);

    // ===== CABEÇALHO EMPRESA =====
    doc.setFillColor(33, 37, 41);
    doc.rect(ml, y, cw, 14, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(empresa.nome.toUpperCase(), ml + cw / 2, y + 5.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}${empresa.endereco ? '  |  ' + empresa.endereco : ''}`, ml + cw / 2, y + 10.5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 15;

    // ===== TÍTULO DO RECIBO =====
    doc.setFillColor(240, 240, 240);
    doc.rect(ml, y, cw, 7, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(ml, y, cw, 7);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 37, 41);
    doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", ml + cw / 2, y + 5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(getMesAnoStr(), ml + cw - 4, y + 5, { align: "right" });
    y += 8;

    // ===== DADOS DO FUNCIONÁRIO =====
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(ml, y, cw, 16);
    doc.line(ml, y + 8, ml + cw, y + 8);

    // Primeira linha: Nome e CPF
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text("NOME DO FUNCIONÁRIO", ml + 3, y + 3);
    doc.text("CPF", ml + cw - 40, y + 3);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(employee.nome_completo.toUpperCase(), ml + 3, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(formatCPF(employee.cpf), ml + cw - 40, y + 6.5);
    doc.line(ml + cw - 45, y, ml + cw - 45, y + 8);

    // Segunda linha: Cargo, Admissão, Setor, Período
    const colW = cw / 4;
    const labels2 = ["CARGO", "ADMISSÃO", "SETOR", "PERÍODO"];
    const values2 = [employee.cargo || "-", formatDate(employee.data_admissao), employee.setor || "-", getMesAnoStr()];

    labels2.forEach((label, i) => {
      const x = ml + i * colW + 3;
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text(label, x, y + 11);
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(values2[i], x, y + 14.5);
      doc.setFont("helvetica", "normal");
      if (i > 0) {
        doc.line(ml + i * colW, y + 8, ml + i * colW, y + 16);
      }
    });
    y += 17;

    // ===== TABELA DE EVENTOS =====
    const tableBody = rows.map(r => [r.cod, r.desc, r.ref, r.prov, r.desc2]);

    autoTable(doc, {
      startY: y,
      head: [["Cód.", "Descrição", "Referência", "Proventos (R$)", "Descontos (R$)"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        textColor: [30, 30, 30],
        font: "helvetica",
      },
      headStyles: {
        fillColor: [33, 37, 41],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: cw * 0.40 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
      tableWidth: cw,
      margin: { left: ml },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      didParseCell: (data: any) => {
        // Highlight provento values in green
        if (data.section === 'body' && data.column.index === 3 && data.cell.text[0]) {
          data.cell.styles.textColor = [21, 87, 36];
          data.cell.styles.fontStyle = 'bold';
        }
        // Highlight desconto values in red
        if (data.section === 'body' && data.column.index === 4 && data.cell.text[0]) {
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY;

    // ===== TOTAIS =====
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.setFillColor(240, 240, 240);
    doc.rect(ml, y, cw / 2, 7, "FD");
    doc.rect(ml + cw / 2, y, cw / 2, 7, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("TOTAL VENCIMENTOS", ml + 4, y + 4.5);
    doc.setTextColor(21, 87, 36);
    doc.text(`R$ ${formatCurrency(totalProventos)}`, ml + cw / 2 - 4, y + 4.5, { align: "right" });

    doc.setTextColor(30, 30, 30);
    doc.text("TOTAL DESCONTOS", ml + cw / 2 + 4, y + 4.5);
    doc.setTextColor(153, 27, 27);
    doc.text(`R$ ${formatCurrency(totalDescontos)}`, ml + cw - 4, y + 4.5, { align: "right" });
    y += 7;

    // ===== VALOR LÍQUIDO =====
    doc.setFillColor(33, 37, 41);
    doc.rect(ml, y, cw, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("VALOR LÍQUIDO:", ml + 6, y + 5.5);
    doc.setFontSize(12);
    doc.text(`R$ ${formatCurrency(pagamento.valor_liquido)}`, ml + cw - 6, y + 5.5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 10;

    // ===== BASE DE CÁLCULOS =====
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("BASES DE CÁLCULO", ml, y + 3);
    y += 4;

    const bLabels = ["Sal. Base", "Sal. Contr.", "INSS", "Base FGTS", "FGTS Mês", "Base IRRF", "Faixa IRRF"];
    const bValues = [
      formatCurrency(salarioBase.valor),
      formatCurrency(totalProventos),
      "0,00",
      formatCurrency(totalProventos),
      formatCurrency(fgts),
      "0,00",
      "-",
    ];

    autoTable(doc, {
      startY: y,
      head: [bLabels],
      body: [bValues],
      theme: "grid",
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
        lineColor: [180, 180, 180],
        lineWidth: 0.2,
        textColor: [50, 50, 50],
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [80, 80, 80],
        fontStyle: "bold",
        halign: "center",
        fontSize: 6,
      },
      bodyStyles: { halign: "center" },
      tableWidth: cw,
      margin: { left: ml },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ===== LINHA DE CORTE =====
    doc.setDrawColor(160, 160, 160);
    doc.setLineDashPattern([3, 2], 0);
    doc.setLineWidth(0.3);
    doc.line(ml, y, ml + cw, y);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text("corte aqui", ml + cw / 2, y + 2.5, { align: "center" });
    y += 4;

    // ===== VIA DO EMPREGADOR (COMPROVANTE) =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("VIA DO EMPREGADOR", ml + cw / 2, y + 3, { align: "center" });
    y += 5;

    // Mini cabeçalho empresa
    doc.setFillColor(33, 37, 41);
    doc.rect(ml, y, cw, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(empresa.nome.toUpperCase(), ml + 4, y + 4.5);
    doc.setFontSize(6.5);
    doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}`, ml + cw - 4, y + 4.5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Info resumida do funcionário
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(ml, y, cw, 9);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(employee.nome_completo.toUpperCase(), ml + 3, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`CPF: ${formatCPF(employee.cpf)}  |  Cargo: ${employee.cargo || "-"}  |  Período: ${getMesAnoStr()}`, ml + 3, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`Líquido: R$ ${formatCurrency(pagamento.valor_liquido)}`, ml + cw - 4, y + 5, { align: "right" });
    y += 10;

    // Declaração e assinatura
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Declaro ter recebido a importância líquida discriminada neste recibo.", ml + 3, y + 3);
    y += 7;

    // Linha assinatura funcionário
    doc.setDrawColor(100, 100, 100);
    doc.line(ml + 3, y + 8, ml + cw / 2 - 10, y + 8);
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text("Assinatura do Funcionário", ml + 3, y + 11);

    // Linha data
    doc.line(ml + cw / 2 + 10, y + 8, ml + cw - 3, y + 8);
    doc.text("Data: ____/____/________", ml + cw / 2 + 10, y + 11);

    // ===== BORDA EXTERNA =====
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.5);
    doc.rect(ml - 1, 10, cw + 2, y + 14 - 10);

    const nomeArquivo = `holerite-${employee.nome_completo.replace(/\s+/g, "-").toLowerCase()}-${MESES[pagamento.mes].toLowerCase()}-${pagamento.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  if (!pagamento) return null;

  const { rows, totalProventos, totalDescontos } = getTableData();
  const salarioBase = getSalarioBase();
  const fgts = salarioBase.valor * 0.08;

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
            {/* Preview do holerite - Padrão Nacional */}
            <div className="border-2 border-black bg-white text-black font-mono text-xs relative">
              <div className="flex">
                {/* Conteúdo principal */}
                <div className="flex-1">
                  {/* Título */}
                  <div className="text-center border-b-2 border-black py-2">
                    <h2 className="text-sm font-bold tracking-wide uppercase">
                      Recibo de Pagamento de Salário
                    </h2>
                  </div>

                  {/* Cabeçalho da Empresa */}
                  <div className="border-b-2 border-black px-3 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] font-bold">{empresa?.nome?.toUpperCase()}</p>
                        <p className="text-[8px] mt-0.5">
                          CNPJ: {formatCNPJ(empresa?.cnpj)}
                        </p>
                        {empresa?.endereco && (
                          <p className="text-[8px] mt-0.5">
                            Endereço: {empresa.endereco}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold">{getMesAnoStr()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Funcionário */}
                  <div className="border-b-2 border-black px-3 py-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold">
                        {employee?.nome_completo?.toUpperCase()}
                      </span>
                      <span className="text-[8px]">CPF: {formatCPF(employee?.cpf ?? null)}</span>
                    </div>
                    <div className="flex gap-6 mt-1 text-[8px]">
                      <span>Cargo: <strong>{employee?.cargo || "-"}</strong></span>
                      <span>Admissão: <strong>{formatDate(employee?.data_admissao ?? null)}</strong></span>
                      <span>Setor: <strong>{employee?.setor || "-"}</strong></span>
                      <span>Período: <strong>{getMesAnoStr()}</strong></span>
                    </div>
                  </div>

                  {/* Tabela de Eventos */}
                  <table className="w-full border-collapse text-[8px]">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black px-1 py-1 text-center w-12">Cód.</th>
                        <th className="border border-black px-1 py-1 text-left">Descrição</th>
                        <th className="border border-black px-1 py-1 text-center w-14">Ref.</th>
                        <th className="border border-black px-1 py-1 text-right w-20">Proventos</th>
                        <th className="border border-black px-1 py-1 text-right w-20">Descontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 1 ? "bg-gray-50" : "bg-white"}
                        >
                          <td className="border border-black px-1 py-0.5 text-center">{row.cod}</td>
                          <td className="border border-black px-1 py-0.5">{row.desc}</td>
                          <td className="border border-black px-1 py-0.5 text-center">{row.ref}</td>
                          <td className="border border-black px-1 py-0.5 text-right">{row.prov}</td>
                          <td className="border border-black px-1 py-0.5 text-right">{row.desc2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totais */}
                  <div className="grid grid-cols-2 border border-black bg-gray-200 text-[9px] font-bold">
                    <div className="px-2 py-1 border-r border-black flex justify-between">
                      <span>TOTAL VENCIMENTOS</span>
                      <span>{formatCurrency(totalProventos)}</span>
                    </div>
                    <div className="px-2 py-1 flex justify-between">
                      <span>TOTAL DESCONTOS</span>
                      <span>{formatCurrency(totalDescontos)}</span>
                    </div>
                  </div>

                  {/* Valor Líquido */}
                  <div className="flex justify-between border border-black bg-gray-300 px-2 py-1.5 text-[11px] font-bold">
                    <span>VALOR LÍQUIDO:</span>
                    <span>R$ {formatCurrency(pagamento.valor_liquido)}</span>
                  </div>

                  {/* Base de Cálculos */}
                  <table className="w-full border-collapse text-[7px] mt-0">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black px-1 py-0.5">Sal. Base</th>
                        <th className="border border-black px-1 py-0.5">Sal. Contr.</th>
                        <th className="border border-black px-1 py-0.5">INSS</th>
                        <th className="border border-black px-1 py-0.5">Base FGTS</th>
                        <th className="border border-black px-1 py-0.5">FGTS Mês</th>
                        <th className="border border-black px-1 py-0.5">Base IRRF</th>
                        <th className="border border-black px-1 py-0.5">Faixa IRRF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {formatCurrency(salarioBase.valor)}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {formatCurrency(totalProventos)}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center">0,00</td>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {formatCurrency(totalProventos)}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {formatCurrency(fgts)}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center">0,00</td>
                        <td className="border border-black px-1 py-0.5 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Linha de corte */}
                  <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-1 text-center text-[7px] text-gray-500 pb-2">
                    ✂ - - - - - - - - - - - - - - - - - - - - corte aqui - - - - - - - - - - - - - - - - - - - -
                  </div>
                </div>

                {/* Barra lateral de assinatura */}
                <div className="w-20 border-l-2 border-black flex flex-col items-center justify-between py-3 shrink-0">
                  <div
                    className="text-[6px] leading-tight text-center font-bold px-1"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-auto mb-2">
                    <div className="border-t border-black w-14" />
                    <span className="text-[6px]">Assinatura</span>
                    <div className="mt-2 text-[7px] text-center leading-tight">
                      ___/___/______
                      <br />
                      <span className="text-[6px]">Data</span>
                    </div>
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
