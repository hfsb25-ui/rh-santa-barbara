// OCR + parser para holerites brasileiros (sem IA)
// - Renderiza cada página do PDF com pdfjs-dist
// - Roda OCR (tesseract.js, idioma português)
// - Extrai os holerites do texto usando expressões regulares
// - Faz matching com employees / empresas / variáveis de folha (Supabase)

import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore worker como URL bundled pelo Vite
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract, { createWorker } from "tesseract.js";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export interface OcrRubrica {
  codigo: string | null;
  descricao: string;
  valor: number;
}

export interface OcrHolerite {
  pagina: number;
  cpf: string | null;
  cpf_raw?: string;
  nome: string;
  mes: number | null;
  ano: number | null;
  tipo_folha: string;
  empresa_nome: string | null;
  empresa_id: string | null;
  employee_id: string | null;
  employee_nome: string | null;
  valor_bruto: number;
  descontos_total: number;
  valor_liquido: number;
  proventos: any[];
  descontos: any[];
  status: "ok" | "sem_cpf" | "cpf_nao_encontrado" | "ja_existe" | "sem_periodo";
}

export interface OcrProgress {
  fase: "render" | "ocr" | "parse" | "match" | "done";
  pagina: number;
  total: number;
  msg: string;
}

function parseValorBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function cleanCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? d : null;
}

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Renderiza uma página específica do PDF em um data URL PNG (escala alta p/ OCR)
async function renderPage(pdf: any, pageNumber: number, scale = 2.2): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

// ============= Parser =============
// Layout esperado (cada holerite):
//   Linha 1: <razao social> <codigo>/<ano>  Mensal
//   "EMPREENDIMENTOS ..." linha de endereço
//   "CNPJ: 07.522.656/0001-86  CPF: 123.869.867-92"
//   Cabeçalho: Cadastro Nome do Funcionário CBO Empresa Local Departamento
//   Linha com matricula + nome em UPPERCASE + códigos
//   Cabeçalho: Eu Descrição Referência Provento Desconto
//   ...linhas de rubricas...
//   Total <valor_provento> <valor_desconto>
//   Total Líquido <valor>

function findCpfs(text: string): Array<{ cpf: string; idx: number }> {
  const re = /(\d{3}\s*\.?\s*\d{3}\s*\.?\s*\d{3}\s*[-\.]?\s*\d{2})/g;
  const out: Array<{ cpf: string; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 11) out.push({ cpf: digits, idx: m.index });
  }
  return out;
}

function findMesAno(text: string): { mes: number | null; ano: number | null } {
  // Procura padrão "DD/YYYY" próximo a "Mensal" ou cabeçalho
  const re1 = /\b(0?[1-9]|1[0-2])\s*\/\s*(20\d{2})\b/;
  const m = text.match(re1);
  if (m) return { mes: Number(m[1]), ano: Number(m[2]) };
  // procura "Data Admissão" e usa data próxima — fallback
  const m2 = text.match(/Compet[eê]ncia[:\s]+(\d{2})\/(\d{4})/i);
  if (m2) return { mes: Number(m2[1]), ano: Number(m2[2]) };
  return { mes: null, ano: null };
}

function findEmpresa(text: string): string | null {
  // Linha que começa com "EMPREENDIMENTOS" ou contém razão social
  const lines = text.split(/\r?\n/);
  for (const l of lines.slice(0, 6)) {
    const t = l.trim();
    if (!t) continue;
    // Heurística: linha em maiúsculas com mais de 8 chars, sem dígitos demais
    if (/[A-Z]{4,}/.test(t) && t.length > 10 && t.length < 80 && !/^CPF|CNPJ|Demonstr/i.test(t)) {
      return t.replace(/\s+/g, " ").replace(/[^\w\sÀ-ÿ.\-&\/]/g, "").trim();
    }
  }
  return null;
}

function findNome(text: string, afterIdx: number): string | null {
  // Procura uma linha em UPPERCASE após o índice (geralmente após o número do cadastro)
  const slice = text.slice(afterIdx, afterIdx + 800);
  const lines = slice.split(/\r?\n/);
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    // Remove leading dígitos+espaços
    const noLead = t.replace(/^[\d\s\.\-\|]+/, "").trim();
    // Nome: ≥2 palavras em maiúsculas
    const upper = noLead.replace(/[^A-ZÀ-Ý\s]/g, "").trim();
    const words = upper.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length >= 2 && upper.length >= 8 && upper.length < 60) {
      return words.join(" ");
    }
  }
  return null;
}

