import { backupPdfToDrive } from "@/hooks/useDriveBackup";

/**
 * Salva o PDF localmente (download) E dispara backup no Google Drive em background.
 * Não bloqueia caso o backup falhe.
 */
export function saveAndBackup(
  doc: any,
  fileName: string,
  tipo: string,
  opts?: { employee_id?: string | null; subpasta?: string }
) {
  try {
    doc.save(fileName);
  } finally {
    try {
      const blob: Blob = doc.output("blob");
      // fire-and-forget
      void backupPdfToDrive({
        tipo,
        nome_arquivo: fileName,
        pdfBlob: blob,
        employee_id: opts?.employee_id ?? null,
        subpasta: opts?.subpasta,
      });
    } catch (e) {
      console.warn("[saveAndBackup] backup falhou:", e);
    }
  }
}
