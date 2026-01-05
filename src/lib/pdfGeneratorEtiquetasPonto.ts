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
  mes: string;
  ano: string;
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
  doc.save(`etiquetas_ponto_${mesAno}.pdf`);
}

function desenharEtiqueta(doc: jsPDF, data: EtiquetaData, x: number, y: number): void {
  const padding = 2;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = ETIQUETA_LARGURA - padding * 2;
  const innerHeight = ETIQUETA_ALTURA - padding * 2;

  // Borda da etiqueta (opcional - para visualização)
  // doc.setDrawColor(200, 200, 200);
  // doc.rect(x, y, ETIQUETA_LARGURA, ETIQUETA_ALTURA);

  // Título "CARTÃO DE PONTO"
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CARTÃO DE PONTO", innerX + innerWidth / 2, innerY + 3, { align: "center" });

  // Mês/Ano
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const mesAno = `${data.mes.toUpperCase()} / ${data.ano}`;
  doc.text(mesAno, innerX + innerWidth / 2, innerY + 7, { align: "center" });

  // Linha separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(innerX, innerY + 9, innerX + innerWidth, innerY + 9);

  // Nome do funcionário
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const nomeLabel = "Nome:";
  doc.text(nomeLabel, innerX, innerY + 13);
  
  doc.setFont("helvetica", "normal");
  const nomeWidth = doc.getTextWidth(nomeLabel) + 1;
  const nomeMaxWidth = innerWidth - nomeWidth - 2;
  const nomeTruncado = truncateText(doc, data.nomeCompleto, nomeMaxWidth);
  doc.text(nomeTruncado, innerX + nomeWidth, innerY + 13);

  // Cargo
  doc.setFont("helvetica", "bold");
  const cargoLabel = "Cargo:";
  doc.text(cargoLabel, innerX, innerY + 17);
  
  doc.setFont("helvetica", "normal");
  const cargoWidth = doc.getTextWidth(cargoLabel) + 1;
  const cargoMaxWidth = innerWidth - cargoWidth - 2;
  const cargoTruncado = truncateText(doc, data.cargo, cargoMaxWidth);
  doc.text(cargoTruncado, innerX + cargoWidth, innerY + 17);

  // Empresa
  doc.setFont("helvetica", "bold");
  const empresaLabel = "Empresa:";
  doc.text(empresaLabel, innerX, innerY + 21);
  
  doc.setFont("helvetica", "normal");
  const empresaWidth = doc.getTextWidth(empresaLabel) + 1;
  const empresaMaxWidth = innerWidth - empresaWidth - 2;
  const empresaTruncada = truncateText(doc, data.empresa, empresaMaxWidth);
  doc.text(empresaTruncada, innerX + empresaWidth, innerY + 21);

  // Setor (se existir)
  if (data.setor) {
    doc.setFont("helvetica", "bold");
    const setorLabel = "Setor:";
    doc.text(setorLabel, innerX, innerY + 25);
    
    doc.setFont("helvetica", "normal");
    const setorWidth = doc.getTextWidth(setorLabel) + 1;
    const setorMaxWidth = innerWidth - setorWidth - 2;
    const setorTruncado = truncateText(doc, data.setor, setorMaxWidth);
    doc.text(setorTruncado, innerX + setorWidth, innerY + 25);
  }

  // Linha para assinatura
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  const assinaturaY = innerY + 29;
  doc.line(innerX + innerWidth * 0.3, assinaturaY, innerX + innerWidth - 2, assinaturaY);
  
  doc.setFontSize(5);
  doc.text("Assinatura", innerX + innerWidth * 0.6, assinaturaY + 2, { align: "center" });
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
