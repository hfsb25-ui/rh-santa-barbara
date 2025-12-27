import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import type { Empresa, Setor, FinanceiroFilters as FilterType } from "./hooks/useFinanceiroData";

interface FinanceiroFiltersProps {
  filters: FilterType;
  setFilters: (filters: FilterType) => void;
  empresas: Empresa[];
  setores: Setor[];
}

export function FinanceiroFilters({ filters, setFilters, empresas, setores }: FinanceiroFiltersProps) {
  const handleReset = () => {
    setFilters({
      empresa: "all",
      periodo: "12months",
      setor: "all",
      tipoContrato: "all",
      tipoFolha: "all",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg mb-6">
      <Select
        value={filters.empresa}
        onValueChange={(value) => setFilters({ ...filters, empresa: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Empresas</SelectItem>
          {empresas.map((empresa) => (
            <SelectItem key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.periodo}
        onValueChange={(value) => setFilters({ ...filters, periodo: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1month">Último Mês</SelectItem>
          <SelectItem value="3months">3 Meses</SelectItem>
          <SelectItem value="6months">6 Meses</SelectItem>
          <SelectItem value="12months">12 Meses</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.setor}
        onValueChange={(value) => setFilters({ ...filters, setor: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Setor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Setores</SelectItem>
          {setores.map((setor) => (
            <SelectItem key={setor.id} value={setor.nome}>
              {setor.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.tipoContrato}
        onValueChange={(value) => setFilters({ ...filters, tipoContrato: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo Contrato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Contratos</SelectItem>
          <SelectItem value="fixo">Fixo</SelectItem>
          <SelectItem value="intermitente">Intermitente</SelectItem>
          <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.tipoFolha}
        onValueChange={(value) => setFilters({ ...filters, tipoFolha: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo Folha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Folhas</SelectItem>
          <SelectItem value="salario">Salário</SelectItem>
          <SelectItem value="complementar">Complementar</SelectItem>
          <SelectItem value="adiantamento">Adiantamento</SelectItem>
          <SelectItem value="decimo_terceiro">13º Salário</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={handleReset} title="Limpar filtros">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
