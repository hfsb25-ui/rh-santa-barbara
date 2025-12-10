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
  showPhoto: boolean;
  showCargo: boolean;
  orientation: "horizontal" | "vertical";
  template: BadgeTemplate;
  customHeaderColor?: string;
}

// Horizontal dimensions
const H_BADGE_WIDTH = 85;
const H_BADGE_HEIGHT = 54;
const H_BADGES_PER_ROW = 2;
const H_BADGES_PER_COLUMN = 4;

// Vertical dimensions
const V_BADGE_WIDTH = 54;
const V_BADGE_HEIGHT = 85;
const V_BADGES_PER_ROW = 3;
const V_BADGES_PER_COLUMN = 3;

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

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

function drawPlaceholderIcon(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(220, 220, 225);
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, size, size, 2, 2, "FD");
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(size * 0.5);
  doc.text("?", x + size / 2, y + size * 0.65, { align: "center" });
}

function drawCutMarks(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.1);
  const markLen = 3;

  // Corners
  doc.line(x - markLen, y, x - 1, y);
  doc.line(x, y - markLen, x, y - 1);
  doc.line(x + width + 1, y, x + width + markLen, y);
  doc.line(x + width, y - markLen, x + width, y - 1);
  doc.line(x - markLen, y + height, x - 1, y + height);
  doc.line(x, y + height + 1, x, y + height + markLen);
  doc.line(x + width + 1, y + height, x + width + markLen, y + height);
  doc.line(x + width, y + height + 1, x + width, y + height + markLen);
}

// ========== HORIZONTAL BADGES ==========

