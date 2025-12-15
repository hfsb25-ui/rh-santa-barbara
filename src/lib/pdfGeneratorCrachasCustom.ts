import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

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

interface BadgeElement {
  id: string;
  type: 'text' | 'image' | 'placeholder';
  placeholder?: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  textAlign?: string;
}

interface BadgeTemplateConfig {
  elements: BadgeElement[];
  backgroundColor?: string;
}

interface CustomTemplate {
  id: string;
  nome: string;
  background_url: string | null;
  configuracao_json: BadgeTemplateConfig;
  orientacao: 'horizontal' | 'vertical';
  largura: number;
  altura: number;
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Load image as base64
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

// Replace placeholder with actual value
function replacePlaceholder(placeholder: string, employee: EmployeeForBadge): string {
  const firstName = employee.nome_completo.split(' ')[0];
  
  switch (placeholder) {
    case '{{NOME}}':
      return firstName;
    case '{{CARGO}}':
      return employee.cargo || '';
    case '{{SETOR}}':
      return employee.setor || '';
    case '{{CPF}}':
      return employee.cpf ? employee.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
    case '{{EMPRESA}}':
      return employee.empresa?.nome || '';
    default:
      return placeholder;
  }
}

// Map font family to jsPDF supported fonts
function mapFontFamily(fontFamily: string): string {
  const fontMap: Record<string, string> = {
    'Arial': 'helvetica',
    'Helvetica': 'helvetica',
    'Times New Roman': 'times',
    'Georgia': 'times',
    'Courier New': 'courier',
    'Verdana': 'helvetica',
    'Impact': 'helvetica',
  };
  return fontMap[fontFamily] || 'helvetica';
}

export async function generateCustomBadgesPDF(
  employees: EmployeeForBadge[],
  template: CustomTemplate
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Badge dimensions in mm
  const badgeWidth = template.largura;
  const badgeHeight = template.altura;
  
  // Calculate layout
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  
  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin;
  
  const cols = Math.floor(availableWidth / badgeWidth);
  const rows = Math.floor(availableHeight / badgeHeight);
  const badgesPerPage = cols * rows;
  
  const totalWidth = cols * badgeWidth;
  const totalHeight = rows * badgeHeight;
  const startX = margin + (availableWidth - totalWidth) / 2;
  const startY = margin + (availableHeight - totalHeight) / 2;

  // Canvas scale factor (editor uses 400x250 or 250x400, we need to scale to mm)
  const canvasWidth = template.orientacao === 'horizontal' ? 400 : 250;
  const canvasHeight = template.orientacao === 'horizontal' ? 250 : 400;
  const scaleX = badgeWidth / canvasWidth;
  const scaleY = badgeHeight / canvasHeight;

  // Preload images
  const backgroundImage = template.background_url 
    ? await loadImageAsBase64(template.background_url) 
    : null;
  
  const employeeImages: Map<string, string | null> = new Map();
  const companyLogos: Map<string, string | null> = new Map();
  
  for (const emp of employees) {
    if (emp.foto_url) {
      employeeImages.set(emp.id, await loadImageAsBase64(emp.foto_url));
    }
    if (emp.empresa?.logo_url && !companyLogos.has(emp.empresa.logo_url)) {
      companyLogos.set(emp.empresa.logo_url, await loadImageAsBase64(emp.empresa.logo_url));
    }
  }

  const config = template.configuracao_json;

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const pageIndex = Math.floor(i / badgesPerPage);
    const positionOnPage = i % badgesPerPage;
    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);

    if (i > 0 && positionOnPage === 0) {
      doc.addPage();
    }

    const x = startX + col * badgeWidth;
    const y = startY + row * badgeHeight;

    // Draw badge background
    if (config.backgroundColor) {
      const bg = hexToRgb(config.backgroundColor);
      doc.setFillColor(bg.r, bg.g, bg.b);
      doc.rect(x, y, badgeWidth, badgeHeight, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, badgeWidth, badgeHeight, 'F');
    }

    // Draw background image
    if (backgroundImage) {
      try {
        doc.addImage(backgroundImage, 'JPEG', x, y, badgeWidth, badgeHeight);
      } catch (e) {
        console.error('Error adding background image:', e);
      }
    }

    // Draw border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(x, y, badgeWidth, badgeHeight, 'S');

    // Draw elements
    for (const element of config.elements || []) {
      const elemX = x + element.left * scaleX;
      const elemY = y + element.top * scaleY;

      if (element.type === 'text' || element.type === 'placeholder') {
        const text = element.placeholder 
          ? replacePlaceholder(element.placeholder, employee)
          : '';
        
        if (text) {
          const fontSize = (element.fontSize || 16) * Math.min(scaleX, scaleY) * 2.5;
          const fontFamily = mapFontFamily(element.fontFamily || 'Arial');
          const fontStyle = element.fontWeight === 'bold' ? 'bold' : 'normal';
          
          doc.setFont(fontFamily, fontStyle);
          doc.setFontSize(fontSize);
          
          if (element.fill) {
            const color = hexToRgb(element.fill);
            doc.setTextColor(color.r, color.g, color.b);
          } else {
            doc.setTextColor(0, 0, 0);
          }

          const elemWidth = (element.width || 150) * scaleX;
          let textX = elemX;
          let align: 'left' | 'center' | 'right' = 'left';
          
          if (element.textAlign === 'center') {
            align = 'center';
            textX = elemX + elemWidth / 2;
          } else if (element.textAlign === 'right') {
            align = 'right';
            textX = elemX + elemWidth;
          }

          doc.text(text, textX, elemY + fontSize * 0.35, { align });
        }
      } else if (element.type === 'image') {
        const elemWidth = (element.width || 80) * scaleX;
        const elemHeight = (element.height || 80) * scaleY;

        if (element.placeholder === 'foto') {
          const photoBase64 = employeeImages.get(employee.id);
          if (photoBase64) {
            try {
              doc.addImage(photoBase64, 'JPEG', elemX, elemY, elemWidth, elemHeight);
            } catch (e) {
              // Draw placeholder circle
              doc.setFillColor(229, 231, 235);
              doc.circle(elemX + elemWidth / 2, elemY + elemHeight / 2, elemWidth / 2, 'F');
            }
          } else {
            // Draw placeholder circle
            doc.setFillColor(229, 231, 235);
            doc.circle(elemX + elemWidth / 2, elemY + elemHeight / 2, elemWidth / 2, 'F');
          }
        } else if (element.placeholder === 'logo') {
          const logoUrl = employee.empresa?.logo_url;
          const logoBase64 = logoUrl ? companyLogos.get(logoUrl) : null;
          if (logoBase64) {
            try {
              doc.addImage(logoBase64, 'JPEG', elemX, elemY, elemWidth, elemHeight);
            } catch (e) {
              // Draw placeholder rectangle
              doc.setFillColor(229, 231, 235);
              doc.rect(elemX, elemY, elemWidth, elemHeight, 'F');
            }
          } else {
            // Draw placeholder rectangle
            doc.setFillColor(229, 231, 235);
            doc.rect(elemX, elemY, elemWidth, elemHeight, 'F');
          }
        }
      }
    }
  }

  // Save the PDF
  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`crachas_personalizado_${timestamp}.pdf`);
}
