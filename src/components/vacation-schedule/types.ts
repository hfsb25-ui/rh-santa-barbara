export interface VacationFiltersType {
  empresa: string;
  setor: string;
  periodo: { start: Date | null; end: Date | null };
  status: string;
  search: string;
}