function drawHorizontalModern(
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
  doc.setFillColor(252, 252, 254);
  doc.roundedRect(x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT, 3, 3, "F");

  // Header
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, H_BADGE_WIDTH, 13, 3, 3, "F");
  doc.rect(x, y + 7, H_BADGE_WIDTH, 6, "F");

  // Accent line
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(x, y + 13, H_BADGE_WIDTH, 1.5, "F");

  // Company name/logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 3, y + 2.5, 16, 8);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 22), x + 21, y + 8);
      }
    } catch {
      doc.text(employee.empresa?.nome || "IDENTIFICAÇÃO", x + H_BADGE_WIDTH / 2, y + 8, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "IDENTIFICAÇÃO", x + H_BADGE_WIDTH / 2, y + 8, { align: "center" });
  }

  // Content area
  let contentX = x + 4;
  const contentY = y + 18;

  // Photo
  if (options.showPhoto) {
    const photoSize = 22;
    if (employeePhoto) {
      try {
        doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
        doc.setLineWidth(0.4);
        doc.roundedRect(contentX, contentY, photoSize, photoSize, 2, 2, "D");
        doc.addImage(employeePhoto, "JPEG", contentX + 0.3, contentY + 0.3, photoSize - 0.6, photoSize - 0.6);
      } catch {
        drawPlaceholderIcon(doc, contentX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, contentX, contentY, photoSize);
    }
    contentX += photoSize + 4;
  }

  // Info area - centered with padding
  const infoAreaX = options.showPhoto ? contentX : x + 6;
  const infoAreaWidth = options.showPhoto ? H_BADGE_WIDTH - contentX + x - 4 : H_BADGE_WIDTH - 12;
  const infoAreaCenterX = infoAreaX + infoAreaWidth / 2;
  let infoY = contentY + 6;

  // Name - larger and centered
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const maxNameLen = options.showPhoto ? 16 : 24;
  const name = employee.nome_completo.length > maxNameLen ? employee.nome_completo.substring(0, maxNameLen) + "..." : employee.nome_completo;
  doc.text(name.toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  infoY += 6;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 90);
    const maxCargoLen = options.showPhoto ? 18 : 30;
    const cargo = employee.cargo.length > maxCargoLen ? employee.cargo.substring(0, maxCargoLen) + "..." : employee.cargo;
    doc.text(cargo, infoAreaCenterX, infoY, { align: "center" });
    infoY += 5;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    const maxSetorLen = options.showPhoto ? 18 : 32;
    const setor = employee.setor.length > maxSetorLen ? employee.setor.substring(0, maxSetorLen) + "..." : employee.setor;
    doc.text(setor.toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  }

  // CPF
  if (options.showCpf && employee.cpf) {
    doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
    doc.roundedRect(x + 12, y + H_BADGE_HEIGHT - 7, H_BADGE_WIDTH - 24, 5, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(`CPF: ${employee.cpf}`, x + H_BADGE_WIDTH / 2, y + H_BADGE_HEIGHT - 3.5, { align: "center" });
  }

  drawCutMarks(doc, x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT);
}

function drawHorizontalClassic(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  // Border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT, 2, 2, "FD");

  // Header
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x + 0.5, y + 0.5, H_BADGE_WIDTH - 1, 10, "F");

  // Divider line
  doc.setLineWidth(0.3);
  doc.line(x + 0.5, y + 12, x + H_BADGE_WIDTH - 0.5, y + 12);

  // Company
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 3, y + 1.5, 14, 7);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 24), x + 19, y + 6.5);
      }
    } catch {
      doc.text(employee.empresa?.nome || "CRACHÁ", x + H_BADGE_WIDTH / 2, y + 6.5, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "CRACHÁ", x + H_BADGE_WIDTH / 2, y + 6.5, { align: "center" });
  }

  // Content
  let contentX = x + 4;
  const contentY = y + 15;

  if (options.showPhoto) {
    const photoSize = 20;
    if (employeePhoto) {
      try {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(contentX, contentY, photoSize, photoSize, "D");
        doc.addImage(employeePhoto, "JPEG", contentX, contentY, photoSize, photoSize);
      } catch {
        drawPlaceholderIcon(doc, contentX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, contentX, contentY, photoSize);
    }
    contentX += photoSize + 4;
  }

  // Info area - centered with padding
  const infoAreaX = options.showPhoto ? contentX : x + 6;
  const infoAreaWidth = options.showPhoto ? H_BADGE_WIDTH - contentX + x - 4 : H_BADGE_WIDTH - 12;
  const infoAreaCenterX = infoAreaX + infoAreaWidth / 2;
  let infoY = contentY + 6;

  // Name - larger and centered
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const maxLen = options.showPhoto ? 16 : 26;
  doc.text(employee.nome_completo.substring(0, maxLen).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  infoY += 6;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(employee.cargo.substring(0, options.showPhoto ? 18 : 32), infoAreaCenterX, infoY, { align: "center" });
    infoY += 5;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(employee.setor.substring(0, options.showPhoto ? 18 : 34).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(`CPF: ${employee.cpf}`, x + H_BADGE_WIDTH / 2, y + H_BADGE_HEIGHT - 2, { align: "center" });
  }

  drawCutMarks(doc, x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT);
}

function drawHorizontalMinimal(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  // Clean background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT, 2, 2, "FD");

  // Top accent line
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, H_BADGE_WIDTH, 2.5, 2, 2, "F");
  doc.rect(x, y + 1.5, H_BADGE_WIDTH, 1, "F");

  // Company name subtle
  if (employee.empresa?.nome) {
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(employee.empresa.nome.substring(0, 30), x + 4, y + 8);
  }

  // Content
  let contentX = x + 4;
  const contentY = y + 12;

  if (options.showPhoto) {
    const photoSize = 24;
    if (employeePhoto) {
      try {
        doc.addImage(employeePhoto, "JPEG", contentX, contentY, photoSize, photoSize);
      } catch {
        doc.setFillColor(245, 245, 248);
        doc.roundedRect(contentX, contentY, photoSize, photoSize, photoSize / 2, photoSize / 2, "F");
      }
    } else {
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(contentX, contentY, photoSize, photoSize, photoSize / 2, photoSize / 2, "F");
    }
    contentX += photoSize + 5;
  }

  // Info area - centered with padding
  const infoAreaX = options.showPhoto ? contentX : x + 6;
  const infoAreaWidth = options.showPhoto ? H_BADGE_WIDTH - contentX + x - 4 : H_BADGE_WIDTH - 12;
  const infoAreaCenterX = infoAreaX + infoAreaWidth / 2;
  let infoY = contentY + 8;

  // Name - larger and centered
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(employee.nome_completo.substring(0, options.showPhoto ? 14 : 24).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  infoY += 6;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(employee.cargo.substring(0, options.showPhoto ? 16 : 30), infoAreaCenterX, infoY, { align: "center" });
    infoY += 5;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(employee.setor.substring(0, options.showPhoto ? 18 : 32).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(5);
    doc.setTextColor(160, 160, 160);
    doc.text(employee.cpf, x + H_BADGE_WIDTH / 2, y + H_BADGE_HEIGHT - 2, { align: "center" });
  }

  drawCutMarks(doc, x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT);
}

function drawHorizontalCorporate(
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
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT, 2, 2, "F");

  // Left accent bar
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, 5, H_BADGE_HEIGHT, 2, 0, "F");
  doc.rect(x + 3, y, 2, H_BADGE_HEIGHT, "F");

  // Header
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x + 5, y, H_BADGE_WIDTH - 5, 11, "F");

  // Company
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 8, y + 1.5, 14, 8);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 20), x + 24, y + 7);
      }
    } catch {
      doc.text(employee.empresa?.nome || "CORPORATIVO", x + (H_BADGE_WIDTH + 5) / 2, y + 7, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "CORPORATIVO", x + (H_BADGE_WIDTH + 5) / 2, y + 7, { align: "center" });
  }

  // Content
  let contentX = x + 8;
  const contentY = y + 14;

  if (options.showPhoto) {
    const photoSize = 20;
    if (employeePhoto) {
      try {
        doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
        doc.setLineWidth(0.4);
        doc.rect(contentX, contentY, photoSize, photoSize, "D");
        doc.addImage(employeePhoto, "JPEG", contentX, contentY, photoSize, photoSize);
      } catch {
        drawPlaceholderIcon(doc, contentX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, contentX, contentY, photoSize);
    }
    contentX += photoSize + 4;
  }

  // Info area - centered with padding
  const infoAreaX = options.showPhoto ? contentX : x + 10;
  const infoAreaWidth = options.showPhoto ? H_BADGE_WIDTH - contentX + x - 4 : H_BADGE_WIDTH - 18;
  const infoAreaCenterX = infoAreaX + infoAreaWidth / 2;
  let infoY = contentY + 6;

  // Name - larger and centered
  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(employee.nome_completo.substring(0, options.showPhoto ? 14 : 22).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  infoY += 6;

  if (options.showCargo) {
    doc.setTextColor(80, 80, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(employee.cargo.substring(0, options.showPhoto ? 16 : 28), infoAreaCenterX, infoY, { align: "center" });
    infoY += 5;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text(employee.setor.substring(0, options.showPhoto ? 16 : 30).toUpperCase(), infoAreaCenterX, infoY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(5);
    doc.setTextColor(120, 120, 125);
    doc.text(`CPF: ${employee.cpf}`, x + (H_BADGE_WIDTH + 5) / 2, y + H_BADGE_HEIGHT - 2, { align: "center" });
  }

  drawCutMarks(doc, x, y, H_BADGE_WIDTH, H_BADGE_HEIGHT);
}

// ========== VERTICAL BADGES ==========

function drawVerticalModern(
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
  doc.setFillColor(252, 252, 254);
  doc.roundedRect(x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT, 3, 3, "F");

  // Header
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, V_BADGE_WIDTH, 16, 3, 3, "F");
  doc.rect(x, y + 10, V_BADGE_WIDTH, 6, "F");

  // Accent
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(x, y + 16, V_BADGE_WIDTH, 2, "F");

  // Company
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + (V_BADGE_WIDTH - 20) / 2, y + 2, 20, 10);
    } catch {
      doc.text(employee.empresa?.nome?.substring(0, 12) || "ID", x + V_BADGE_WIDTH / 2, y + 10, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome?.substring(0, 12) || "ID", x + V_BADGE_WIDTH / 2, y + 10, { align: "center" });
  }

  // Photo centered
  let contentY = y + 22;

  if (options.showPhoto) {
    const photoSize = 28;
    const photoX = x + (V_BADGE_WIDTH - photoSize) / 2;
    if (employeePhoto) {
      try {
        doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
        doc.setLineWidth(0.5);
        doc.roundedRect(photoX, contentY, photoSize, photoSize, 2, 2, "D");
        doc.addImage(employeePhoto, "JPEG", photoX + 0.3, contentY + 0.3, photoSize - 0.6, photoSize - 0.6);
      } catch {
        drawPlaceholderIcon(doc, photoX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, photoX, contentY, photoSize);
    }
    contentY += photoSize + 4;
  }

  // Name centered - larger with padding
  const centerX = x + V_BADGE_WIDTH / 2;
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.split(" ").slice(0, 2).join(" ");
  doc.text(name.substring(0, 12).toUpperCase(), centerX, contentY, { align: "center" });
  contentY += 5;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 90);
    doc.text(employee.cargo.substring(0, 12), centerX, contentY, { align: "center" });
    contentY += 4;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.text(employee.setor.substring(0, 12).toUpperCase(), centerX, contentY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
    doc.roundedRect(x + 5, y + V_BADGE_HEIGHT - 8, V_BADGE_WIDTH - 10, 6, 1, 1, "F");
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text(employee.cpf, x + V_BADGE_WIDTH / 2, y + V_BADGE_HEIGHT - 4, { align: "center" });
  }

  drawCutMarks(doc, x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT);
}

