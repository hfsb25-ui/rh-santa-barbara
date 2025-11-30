import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_DIA_LABELS: Record<string, string> = {
  normal: "Normal",
  abonado: "Abonado",
  falta: "Falta",
  ferias: "Férias",
  atestado: "Atestado",
};

interface RegistroPonto {
  id: string;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  hora_inicio_intervalo: string | null;
  hora_fim_intervalo: string | null;
  horas_trabalhadas: number | null;
  tipo_dia: string;
  observacoes: string | null;
}

interface ReportData {
  employee: {
    nome_completo: string;
    cargo: string;
    setor: string | null;
  };
  mes: string;
  registros: RegistroPonto[];
  horasEsperadas: number;
  horasTrabalhadas: number;
  saldo: number;
  horasDiarias: number;
  empresa?: {
    nome: string;
    logo_url: string | null;
  };
}

export async function generatePontoPDF(data: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 12;

  // Logo da empresa (se disponível)
  if (data.empresa?.logo_url) {
    try {
      doc.addImage(data.empresa.logo_url, "PNG", pageWidth / 2 - 8, yPosition, 16, 16);
      yPosition += 18;
    } catch (error) {
      console.error("Erro ao carregar logo:", error);
    }
  }

  // Nome da empresa
  if (data.empresa?.nome) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(data.empresa.nome, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 6;
  }

  // Título
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE PONTO", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;

  // Período
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${data.mes}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 8;

  // Dados do funcionário
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO FUNCIONÁRIO", 14, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${data.employee.nome_completo}`, 14, yPosition);
  yPosition += 4;
  doc.text(`Cargo: ${data.employee.cargo}`, 14, yPosition);
  yPosition += 4;
  if (data.employee.setor) {
    doc.text(`Setor: ${data.employee.setor}`, 14, yPosition);
    yPosition += 4;
  }
  doc.text(`Horas Diárias Esperadas: ${data.horasDiarias.toFixed(2)}h`, 14, yPosition);
  yPosition += 7;

  // Tabela de registros
  const tableData = data.registros.map((reg) => {
    const dataFormatada = format(new Date(reg.data + "T00:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR });
    const intervalo =
      reg.hora_inicio_intervalo && reg.hora_fim_intervalo
        ? `${reg.hora_inicio_intervalo} - ${reg.hora_fim_intervalo}`
        : "-";

    return [
      dataFormatada,
      TIPO_DIA_LABELS[reg.tipo_dia] || reg.tipo_dia,
      reg.hora_entrada || "-",
      reg.hora_saida || "-",
      intervalo,
      reg.horas_trabalhadas ? `${reg.horas_trabalhadas.toFixed(2)}h` : "0.00h",
      reg.observacoes || "-",
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [["Data", "Tipo", "Entrada", "Saída", "Intervalo", "Horas", "Obs."]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 18 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 24 },
      5: { cellWidth: 14 },
      6: { cellWidth: "auto" },
    },
  });

  // Resumo
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(14, finalY, pageWidth - 28, 22, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO DO PERÍODO", 18, finalY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Horas Esperadas: ${data.horasEsperadas.toFixed(2)}h`, 18, finalY + 10);
  doc.text(`Horas Trabalhadas: ${data.horasTrabalhadas.toFixed(2)}h`, 18, finalY + 14);

  // Saldo com cor
  const saldoText = `Saldo: ${data.saldo >= 0 ? "+" : ""}${data.saldo.toFixed(2)}h`;
  doc.setFont("helvetica", "bold");
  if (data.saldo > 0) {
    doc.setTextColor(34, 139, 34); // Verde
  } else if (data.saldo < 0) {
    doc.setTextColor(220, 38, 38); // Vermelho
  } else {
    doc.setTextColor(100, 100, 100); // Cinza
  }
  doc.text(saldoText, 18, finalY + 18);
  doc.setTextColor(0, 0, 0); // Resetar cor

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  }

  const fileName = `relatorio_ponto_${data.employee.nome_completo.replace(/\s+/g, "_")}_${data.mes.replace("/", "-")}.pdf`;
  doc.save(fileName);
}
