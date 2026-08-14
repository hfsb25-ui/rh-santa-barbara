// Parser de holerites a partir de CSV de lançamentos detalhados (sem IA, sem OCR).
// Formato esperado (separador ; ou ,):
// Colaborador;CPF;Matricula;Cargo;Admissao;Competencia;CNPJ_Empresa;Codigo_Evento;Descricao_Evento;Tipo;Valor

import { supabase } from "@/integrations/supabase/client";
import { enriquecer, type OcrHolerite, type OcrProgress } from "./holeriteOcrParser";

function stripBom(s: string) {
  return s.replace(/^\uFEFF/, "");
}

function detectSep(headerLine: string) {
  const c = (ch: string) => (headerLine.match(new RegExp(`\\${ch}`, "g")) || []).length;
  return c(";") >= c(",") ? ";" : ",";
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(raw: string): number {
  if (!raw) return 0;
  let s = raw.replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1 && lastComma > -1) {
    s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

function cleanDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function parseCompetencia(raw: string): { mes: number | null; ano: number | null } {
  const s = (raw || "").trim();
  let m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/);
  if (m) return { mes: Number(m[1]), ano: Number(m[2]) };
  m = s.match(/^(\d{4})\s*[\/\-.]\s*(\d{1,2})$/);
  if (m) return { mes: Number(m[2]), ano: Number(m[1]) };
  m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{2})$/);
  if (m) return { mes: Number(m[1]), ano: 2000 + Number(m[2]) };
  return { mes: null, ano: null };
}

const COLS: Record<string, string[]> = {
  nome: ["colaborador", "nome", "nomecolaborador", "funcionario", "nomecompleto"],
  cpf: ["cpf"],
  competencia: ["competencia", "mesano", "periodo", "referencia"],
  cnpj: ["cnpjempresa", "cnpj", "empresa"],
  codigo: ["codigoevento", "codigo", "cod", "rubrica"],
  descricao: ["descricaoevento", "descricao", "evento", "verba"],
  tipo: ["tipo", "naturaleza", "natureza"],
  valor: ["valor", "vlr", "montante"],
  tipoFolha: ["tipofolha", "folha"],
};

function mapHeader(cells: string[]) {
  const idx: Record<string, number> = {};
  cells.forEach((c, i) => {
    const n = norm(c);
    for (const [key, aliases] of Object.entries(COLS)) {
      if (idx[key] === undefined && aliases.includes(n)) idx[key] = i;
    }
  });
  return idx;
}

export async function processarHoleritesCsv(
  file: File,
  defaults: { mes?: number; ano?: number; empresa_id?: string | null },
  onProgress: (p: OcrProgress) => void
): Promise<OcrHolerite[]> {
  onProgress({ fase: "parse", pagina: 0, total: 1, msg: "Lendo CSV..." });
  const text = stripBom(await file.text());
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV vazio ou sem linhas de dados.");

  const sep = detectSep(lines[0]);
  const idx = mapHeader(splitLine(lines[0], sep));

  const faltando = ["cpf", "valor", "tipo"].filter((k) => idx[k] === undefined);
  if (faltando.length) {
    throw new Error(
      `CSV inválido: colunas não encontradas (${faltando.join(", ")}). Cabeçalho esperado: Colaborador;CPF;Matricula;Cargo;Admissao;Competencia;CNPJ_Empresa;Codigo_Evento;Descricao_Evento;Tipo;Valor`
    );
  }

  const total = lines.length - 1;
  const grupos = new Map<string, OcrHolerite & { _cnpj?: string | null }>();

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep);
    const get = (k: string) => (idx[k] !== undefined ? cells[idx[k]] || "" : "");

    const cpf = cleanDigits(get("cpf"));
    if (cpf.length !== 11) continue;

    const comp = parseCompetencia(get("competencia"));
    const mes = comp.mes ?? defaults.mes ?? null;
    const ano = comp.ano ?? defaults.ano ?? null;
    const tipoFolha = (get("tipoFolha") || "salario").trim() || "salario";
    const cnpj = cleanDigits(get("cnpj"));

    const key = [cpf, mes ?? "?", ano ?? "?", tipoFolha].join("|");
    let h = grupos.get(key);
    if (!h) {
      h = {
        pagina: 0,
        cpf,
        cpf_raw: get("cpf"),
        nome: (get("nome") || "").toUpperCase(),
        mes,
        ano,
        tipo_folha: tipoFolha,
        empresa_nome: null,
        empresa_id: null,
        employee_id: null,
        employee_nome: null,
        valor_bruto: 0,
        descontos_total: 0,
        valor_liquido: 0,
        proventos: [],
        descontos: [],
        status: "ok",
        _cnpj: cnpj || null,
      };
      grupos.set(key, h);
    }

    const valor = toNumber(get("valor"));
    if (valor <= 0) continue;
    const descricaoRaw = (get("descricao") || "").trim();
    // Lançamentos informativos de "Contrato:" não entram no cálculo
    if (/^contrato\s*:?/i.test(descricaoRaw)) continue;
    const tipoRaw = norm(get("tipo"));
    const isDesconto = tipoRaw.startsWith("desc") || tipoRaw.startsWith("deb") || tipoRaw === "d";
    const rub = {
      codigo: (get("codigo") || "").trim() || null,
      descricao: descricaoRaw || (isDesconto ? "DESCONTO" : "PROVENTO"),
      valor,
    };

    if (isDesconto) {
      h.descontos.push(rub);
      h.descontos_total += valor;
    } else {
      h.proventos.push(rub);
      h.valor_bruto += valor;
    }

    if (i % 200 === 0) {
      onProgress({
        fase: "parse",
        pagina: i,
        total,
        msg: `Lendo linha ${i}/${total}...`,
      });
    }
  }

  const holerites = Array.from(grupos.values());
  const round2 = (n: number) => Math.round(n * 100) / 100;
  for (const h of holerites) {
    h.valor_bruto = round2(h.valor_bruto);
    h.descontos_total = round2(h.descontos_total);
    h.valor_liquido = round2(h.valor_bruto - h.descontos_total);
  }

  if (holerites.length === 0) {
    throw new Error("Nenhum lançamento válido encontrado no CSV (verifique CPF e valores).");
  }

  onProgress({ fase: "match", pagina: total, total, msg: "Cruzando com cadastros..." });
  await enriquecer(holerites as OcrHolerite[], defaults.empresa_id || null);

  // Se o CSV informou CNPJ, tenta casar com a empresa cadastrada
  const cnpjs = Array.from(
    new Set(holerites.map((h) => (h as any)._cnpj).filter((c: any): c is string => !!c))
  );
  if (cnpjs.length) {
    const { data: empresas } = await supabase.from("empresas").select("id, nome, cnpj");
    const byCnpj = new Map<string, any>();
    (empresas || []).forEach((e: any) => {
      const c = cleanDigits(e.cnpj || "");
      if (c) byCnpj.set(c, e);
    });
    for (const h of holerites) {
      const c = (h as any)._cnpj;
      const found = c ? byCnpj.get(c) : null;
      if (found) {
        h.empresa_id = found.id;
        h.empresa_nome = found.nome;
      }
      delete (h as any)._cnpj;
    }
  } else {
    for (const h of holerites) delete (h as any)._cnpj;
  }

  onProgress({
    fase: "done",
    pagina: total,
    total,
    msg: `${holerites.length} holerite(s) montado(s) a partir do CSV`,
  });
  return holerites as OcrHolerite[];
}
