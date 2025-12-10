import jsPDF from "jspdf";

interface EmployeeForBadge {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  foto_url: string | null;
  cpf: string | null;
  empresa?: {
    nome: string;
    logo_url: string | null;
  } | null;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  headerColor: string;
  textColor: string;
  accentColor: string;
  style: "modern" | "classic" | "minimal" | "corporate";
}

export const BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: "modern-blue",
    name: "Moderno Azul",
    headerColor: "#3B82F6",
    textColor: "#1E3A8A",
    accentColor: "#60A5FA",
    style: "modern",
  },
  {
    id: "corporate-dark",
    name: "Corporativo Escuro",
    headerColor: "#1F2937",
    textColor: "#111827",
    accentColor: "#4B5563",
    style: "corporate",
  },
  {
    id: "classic-green",
    name: "Clássico Verde",
    headerColor: "#059669",
    textColor: "#065F46",
    accentColor: "#34D399",
    style: "classic",
  },
  {
    id: "minimal-gray",
    name: "Minimalista",
    headerColor: "#6B7280",
    textColor: "#374151",
    accentColor: "#9CA3AF",
    style: "minimal",
  },
  {
    id: "vibrant-purple",
    name: "Vibrante Roxo",
    headerColor: "#7C3AED",
    textColor: "#5B21B6",
    accentColor: "#A78BFA",
    style: "modern",
  },
  {
    id: "elegant-red",
    name: "Elegante Vermelho",
    headerColor: "#DC2626",
    textColor: "#991B1B",
    accentColor: "#F87171",
    style: "corporate",
  },
];

interface BadgeOptions {
  showCpf: boolean;
  showSector: boolean;
  showCompanyLogo: boolean;
  template: BadgeTemplate;
  customHeaderColor?: string;
}

const BADGE_WIDTH = 85;
const BADGE_HEIGHT = 54;
const BADGES_PER_ROW = 2;
const BADGES_PER_COLUMN = 4;
const BADGES_PER_PAGE = BADGES_PER_ROW * BADGES_PER_COLUMN;

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

const MARGIN_X = (PAGE_WIDTH - BADGES_PER_ROW * BADGE_WIDTH) / (BADGES_PER_ROW + 1);
const MARGIN_Y = (PAGE_HEIGHT - BADGES_PER_COLUMN * BADGE_HEIGHT) / (BADGES_PER_COLUMN + 1);

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 };
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawModernBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);
  const accentColor = hexToRgb(options.template.accentColor);

  // Background with subtle gradient effect
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 4, 4, "F");

  // Header bar with gradient simulation
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, BADGE_WIDTH, 14, 4, 4, "F");
  doc.rect(x, y + 8, BADGE_WIDTH, 6, "F");

  // Accent stripe
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(x, y + 14, BADGE_WIDTH, 2, "F");

  // Company name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 3, y + 3, 18, 8);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 20), x + 23, y + 9);
      }
    } catch {
      doc.text(employee.empresa?.nome || "IDENTIFICAÇÃO", x + BADGE_WIDTH / 2, y + 9, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "IDENTIFICAÇÃO", x + BADGE_WIDTH / 2, y + 9, { align: "center" });
  }

  // Photo area with border
  const photoX = x + 5;
  const photoY = y + 19;
  const photoSize = 24;

  doc.setFillColor(240, 240, 245);
  doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "FD");

  if (employeePhoto) {
    try {
      doc.addImage(employeePhoto, "JPEG", photoX + 0.5, photoY + 0.5, photoSize - 1, photoSize - 1);
    } catch {
      drawPlaceholderIcon(doc, photoX, photoY, photoSize);
    }
  } else {
    drawPlaceholderIcon(doc, photoX, photoY, photoSize);
  }

  // Employee info
  const infoX = photoX + photoSize + 4;

  doc.setTextColor(30, 30, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  const name = employee.nome_completo.length > 18 ? employee.nome_completo.substring(0, 18) + "..." : employee.nome_completo;
  doc.text(name, infoX, photoY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  const cargo = employee.cargo.length > 20 ? employee.cargo.substring(0, 20) + "..." : employee.cargo;
  doc.text(cargo, infoX, photoY + 12);

  if (options.showSector && employee.setor) {
    doc.setFontSize(7);
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    const setor = employee.setor.length > 22 ? employee.setor.substring(0, 22) + "..." : employee.setor;
    doc.text(setor, infoX, photoY + 17);
  }

  // CPF at bottom
  if (options.showCpf && employee.cpf) {
    doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
    doc.roundedRect(x + 10, y + BADGE_HEIGHT - 8, BADGE_WIDTH - 20, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(`CPF: ${employee.cpf}`, x + BADGE_WIDTH / 2, y + BADGE_HEIGHT - 4, { align: "center" });
  }

  drawCutMarks(doc, x, y);
}

function drawClassicBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  // White background with border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 3, 3, "FD");

  // Double header bar
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x + 1, y + 1, BADGE_WIDTH - 2, 10, "F");
  doc.setLineWidth(0.5);
  doc.line(x + 1, y + 13, x + BADGE_WIDTH - 1, y + 13);

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 3, y + 2, 16, 7);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 22), x + 21, y + 7);
      }
    } catch {
      doc.text(employee.empresa?.nome || "CRACHÁ FUNCIONAL", x + BADGE_WIDTH / 2, y + 7, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "CRACHÁ FUNCIONAL", x + BADGE_WIDTH / 2, y + 7, { align: "center" });
  }

  // Centered layout
  const photoSize = 22;
  const photoX = x + 5;
  const photoY = y + 16;

  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoSize, photoSize, "FD");

  if (employeePhoto) {
    try {
      doc.addImage(employeePhoto, "JPEG", photoX, photoY, photoSize, photoSize);
    } catch {
      drawPlaceholderIcon(doc, photoX, photoY, photoSize);
    }
  } else {
    drawPlaceholderIcon(doc, photoX, photoY, photoSize);
  }

  // Info to the right
  const infoX = photoX + photoSize + 4;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.length > 18 ? employee.nome_completo.substring(0, 18) + "..." : employee.nome_completo;
  doc.text(name, infoX, photoY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(employee.cargo.substring(0, 22), infoX, photoY + 11);

  if (options.showSector && employee.setor) {
    doc.text(employee.setor.substring(0, 22), infoX, photoY + 16);
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`CPF: ${employee.cpf}`, x + BADGE_WIDTH / 2, y + BADGE_HEIGHT - 3, { align: "center" });
  }

  drawCutMarks(doc, x, y);
}

function drawMinimalBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 2, 2, "FD");

  // Thin accent line at top
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x, y, BADGE_WIDTH, 3, "F");

  // Company name (subtle)
  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(employee.empresa?.nome || "", x + 5, y + 10);

  // Large centered photo
  const photoSize = 26;
  const photoX = x + 5;
  const photoY = y + 14;

  doc.setFillColor(248, 248, 248);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 13, 13, "F");

  if (employeePhoto) {
    try {
      doc.addImage(employeePhoto, "JPEG", photoX, photoY, photoSize, photoSize);
    } catch {
      drawPlaceholderIcon(doc, photoX, photoY, photoSize);
    }
  } else {
    drawPlaceholderIcon(doc, photoX, photoY, photoSize);
  }

  // Name and role to the right
  const infoX = photoX + photoSize + 5;

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.length > 16 ? employee.nome_completo.substring(0, 16) + "..." : employee.nome_completo;
  doc.text(name, infoX, photoY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(employee.cargo.substring(0, 20), infoX, photoY + 14);

  if (options.showSector && employee.setor) {
    doc.text(employee.setor.substring(0, 20), infoX, photoY + 19);
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.text(employee.cpf, x + BADGE_WIDTH / 2, y + BADGE_HEIGHT - 3, { align: "center" });
  }

  drawCutMarks(doc, x, y);
}

function drawCorporateBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);
  const accentColor = hexToRgb(options.template.accentColor);

  // Background
  doc.setFillColor(252, 252, 253);
  doc.roundedRect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 3, 3, "F");

  // Left accent bar
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, 6, BADGE_HEIGHT, 3, 0, "F");
  doc.rect(x + 3, y, 3, BADGE_HEIGHT, "F");

  // Header area
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x + 6, y, BADGE_WIDTH - 6, 12, "F");

  // Company logo/name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 10, y + 2, 16, 8);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 18), x + 28, y + 8);
      }
    } catch {
      doc.text(employee.empresa?.nome || "CORPORATIVO", x + (BADGE_WIDTH + 6) / 2, y + 8, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "CORPORATIVO", x + (BADGE_WIDTH + 6) / 2, y + 8, { align: "center" });
  }

  // Photo
  const photoX = x + 10;
  const photoY = y + 16;
  const photoSize = 22;

  doc.setFillColor(240, 240, 242);
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoSize, photoSize, "FD");

  if (employeePhoto) {
    try {
      doc.addImage(employeePhoto, "JPEG", photoX, photoY, photoSize, photoSize);
    } catch {
      drawPlaceholderIcon(doc, photoX, photoY, photoSize);
    }
  } else {
    drawPlaceholderIcon(doc, photoX, photoY, photoSize);
  }

  // Info
  const infoX = photoX + photoSize + 4;

  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.length > 16 ? employee.nome_completo.substring(0, 16) + "..." : employee.nome_completo;
  doc.text(name, infoX, photoY + 6);

  doc.setTextColor(80, 80, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(employee.cargo.substring(0, 18), infoX, photoY + 12);

  if (options.showSector && employee.setor) {
    doc.setFontSize(6);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text(employee.setor.substring(0, 18), infoX, photoY + 17);
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 125);
    doc.text(`CPF: ${employee.cpf}`, x + (BADGE_WIDTH + 6) / 2, y + BADGE_HEIGHT - 3, { align: "center" });
  }

  drawCutMarks(doc, x, y);
}

function drawPlaceholderIcon(doc: jsPDF, x: number, y: number, size: number) {
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(14);
  doc.text("👤", x + size / 2, y + size / 2 + 4, { align: "center" });
}

function drawCutMarks(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  const markLen = 2;

  doc.line(x - markLen, y, x, y);
  doc.line(x, y - markLen, x, y);
  doc.line(x + BADGE_WIDTH, y, x + BADGE_WIDTH + markLen, y);
  doc.line(x + BADGE_WIDTH, y - markLen, x + BADGE_WIDTH, y);
  doc.line(x - markLen, y + BADGE_HEIGHT, x, y + BADGE_HEIGHT);
  doc.line(x, y + BADGE_HEIGHT, x, y + BADGE_HEIGHT + markLen);
  doc.line(x + BADGE_WIDTH, y + BADGE_HEIGHT, x + BADGE_WIDTH + markLen, y + BADGE_HEIGHT);
  doc.line(x + BADGE_WIDTH, y + BADGE_HEIGHT, x + BADGE_WIDTH, y + BADGE_HEIGHT + markLen);
}

function drawBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  switch (options.template.style) {
    case "modern":
      drawModernBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
      break;
    case "classic":
      drawClassicBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
      break;
    case "minimal":
      drawMinimalBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
      break;
    case "corporate":
      drawCorporateBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
      break;
    default:
      drawModernBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
  }
}

export async function generateBadgesPDF(
  employees: EmployeeForBadge[],
  options: BadgeOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imageCache: Map<string, string | null> = new Map();

  for (const employee of employees) {
    if (employee.foto_url && !imageCache.has(employee.foto_url)) {
      const img = await loadImageAsBase64(employee.foto_url);
      imageCache.set(employee.foto_url, img);
    }
    if (employee.empresa?.logo_url && !imageCache.has(employee.empresa.logo_url)) {
      const img = await loadImageAsBase64(employee.empresa.logo_url);
      imageCache.set(employee.empresa.logo_url, img);
    }
  }

  const totalPages = Math.ceil(employees.length / BADGES_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    const startIdx = page * BADGES_PER_PAGE;
    const endIdx = Math.min(startIdx + BADGES_PER_PAGE, employees.length);

    for (let i = startIdx; i < endIdx; i++) {
      const employee = employees[i];
      const positionOnPage = i - startIdx;
      const col = positionOnPage % BADGES_PER_ROW;
      const row = Math.floor(positionOnPage / BADGES_PER_ROW);

      const x = MARGIN_X + col * (BADGE_WIDTH + MARGIN_X);
      const y = MARGIN_Y + row * (BADGE_HEIGHT + MARGIN_Y);

      const employeePhoto = employee.foto_url ? imageCache.get(employee.foto_url) || null : null;
      const companyLogo = employee.empresa?.logo_url ? imageCache.get(employee.empresa.logo_url) || null : null;

      drawBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
    }
  }

  doc.save(`crachas_${new Date().toISOString().split("T")[0]}.pdf`);
}
