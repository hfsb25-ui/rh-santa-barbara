export interface VacationFiltersType {
  empresa: string;
  setor: string;
  periodo: { start: Date | null; end: Date | null };
  status: string;
  search: string;
  ano?: number;
  feriasVencidas?: boolean;
  mesLista?: number; // Filtro de mês específico para a lista (1-12)
}

export interface VacationEvent {
  employee_id: string;
  employee_name: string;
  setor: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: "planejado" | "aprovado" | "em_andamento" | "concluido";
  dias_totais?: number;
}

export const STATUS_COLORS = {
  planejado: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500",
  },
  aprovado: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-500",
  },
  em_andamento: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500",
  },
  concluido: {
    bg: "bg-gray-100 dark:bg-gray-800/30",
    border: "border-gray-300 dark:border-gray-700",
    text: "text-gray-700 dark:text-gray-300",
    badge: "bg-gray-500",
  },
} as const;

export const STATUS_LABELS = {
  planejado: "Planejado",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
} as const;