// Divide o texto da página em segmentos, um por holerite (baseado em ocorrências de CPF)
function splitHolerites(pageText: string): string[] {
  const cpfs = findCpfs(pageText);
  if (cpfs.length === 0) return [pageText];
  if (cpfs.length === 1) return [pageText];
  const segs: string[] = [];
  for (let i = 0; i < cpfs.length; i++) {
    // Começa um pouco antes do CPF para pegar a linha da empresa
    const startBefore = Math.max(0, cpfs[i].idx - 400);
    const start = i === 0 ? 0 : Math.max(cpfs[i - 1].idx + 50, startBefore);
    const end = i === cpfs.length - 1 ? pageText.length : cpfs[i + 1].idx - 50;
    segs.push(pageText.slice(start, end));
  }
  return segs;
}

// Tenta extrair tabela de rubricas. Cada linha relevante segue padrão:
//   <codigo?> <descricao com palavras> <ref?> <valor_provento?> <valor_desconto?>
// O OCR tende a separar colunas com múltiplos espaços; usamos isso.
function parseRubricas(segment: string): { proventos: OcrRubrica[]; descontos: OcrRubrica[] } {
  const proventos: OcrRubrica[] = [];
  const descontos: OcrRubrica[] = [];
  const lines = segment.split(/\r?\n/);

  // localiza início da tabela: linha com "Descrição" e "Provento" "Desconto"
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/Descri[cç][aã]o/i.test(l) && /Provento/i.test(l) && /Desconto/i.test(l)) {
      startIdx = i + 1;
    }
    if (startIdx >= 0 && /^\s*Total\b/i.test(l) && endIdx < 0) {
      endIdx = i;
      break;
    }
  }
  if (startIdx < 0) {
    startIdx = 0;
    endIdx = lines.length;
  }
  if (endIdx < 0) endIdx = lines.length;

  // Regex de valor monetário pt-BR
  const valRe = /([\d]{1,3}(?:\.[\d]{3})*,\d{2}|\d+,\d{2})/g;

  for (let i = startIdx; i < endIdx; i++) {
    const raw = lines[i];
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^(Banco|Ag[eê]ncia|PAGAR|Sal[aá]rio Base|Sal C[aá]lc|Base C[aá]lc|FGTS|Faixa IRRF|Recebi|Assinatura|CNPJ|CPF|Cadastro|Nome do)/i.test(trimmed)) continue;
    const valores: { v: number; idxEnd: number }[] = [];
    let mm: RegExpExecArray | null;
    const localRe = new RegExp(valRe.source, "g");
    while ((mm = localRe.exec(trimmed)) !== null) {
      valores.push({ v: parseValorBR(mm[1]), idxEnd: mm.index + mm[0].length });
    }
    if (valores.length === 0) continue;

    // Pega a porção antes do primeiro valor como "descrição"
    const firstValIdx = trimmed.search(valRe);
    let descricaoBruta = firstValIdx > 0 ? trimmed.slice(0, firstValIdx).trim() : "";
    if (!descricaoBruta) continue;

    // Tenta separar código (primeiros tokens numéricos curtos) e descrição
    const tokens = descricaoBruta.split(/\s+/);
    let codigo: string | null = null;
    if (tokens.length > 1 && /^\d{1,4}$/.test(tokens[0])) {
      codigo = tokens.shift()!;
    }
    const descricao = tokens.join(" ").replace(/[|]/g, "").trim();
    if (!descricao || descricao.length < 2) continue;
    // remove descrições puramente numéricas/lixo
    if (!/[A-Za-zÀ-ÿ]{2}/.test(descricao)) continue;

    // Heurística: a posição do último valor define se é provento ou desconto.
    // Holerite tem duas colunas (Provento | Desconto), última coluna = desconto.
    // Se houver 2 valores na linha, assumimos provento+desconto não existe (raro), pegamos último como dominante.
    const ultimo = valores[valores.length - 1];
    // Distância do final da linha ajuda: se está perto do final (>60% da largura), é desconto.
    const ratio = ultimo.idxEnd / Math.max(trimmed.length, 1);
    const isDesconto = ratio > 0.78 && valores.length >= 1;

    // Caso a linha contenha 2 valores distintos (provento E desconto na mesma linha), tratamos os dois
    if (valores.length >= 2) {
      const v1 = valores[valores.length - 2];
      const v2 = valores[valores.length - 1];
      const r2 = v2.idxEnd / Math.max(trimmed.length, 1);
      if (r2 > 0.78) {
        // último é desconto; penúltimo pode ser referência (não valor) ou provento
        // Se diferença de magnitude pequena, considerar provento+desconto
        if (Math.abs(v1.v - v2.v) > 0.01 && v1.v > 1) {
          // ambíguo — adicionamos só o desconto
          descontos.push({ codigo, descricao, valor: v2.v });
          continue;
        }
        descontos.push({ codigo, descricao, valor: v2.v });
        continue;
      }
    }

    if (isDesconto) {
      descontos.push({ codigo, descricao, valor: ultimo.v });
    } else {
      proventos.push({ codigo, descricao, valor: ultimo.v });
    }
  }

  return { proventos, descontos };
}

