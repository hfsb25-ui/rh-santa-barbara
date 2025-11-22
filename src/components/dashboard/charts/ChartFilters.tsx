import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChartFiltersProps {
  selectedEmpresa: string;
  setSelectedEmpresa: (value: string) => void;
  empresas: Array<{ id: string; nome: string }>;
  period: string;
  setPeriod: (value: string) => void;
  onExport?: () => void;
  showExport?: boolean;
}

const ChartFilters = ({
  selectedEmpresa,
  setSelectedEmpresa,
  empresas,
  period,
  setPeriod,
  onExport,
  showExport = false
}: ChartFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg border">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Selecionar empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {empresas.map((empresa) => (
              <SelectItem key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês atual</SelectItem>
            <SelectItem value="last3">Últimos 3 meses</SelectItem>
            <SelectItem value="last6">Últimos 6 meses</SelectItem>
            <SelectItem value="year">Ano atual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showExport && onExport && (
        <Button onClick={onExport} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar Dashboard
        </Button>
      )}
    </div>
  );
};

export default ChartFilters;