function drawVerticalClassic(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT, 2, 2, "FD");

  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(x + 0.5, y + 0.5, V_BADGE_WIDTH - 1, 12, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(employee.empresa?.nome?.substring(0, 14) || "CRACHÁ", x + V_BADGE_WIDTH / 2, y + 8, { align: "center" });

  let contentY = y + 18;

  if (options.showPhoto) {
    const photoSize = 26;
    const photoX = x + (V_BADGE_WIDTH - photoSize) / 2;
    if (employeePhoto) {
      try {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(photoX, contentY, photoSize, photoSize, "D");
        doc.addImage(employeePhoto, "JPEG", photoX, contentY, photoSize, photoSize);
      } catch {
        drawPlaceholderIcon(doc, photoX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, photoX, contentY, photoSize);
    }
    contentY += photoSize + 4;
  }

  // Name centered - larger with padding
  const centerX = x + V_BADGE_WIDTH / 2;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.split(" ").slice(0, 2).join(" ");
  doc.text(name.substring(0, 12).toUpperCase(), centerX, contentY, { align: "center" });
  contentY += 5;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(employee.cargo.substring(0, 12), centerX, contentY, { align: "center" });
    contentY += 4;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(employee.setor.substring(0, 12).toUpperCase(), centerX, contentY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text(employee.cpf, x + V_BADGE_WIDTH / 2, y + V_BADGE_HEIGHT - 2, { align: "center" });
  }

  drawCutMarks(doc, x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT);
}

function drawVerticalMinimal(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  const headerColor = hexToRgb(options.customHeaderColor || options.template.headerColor);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT, 2, 2, "FD");

  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, V_BADGE_WIDTH, 3, 2, 2, "F");
  doc.rect(x, y + 2, V_BADGE_WIDTH, 1, "F");

  if (employee.empresa?.nome) {
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(employee.empresa.nome.substring(0, 16), x + V_BADGE_WIDTH / 2, y + 9, { align: "center" });
  }

  let contentY = y + 14;

  if (options.showPhoto) {
    const photoSize = 28;
    const photoX = x + (V_BADGE_WIDTH - photoSize) / 2;
    if (employeePhoto) {
      try {
        doc.addImage(employeePhoto, "JPEG", photoX, contentY, photoSize, photoSize);
      } catch {
        doc.setFillColor(245, 245, 248);
        doc.roundedRect(photoX, contentY, photoSize, photoSize, photoSize / 2, photoSize / 2, "F");
      }
    } else {
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(photoX, contentY, photoSize, photoSize, photoSize / 2, photoSize / 2, "F");
    }
    contentY += photoSize + 4;
  }

  // Name centered - larger with padding
  const centerX = x + V_BADGE_WIDTH / 2;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.split(" ").slice(0, 2).join(" ");
  doc.text(name.substring(0, 10).toUpperCase(), centerX, contentY, { align: "center" });
  contentY += 5;

  if (options.showCargo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(employee.cargo.substring(0, 10), centerX, contentY, { align: "center" });
    contentY += 4;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(employee.setor.substring(0, 10).toUpperCase(), centerX, contentY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(4);
    doc.setTextColor(160, 160, 160);
    doc.text(employee.cpf, x + V_BADGE_WIDTH / 2, y + V_BADGE_HEIGHT - 2, { align: "center" });
  }

  drawCutMarks(doc, x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT);
}

