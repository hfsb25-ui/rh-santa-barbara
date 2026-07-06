// Parser de holerites usando texto NATIVO do PDF (sem IA, sem OCR).
// Funciona quando o PDF tem camada de texto (não é imagem escaneada).

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore worker como URL bundled pelo Vite
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { splitHolerites, parseOneHolerite, enriquecer, type OcrHolerite, type OcrProgress } from "./holeriteOcrParser";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

// Extrai texto da página preservando linhas (agrupa items por Y aproximado)
async function extractPageText(pdf: any, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const tc = await page.getTextContent();
  // Agrupa por linha usando coordenada Y (transform[5])
  const lines = new Map<number, { x: number; s: string }[]>();
  for (const item of tc.items as any[]) {
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    // bucket de 2px para tolerar variação
    const key = Math.round(y / 2) * 2;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key)!.push({ x, s: item.str });
  }
  // Y maior = topo no PDF; ordena desc
  const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
  const out: string[] = [];
  for (const y of sortedY) {
    const parts = lines.get(y)!.sort((a, b) => a.x - b.x);
    // monta linha com espaços proporcionais ao gap em X
    let line = "";
    let prevEndX = -Infinity;
    for (const p of parts) {
      if (prevEndX !== -Infinity) {
        const gap = p.x - prevEndX;
        // ~3px de gap = 1 espaço; valores grandes viram múltiplos espaços (preserva colunas)
        const spaces = Math.max(1, Math.min(20, Math.round(gap / 3)));
        line += " ".repeat(spaces);
      }
      line += p.s;
      prevEndX = p.x + (p.s.length * 5); // estimativa
    }
    out.push(line);
  }
  return out.join("\n");
}

export async function processarHoleritesTexto(
  file: File,
  defaults: { mes?: number; ano?: number; empresa_id?: string | null },
  onProgress: (p: OcrProgress) => void
): Promise<OcrHolerite[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf: any = await (pdfjsLib as any).getDocument({
    data: arrayBuffer,
    stopAtErrors: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  } as any).promise;
  const total = pdf.numPages;

  const holerites: OcrHolerite[] = [];
  const avisos: string[] = [];
  let textoTotal = 0;
  for (let p = 1; p <= total; p++) {
    onProgress({ fase: "parse", pagina: p, total, msg: `Lendo página ${p}/${total}...` });
    let pageText = "";
    try {
      pageText = await extractPageText(pdf, p);
    } catch (e: any) {
      console.warn(`[holeriteTextParser] página ${p} falhou:`, e?.message);
      avisos.push(`Página ${p}: ${e?.message || "erro ao ler"}`);
      continue;
    }
    textoTotal += pageText.trim().length;
    const segs = splitHolerites(pageText);
    for (const seg of segs) {
      const h = parseOneHolerite(seg, p);
      if (h) {
        if (!h.mes && defaults.mes) h.mes = defaults.mes;
        if (!h.ano && defaults.ano) h.ano = defaults.ano;
        holerites.push(h);
      }
    }
  }

  if (textoTotal < 50) {
    const msgExtra = avisos.length ? ` (${avisos.length} página(s) com erro: ${avisos.slice(0, 2).join("; ")})` : "";
    throw new Error(`O PDF não tem texto extraível${msgExtra}. Pode estar corrompido ou ser imagem/escaneado. Use OCR ou peça outro PDF.`);
  }
  if (avisos.length) {
    console.warn(`[holeriteTextParser] ${avisos.length} página(s) com erro mas ${holerites.length} holerite(s) extraído(s)`);
  }

  onProgress({ fase: "match", pagina: total, total, msg: "Cruzando com cadastros..." });
  await enriquecer(holerites, defaults.empresa_id || null);

  // Descarta segmentos que não correspondem a colaboradores cadastrados (lixo de parsing)
  const validos = holerites.filter((h) => h.status !== "sem_cpf" && h.status !== "cpf_nao_encontrado");
  const removidosLixo = holerites.length - validos.length;
  if (removidosLixo > 0) console.log(`[holeriteTextParser] ${removidosLixo} entrada(s) sem CPF cadastrado descartada(s)`);

  // Deduplica vias iguais do MESMO funcionário no MESMO período (PDFs geralmente têm 2 vias).
  // Feito só APÓS enriquecer, para não colapsar holerites diferentes cujo CPF não pôde ser lido.
  const seen = new Map<string, OcrHolerite>();
  for (const h of validos) {
    const key = [h.employee_id || "?", h.mes ?? "?", h.ano ?? "?", h.tipo_folha || "salario"].join("|");
    const prev = seen.get(key);
    if (!prev || (h.valor_liquido || 0) > (prev.valor_liquido || 0)) seen.set(key, h);
  }
  const unicos = Array.from(seen.values());
  const removidosDup = validos.length - unicos.length;
  if (removidosDup > 0) console.log(`[holeriteTextParser] ${removidosDup} via(s) duplicada(s) removida(s)`);

  onProgress({ fase: "done", pagina: total, total, msg: `${unicos.length} holerite(s) processado(s)` });
  return unicos;
}
