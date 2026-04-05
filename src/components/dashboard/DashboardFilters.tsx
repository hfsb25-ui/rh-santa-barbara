import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Building2 } from "lucide-react";

interface DashboardFiltersProps {
  period: string;
  onPeriodChange: (value: string) => void;
  selectedCompany: string;
  onCompanyChange: (value: string) => void;
  companies: Array<{ id: string; nome: string }>;
}

const DashboardFilters = ({ 
  period, 
  onPeriodChange, 
  selectedCompany, 
  onCompanyChange,
  companies 
}: DashboardFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px] bg-card border-0 shadow-sm text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last3">Últimos 3 Meses</SelectItem>
            <SelectItem value="last6">Últimos 6 Meses</SelectItem>
            <SelectItem value="year">Ano Atual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Select value={selectedCompany} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-[200px] bg-card border-0 shadow-sm text-sm">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Empresas</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DashboardFilters;