function parseTotais(segment: string): { bruto: number; desc: number; liquido: number } {
  let bruto = 0, desc = 0, liquido = 0;
  // Linha "Total ... <bruto> <desc>"
  const lines = segment.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^\s*Total\s+[^\d]*([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s*$/i);
    if (m) {
      bruto = parseValorBR(m[1]);
      desc = parseValorBR(m[2]);
    }
    const ml = l.match(/Total\s+L[ií]quido[^\d]*([\d\.]+,\d{2})/i);
    if (ml) liquido = parseValorBR(ml[1]);
  }
  return { bruto, desc, liquido };
}

function parseOneHolerite(segment: string, pagina: number): OcrHolerite | null {
  const cpfs = findCpfs(segment);
  const cpf = cpfs[0]?.cpf || null;
  const cpfPos = cpfs[0]?.idx ?? 0;
  const { mes, ano } = findMesAno(segment);
  const empresa_nome = findEmpresa(segment);
  const nome = findNome(segment, cpfPos) || "";
  const { proventos, descontos } = parseRubricas(segment);
  const totais = parseTotais(segment);

  const valor_bruto = totais.bruto || proventos.reduce((s, p) => s + p.valor, 0);
  const descontos_total = totais.desc || descontos.reduce((s, d) => s + d.valor, 0);
  const valor_liquido = totais.liquido || Math.max(0, valor_bruto - descontos_total);

  // descarta segmentos sem dado mínimo
  if (!cpf && !nome && proventos.length === 0 && descontos.length === 0) return null;

  return {
    pagina,
    cpf,
    cpf_raw: cpf || undefined,
    nome: (nome || "").toUpperCase(),
    mes,
    ano,
    tipo_folha: "salario",
    empresa_nome,
    empresa_id: null,
    employee_id: null,
    employee_nome: null,
    valor_bruto,
    descontos_total,
    valor_liquido,
    proventos,
    descontos,
    status: "ok",
  };
}

