import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Building2, Filter } from "lucide-react";

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filtros:
          </div>
          
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex items-center gap-2 min-w-[200px]">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={period} onValueChange={onPeriodChange}>
                <SelectTrigger>
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

            <div className="flex items-center gap-2 min-w-[200px]">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCompany} onValueChange={onCompanyChange}>
                <SelectTrigger>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
