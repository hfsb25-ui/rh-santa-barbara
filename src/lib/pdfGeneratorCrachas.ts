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

interface BadgeOptions {
  showCpf: boolean;
  showSector: boolean;
  showCompanyLogo: boolean;
}

const BADGE_WIDTH = 85; // mm
const BADGE_HEIGHT = 54; // mm
const BADGES_PER_ROW = 2;
const BADGES_PER_COLUMN = 4;
const BADGES_PER_PAGE = BADGES_PER_ROW * BADGES_PER_COLUMN;

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm

const MARGIN_X = (PAGE_WIDTH - (BADGES_PER_ROW * BADGE_WIDTH)) / (BADGES_PER_ROW + 1);
const MARGIN_Y = (PAGE_HEIGHT - (BADGES_PER_COLUMN * BADGE_HEIGHT)) / (BADGES_PER_COLUMN + 1);

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

function drawBadge(
  doc: jsPDF,
  employee: EmployeeForBadge,
  x: number,
  y: number,
  options: BadgeOptions,
  employeePhoto: string | null,
  companyLogo: string | null
) {
  // Badge border with rounded corners
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 3, 3);

  // Header bar (company color area)
  doc.setFillColor(59, 130, 246); // Blue color
  doc.roundedRect(x, y, BADGE_WIDTH, 12, 3, 3, "F");
  doc.rect(x, y + 6, BADGE_WIDTH, 6, "F"); // Square bottom of header

  // Company name or logo in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  
  if (options.showCompanyLogo && companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", x + 3, y + 2, 20, 8);
      if (employee.empresa?.nome) {
        doc.text(employee.empresa.nome.substring(0, 25), x + 25, y + 7);
      }
    } catch {
      doc.text(employee.empresa?.nome || "CRACHÁ", x + BADGE_WIDTH / 2, y + 7, { align: "center" });
    }
  } else {
    doc.text(employee.empresa?.nome || "CRACHÁ", x + BADGE_WIDTH / 2, y + 7, { align: "center" });
  }

  // Photo area
  const photoX = x + 5;
  const photoY = y + 15;
  const photoSize = 22;

  doc.setFillColor(240, 240, 240);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "F");

  if (employeePhoto) {
    try {
      doc.addImage(employeePhoto, "JPEG", photoX, photoY, photoSize, photoSize);
    } catch {
      // Draw placeholder icon
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(16);
      doc.text("👤", photoX + photoSize / 2, photoY + photoSize / 2 + 4, { align: "center" });
    }
  } else {
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(16);
    doc.text("👤", photoX + photoSize / 2, photoY + photoSize / 2 + 4, { align: "center" });
  }

  // Employee info
  const infoX = photoX + photoSize + 5;
  const infoWidth = BADGE_WIDTH - photoSize - 15;

  // Name
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  
  const name = employee.nome_completo.length > 20 
    ? employee.nome_completo.substring(0, 20) + "..." 
    : employee.nome_completo;
  doc.text(name, infoX, photoY + 5);

  // Role
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const cargo = employee.cargo.length > 22 
    ? employee.cargo.substring(0, 22) + "..." 
    : employee.cargo;
  doc.text(cargo, infoX, photoY + 11);

  // Sector
  if (options.showSector && employee.setor) {
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    const setor = employee.setor.length > 25 
      ? employee.setor.substring(0, 25) + "..." 
      : employee.setor;
    doc.text(setor, infoX, photoY + 16);
  }

  // CPF at bottom
  if (options.showCpf && employee.cpf) {
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(`CPF: ${employee.cpf}`, x + BADGE_WIDTH / 2, y + BADGE_HEIGHT - 4, { align: "center" });
  }

  // Cut line markers (small marks at corners)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  const markLen = 2;
  
  // Top-left
  doc.line(x - markLen, y, x, y);
  doc.line(x, y - markLen, x, y);
  
  // Top-right
  doc.line(x + BADGE_WIDTH, y, x + BADGE_WIDTH + markLen, y);
  doc.line(x + BADGE_WIDTH, y - markLen, x + BADGE_WIDTH, y);
  
  // Bottom-left
  doc.line(x - markLen, y + BADGE_HEIGHT, x, y + BADGE_HEIGHT);
  doc.line(x, y + BADGE_HEIGHT, x, y + BADGE_HEIGHT + markLen);
  
  // Bottom-right
  doc.line(x + BADGE_WIDTH, y + BADGE_HEIGHT, x + BADGE_WIDTH + markLen, y + BADGE_HEIGHT);
  doc.line(x + BADGE_WIDTH, y + BADGE_HEIGHT, x + BADGE_WIDTH, y + BADGE_HEIGHT + markLen);
}

export async function generateBadgesPDF(
  employees: EmployeeForBadge[],
  options: BadgeOptions = { showCpf: true, showSector: true, showCompanyLogo: true }
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Pre-load all images
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
