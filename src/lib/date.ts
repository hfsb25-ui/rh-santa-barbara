import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Converte uma string de data (YYYY-MM-DD vindo do Postgres tipo DATE)
 * em um objeto Date no fuso LOCAL — evita o bug do JS
 * `new Date('YYYY-MM-DD')` que interpreta como UTC e pode voltar 1 dia
 * em fusos negativos (ex.: Brasil UTC-3).
 *
 * Aceita também timestamps/ISO completos como fallback.
 */
export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;

  // YYYY-MM-DD puro (sem hora)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }

  // DD/MM/YYYY
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (br) {
    const [, d, mo, y] = br;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }

  // Timestamp/ISO completo — Date nativo já funciona corretamente
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formata datas vindas de colunas SQL do tipo DATE (YYYY-MM-DD) sem sofrer
 * o bug do JS `new Date('YYYY-MM-DD')` (que interpreta como UTC e pode voltar 1 dia).
 */
export function formatDateOnlyPtBR(value?: string | null): string {
  if (!value) return "";

  // DATE do Postgres normalmente vem como YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, "yyyy-MM-dd", new Date());
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  }

  // Fallback (caso venha timestamp/ISO)
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}