// =============== Pipeline público ===============
export async function processarHoleritesOCR(
  file: File,
  defaults: { mes?: number; ano?: number; empresa_id?: string | null },
  onProgress: (p: OcrProgress) => void
): Promise<OcrHolerite[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf: any = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  const total = pdf.numPages;

  onProgress({ fase: "render", pagina: 0, total, msg: "Carregando OCR (idioma português)..." });
  const worker = await createWorker("por", 1, {
    logger: () => {},
  } as any);

  const holerites: OcrHolerite[] = [];
  try {
    for (let p = 1; p <= total; p++) {
      onProgress({ fase: "render", pagina: p, total, msg: `Renderizando página ${p}/${total}...` });
      const dataUrl = await renderPage(pdf, p);

      onProgress({ fase: "ocr", pagina: p, total, msg: `Lendo texto da página ${p}/${total} (OCR)...` });
      const { data } = await worker.recognize(dataUrl);
      const pageText = data.text || "";

      onProgress({ fase: "parse", pagina: p, total, msg: `Interpretando holerites da página ${p}/${total}...` });
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
  } finally {
    await worker.terminate();
  }

  onProgress({ fase: "match", pagina: total, total, msg: "Cruzando com cadastros (funcionários, empresas, variáveis)..." });

  await enriquecer(holerites, defaults.empresa_id || null);

  // Descarta APENAS lixo puro: sem CPF válido OU (CPF não encontrado E totalmente zerado, sem rubricas).
  // Assim colaboradores reais não cadastrados continuam aparecendo, e holerites distintos
  // do mesmo funcionário (adiantamento, férias, 13º, complementar) NÃO são removidos.
  const validos = holerites.filter((h) => {
    if (h.status === "sem_cpf") return false;
    if (h.status === "cpf_nao_encontrado") {
      const semValor = (h.valor_bruto || 0) === 0 && (h.valor_liquido || 0) === 0 && (h.descontos_total || 0) === 0;
      const semRubricas = (h.proventos?.length || 0) === 0 && (h.descontos?.length || 0) === 0;
      if (semValor && semRubricas) return false;
    }
    return true;
  });
  const removidosLixo = holerites.length - validos.length;
  if (removidosLixo > 0) console.log(`[holeriteOcrParser] ${removidosLixo} entrada(s) de lixo descartada(s)`);

  // Deduplica SOMENTE vias 100% idênticas (mesmo funcionário, período E valores exatos).
  // Holerites distintos com valores diferentes NÃO são colapsados.
  const seen = new Map<string, OcrHolerite>();
  for (const h of validos) {
    const key = [
      h.employee_id || h.cpf || h.nome || "?",
      h.mes ?? "?", h.ano ?? "?",
      h.tipo_folha || "salario",
      Math.round((h.valor_bruto || 0) * 100),
      Math.round((h.valor_liquido || 0) * 100),
      Math.round((h.descontos_total || 0) * 100),
      (h.proventos?.length || 0),
      (h.descontos?.length || 0),
    ].join("|");
    if (!seen.has(key)) seen.set(key, h);
  }
  const unicos = Array.from(seen.values());
  const removidosDup = validos.length - unicos.length;
  if (removidosDup > 0) console.log(`[holeriteOcrParser] ${removidosDup} via(s) idêntica(s) removida(s)`);

  onProgress({ fase: "done", pagina: total, total, msg: `${unicos.length} holerite(s) processado(s)` });
  return unicos;
}

export { splitHolerites, parseOneHolerite };
export async function enriquecer(holerites: OcrHolerite[], empresaDefault: string | null) {
  const [{ data: employees }, { data: variaveis }, { data: empresas }] = await Promise.all([
    supabase.from("employees").select("id, nome_completo, cpf, empresa_id").not("cpf", "is", null),
    supabase.from("variaveis_folha").select("id, nome, codigo, tipo, empresa_id").eq("ativo", true),
    supabase.from("empresas").select("id, nome"),
  ]);

  const empByCpf = new Map<string, any>();
  (employees || []).forEach((e: any) => {
    const c = cleanCpf(e.cpf);
    if (c) empByCpf.set(c, e);
  });

  const empByNorm = new Map<string, any>();
  (empresas || []).forEach((e: any) => empByNorm.set(normalizeStr(e.nome), e));

  function findVariavel(rub: { codigo?: string | null; descricao?: string | null }, tipo: "provento" | "desconto", empresaId: string | null) {
    const pool = (variaveis || []).filter((v: any) => v.tipo === tipo && (!v.empresa_id || v.empresa_id === empresaId));
    if (rub.codigo) {
      const byCode = pool.find((v: any) => (v.codigo || "").toLowerCase() === String(rub.codigo).toLowerCase());
      if (byCode) return byCode;
    }
    if (rub.descricao) {
      const t = normalizeStr(rub.descricao);
      const exact = pool.find((v: any) => normalizeStr(v.nome) === t);
      if (exact) return exact;
      const partial = pool.find((v: any) => normalizeStr(v.nome).includes(t) || t.includes(normalizeStr(v.nome)));
      if (partial) return partial;
    }
    return null;
  }

  for (const h of holerites) {
    const employee = h.cpf ? empByCpf.get(h.cpf) : null;
    let empresaId: string | null = null;
    if (h.empresa_nome) {
      const n = normalizeStr(h.empresa_nome);
      const found = empByNorm.get(n) || Array.from(empByNorm.entries()).find(([k]) => k.includes(n) || n.includes(k))?.[1];
      if (found) empresaId = found.id;
    }
    if (!empresaId && employee?.empresa_id) empresaId = employee.empresa_id;
    if (!empresaId) empresaId = empresaDefault;

    h.empresa_id = empresaId;
    h.employee_id = employee?.id || null;
    h.employee_nome = employee?.nome_completo || null;

    // duplicidade
    let jaExiste = false;
    if (employee && h.mes && h.ano) {
      const { data: existing } = await supabase
        .from("folha_pagamento")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("mes", h.mes)
        .eq("ano", h.ano)
        .eq("tipo_folha", h.tipo_folha || "salario")
        .maybeSingle();
      if (existing) jaExiste = true;
    }

    h.proventos = h.proventos.map((p: any) => {
      const v = findVariavel(p, "provento", empresaId);
      return { ...p, variavel_id: v?.id || null, variavel_nome: v?.nome || null };
    });
    h.descontos = h.descontos.map((d: any) => {
      const v = findVariavel(d, "desconto", empresaId);
      return { ...d, variavel_id: v?.id || null, variavel_nome: v?.nome || null };
    });

    if (!h.cpf) h.status = "sem_cpf";
    else if (!employee) h.status = "cpf_nao_encontrado";
    else if (!h.mes || !h.ano) h.status = "sem_periodo";
    else if (jaExiste) h.status = "ja_existe";
    else h.status = "ok";
  }
}
