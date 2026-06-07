import { supabase } from "@/integrations/supabase/client";
import type { HoleriteAssinaturaInfo } from "./pdfGeneratorHolerite";

/**
 * Carrega os dados da assinatura digital de um holerite (se existir)
 * para embutir no PDF do holerite (assinatura + QR de validação).
 */
export async function carregarAssinaturaHolerite(
  folhaPagamentoId: string,
): Promise<HoleriteAssinaturaInfo | null> {
  const { data } = await supabase
    .from("holerite_assinaturas")
    .select("status, protocolo, data_assinatura, assinatura_imagem_path")
    .eq("folha_pagamento_id", folhaPagamentoId)
    .maybeSingle();

  if (!data || data.status !== "assinado" || !data.assinatura_imagem_path) return null;

  const { data: signed } = await supabase.storage
    .from("holerites-assinados")
    .createSignedUrl(data.assinatura_imagem_path, 300);

  if (!signed?.signedUrl) return null;

  const res = await fetch(signed.signedUrl);
  const blob = await res.blob();
  const assinatura_data_url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  return {
    protocolo: data.protocolo,
    data_assinatura: data.data_assinatura,
    assinatura_data_url,
    validacao_url: `${window.location.origin}/validar-holerite/${data.protocolo}`,
  };
}
