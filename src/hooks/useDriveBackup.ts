import { supabase } from "@/integrations/supabase/client";

/**
 * Faz backup não-bloqueante de um PDF no Google Drive da empresa.
 * Se falhar, apenas loga no console — não interrompe o fluxo do usuário.
 */
export async function backupPdfToDrive(params: {
  tipo: string; // ex: "Holerites", "Contratos", "TACs", "Desligamentos", "EPIs", "Crachas", "Etiquetas", "Encaminhamentos", "Ponto"
  nome_arquivo: string;
  pdfBlob: Blob;
  employee_id?: string | null;
  subpasta?: string; // ex: "2026-06"
}): Promise<void> {
  try {
    const base64 = await blobToBase64(params.pdfBlob);
    const { data, error } = await supabase.functions.invoke("drive-backup-upload", {
      body: {
        action: "upload",
        tipo: params.tipo,
        nome_arquivo: params.nome_arquivo,
        employee_id: params.employee_id || null,
        subpasta: params.subpasta,
        pdf_base64: base64,
      },
    });
    if (error) console.warn("[DriveBackup] falhou:", error);
    else if ((data as any)?.skipped) console.log("[DriveBackup] desativado");
    else console.log("[DriveBackup] enviado:", (data as any)?.drive_url);
  } catch (e) {
    console.warn("[DriveBackup] erro:", e);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
