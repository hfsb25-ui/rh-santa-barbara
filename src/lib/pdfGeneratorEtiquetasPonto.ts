import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Pimaco 6282 specifications (in mm)
// Etiqueta: 33.9mm x 101.6mm
// 14 etiquetas por folha (2 colunas x 7 linhas)
// Papel Carta: 215.9mm x 279.4mm

const ETIQUETA_LARGURA = 101.6; // mm
const ETIQUETA_ALTURA = 33.9; // mm
const COLUNAS = 2;
const LINHAS = 7;
const MARGEM_ESQUERDA = 4.7; // mm
const MARGEM_TOPO = 12.7; // mm
const ESPACO_HORIZONTAL = 3.2; // mm entre colunas
const ESPACO_VERTICAL = 0; // mm entre linhas

interface EtiquetaData {
  nomeCompleto: string;
  cargo: string;
  empresa: string;
  setor?: string;
  mes?: string;
  ano?: string;
}

export function generateEtiquetasPontoPDF(etiquetas: EtiquetaData[]): void {
  // Papel Carta em mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  let etiquetaIndex = 0;
  const totalEtiquetas = etiquetas.length;
  const etiquetasPorPagina = COLUNAS * LINHAS;

  while (etiquetaIndex < totalEtiquetas) {
    if (etiquetaIndex > 0) {
      doc.addPage();
    }

    // Desenhar etiquetas na página atual
    for (let linha = 0; linha < LINHAS && etiquetaIndex < totalEtiquetas; linha++) {
      for (let coluna = 0; coluna < COLUNAS && etiquetaIndex < totalEtiquetas; coluna++) {
        const x = MARGEM_ESQUERDA + coluna * (ETIQUETA_LARGURA + ESPACO_HORIZONTAL);
        const y = MARGEM_TOPO + linha * (ETIQUETA_ALTURA + ESPACO_VERTICAL);

        desenharEtiqueta(doc, etiquetas[etiquetaIndex], x, y);
        etiquetaIndex++;
      }
    }
  }

  const mesAno = etiquetas[0] ? `${etiquetas[0].mes}_${etiquetas[0].ano}` : "etiquetas";
  const fileName = `etiquetas_ponto_${mesAno}.pdf`;
  import("./pdfBackupHelper").then(({ saveAndBackup }) => saveAndBackup(doc, fileName, "Etiquetas"));
}

function desenharEtiqueta(doc: jsPDF, data: EtiquetaData, x: number, y: number): void {
  const padding = 3;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = ETIQUETA_LARGURA - padding * 2;
  const innerHeight = ETIQUETA_ALTURA - padding * 2;

  // Mês/Ano (centralizado no topo)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const mesAno = `${data.mes.toUpperCase()} / ${data.ano}`;
  doc.text(mesAno, innerX + innerWidth / 2, innerY + 6, { align: "center" });

  // Linha separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(innerX, innerY + 9, innerX + innerWidth, innerY + 9);

  // Nome do funcionário
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const nomeMaxWidth = innerWidth - 4;
  const nomeTruncado = truncateText(doc, data.nomeCompleto, nomeMaxWidth);
  doc.text(nomeTruncado, innerX + innerWidth / 2, innerY + 16, { align: "center" });

  // Empresa
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const empresaMaxWidth = innerWidth - 4;
  const empresaTruncada = truncateText(doc, data.empresa, empresaMaxWidth);
  doc.text(empresaTruncada, innerX + innerWidth / 2, innerY + 23, { align: "center" });
}

function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (doc.getTextWidth(truncated + "...") > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

export function getMesNome(mes: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return meses[mes - 1] || "";
}