function drawVerticalCorporate(
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

  doc.setFillColor(250, 250, 252);
  doc.roundedRect(x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT, 2, 2, "F");

  // Top bar
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.roundedRect(x, y, V_BADGE_WIDTH, 4, 2, 2, "F");
  doc.rect(x, y + 2, V_BADGE_WIDTH, 2, "F");

  // Bottom bar
  doc.roundedRect(x, y + V_BADGE_HEIGHT - 4, V_BADGE_WIDTH, 4, 0, 0, "F");
  doc.roundedRect(x, y + V_BADGE_HEIGHT - 4, V_BADGE_WIDTH, 4, 2, 2, "F");

  // Company
  if (employee.empresa?.nome) {
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(employee.empresa.nome.substring(0, 14), x + V_BADGE_WIDTH / 2, y + 11, { align: "center" });
  }

  let contentY = y + 16;

  if (options.showPhoto) {
    const photoSize = 26;
    const photoX = x + (V_BADGE_WIDTH - photoSize) / 2;
    if (employeePhoto) {
      try {
        doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
        doc.setLineWidth(0.4);
        doc.rect(photoX, contentY, photoSize, photoSize, "D");
        doc.addImage(employeePhoto, "JPEG", photoX, contentY, photoSize, photoSize);
      } catch {
        drawPlaceholderIcon(doc, photoX, contentY, photoSize);
      }
    } else {
      drawPlaceholderIcon(doc, photoX, contentY, photoSize);
    }
    contentY += photoSize + 4;
  }

  // Name centered - larger with padding
  const centerX = x + V_BADGE_WIDTH / 2;
  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const name = employee.nome_completo.split(" ").slice(0, 2).join(" ");
  doc.text(name.substring(0, 10).toUpperCase(), centerX, contentY, { align: "center" });
  contentY += 5;

  if (options.showCargo) {
    doc.setTextColor(80, 80, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(employee.cargo.substring(0, 10), centerX, contentY, { align: "center" });
    contentY += 4;
  }

  if (options.showSector && employee.setor) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text(employee.setor.substring(0, 10).toUpperCase(), centerX, contentY, { align: "center" });
  }

  if (options.showCpf && employee.cpf) {
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.text(employee.cpf, x + V_BADGE_WIDTH / 2, y + V_BADGE_HEIGHT - 1, { align: "center" });
  }

  drawCutMarks(doc, x, y, V_BADGE_WIDTH, V_BADGE_HEIGHT);
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
  const isVertical = options.orientation === "vertical";

  if (isVertical) {
    switch (options.template.style) {
      case "modern":
        drawVerticalModern(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "classic":
        drawVerticalClassic(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "minimal":
        drawVerticalMinimal(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "corporate":
        drawVerticalCorporate(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
    }
  } else {
    switch (options.template.style) {
      case "modern":
        drawHorizontalModern(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "classic":
        drawHorizontalClassic(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "minimal":
        drawHorizontalMinimal(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
      case "corporate":
        drawHorizontalCorporate(doc, employee, x, y, options, employeePhoto, companyLogo);
        break;
    }
  }
}

export async function generateBadgesPDF(employees: EmployeeForBadge[], options: BadgeOptions): Promise<void> {
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

  const isVertical = options.orientation === "vertical";
  const badgeWidth = isVertical ? V_BADGE_WIDTH : H_BADGE_WIDTH;
  const badgeHeight = isVertical ? V_BADGE_HEIGHT : H_BADGE_HEIGHT;
  const badgesPerRow = isVertical ? V_BADGES_PER_ROW : H_BADGES_PER_ROW;
  const badgesPerColumn = isVertical ? V_BADGES_PER_COLUMN : H_BADGES_PER_COLUMN;
  const badgesPerPage = badgesPerRow * badgesPerColumn;

  const marginX = (PAGE_WIDTH - badgesPerRow * badgeWidth) / (badgesPerRow + 1);
  const marginY = (PAGE_HEIGHT - badgesPerColumn * badgeHeight) / (badgesPerColumn + 1);

  const totalPages = Math.ceil(employees.length / badgesPerPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    const startIdx = page * badgesPerPage;
    const endIdx = Math.min(startIdx + badgesPerPage, employees.length);

    for (let i = startIdx; i < endIdx; i++) {
      const employee = employees[i];
      const positionOnPage = i - startIdx;
      const col = positionOnPage % badgesPerRow;
      const row = Math.floor(positionOnPage / badgesPerRow);

      const x = marginX + col * (badgeWidth + marginX);
      const y = marginY + row * (badgeHeight + marginY);

      const employeePhoto = options.showPhoto && employee.foto_url ? imageCache.get(employee.foto_url) || null : null;
      const companyLogo = employee.empresa?.logo_url ? imageCache.get(employee.empresa.logo_url) || null : null;

      drawBadge(doc, employee, x, y, options, employeePhoto, companyLogo);
    }
  }

  doc.save(`crachas_${options.orientation}_${new Date().toISOString().split("T")[0]}.pdf`);
}
