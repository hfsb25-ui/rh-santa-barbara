import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

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
