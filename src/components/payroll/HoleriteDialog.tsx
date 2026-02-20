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

    // Preencher até 12 linhas
    while (rows.length < 12) {
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
    const ml = 8;
    const sigW = 22;
    const mr = sigW + 6;
    const cw = pw - ml - mr;
    let y = 10;

    const salarioBase = getSalarioBase();
    const { rows, totalProventos, totalDescontos } = getTableData();
    const fgts = salarioBase.valor * 0.08;

    // ===== TITULO =====
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", ml + cw / 2, y, { align: "center" });
    y += 5;

    // ===== EMPRESA =====
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(ml, y, cw, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(empresa.nome.toUpperCase(), ml + 3, y + 5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}`, ml + 3, y + 9);
    if (empresa.endereco) {
      doc.text(`Endereço: ${empresa.endereco}`, ml + 3, y + 12);
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(getMesAnoStr(), ml + cw - 3, y + 5, { align: "right" });
    y += 14;

    // ===== FUNCIONÁRIO =====
    doc.rect(ml, y, cw, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(employee.nome_completo.toUpperCase(), ml + 3, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`CPF: ${formatCPF(employee.cpf)}`, ml + cw - 3, y + 4, { align: "right" });
    doc.text(`Cargo: ${employee.cargo || "-"}`, ml + 3, y + 8);
    doc.text(`Admissão: ${formatDate(employee.data_admissao)}`, ml + 55, y + 8);
    doc.text(`Setor: ${employee.setor || "-"}`, ml + 105, y + 8);
    doc.text(`Período: ${getMesAnoStr()}`, ml + cw - 3, y + 8, { align: "right" });
    y += 12;

    // ===== TABELA =====
    const tableBody = rows.map(r => [r.cod, r.desc, r.ref, r.prov, r.desc2]);

    autoTable(doc, {
      startY: y,
      head: [["Cód.", "Descrição", "Ref.", "Proventos", "Descontos"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: cw * 0.38 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
      },
      tableWidth: cw,
      margin: { left: ml },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    y = (doc as any).lastAutoTable.finalY;

    // ===== TOTAIS =====
    doc.setFillColor(230, 230, 230);
    doc.rect(ml, y, cw, 6, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL VENCIMENTOS:", ml + 3, y + 4);
    doc.text(formatCurrency(totalProventos), ml + cw / 2 - 5, y + 4, { align: "right" });
    doc.text("TOTAL DESCONTOS:", ml + cw / 2 + 5, y + 4);
    doc.text(formatCurrency(totalDescontos), ml + cw - 3, y + 4, { align: "right" });
    y += 6;

    // ===== VALOR LÍQUIDO =====
    doc.setFillColor(200, 200, 200);
    doc.rect(ml, y, cw, 7, "FD");
    doc.setFontSize(10);
    doc.text("VALOR LÍQUIDO:", ml + 3, y + 5);
    doc.text(`R$ ${formatCurrency(pagamento.valor_liquido)}`, ml + cw - 3, y + 5, { align: "right" });
    y += 10;

    // ===== BASE DE CÁLCULOS =====
    const bLabels = ["Sal.Base", "Sal.Contr.", "INSS", "Base FGTS", "FGTS Mês", "Base IRRF", "Faixa IRRF"];
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
      styles: { fontSize: 6, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      bodyStyles: { halign: "center" },
      tableWidth: cw,
      margin: { left: ml },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ===== CORTE =====
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.3);
    doc.line(ml, y, ml + cw, y);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("✂ corte aqui", ml + cw / 2, y + 3, { align: "center" });
    doc.setLineDashPattern([], 0);

    // ===== BARRA LATERAL ASSINATURA =====
    const barraX = pw - sigW - 2;
    const barraTop = 10;
    const barraH = y - barraTop - 2;
    doc.setLineWidth(0.4);
    doc.rect(barraX, barraTop, sigW, barraH);

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO", barraX + 5, barraTop + 5, {
      angle: 90,
      maxWidth: barraH - 30,
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("Assinatura:", barraX + 11, barraTop + 5, { angle: 90 });
    doc.line(barraX + 13, barraTop + 5, barraX + 13, barraTop + barraH - 25);
    doc.text("___/___/______", barraX + 17, barraTop + barraH - 20, { angle: 90 });

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
