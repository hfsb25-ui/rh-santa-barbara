import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VacationFiltersType } from "@/pages/VacationSchedule";

interface VacationFiltersProps {
  filters: VacationFiltersType;
  onFiltersChange: (filters: VacationFiltersType) => void;
}

export function VacationFilters({ filters, onFiltersChange }: VacationFiltersProps) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);

  useEffect(() => {
    fetchEmpresas();
    fetchSetores();
  }, []);

  const fetchEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("nome");
    if (data) setEmpresas(data);
  };

  const fetchSetores = async () => {
    const { data } = await supabase.from("setores").select("*").order("nome");
    if (data) setSetores(data);
  };

  const handleReset = () => {
    onFiltersChange({
      empresa: "",
      setor: "",
      periodo: { start: null, end: null },
      status: "",
      search: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar Funcionário</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome do funcionário..."
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="empresa">Empresa</Label>
          <Select
            value={filters.empresa}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, empresa: value })
            }
          >
            <SelectTrigger id="empresa">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="setor">Setor</Label>
          <Select
            value={filters.setor}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, setor: value })
            }
          >
            <SelectTrigger id="setor">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {setores.map((setor) => (
                <SelectItem key={setor.id} value={setor.nome}>
                  {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value })
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodo-inicio">Período (Início)</Label>
          <Input
            id="periodo-inicio"
            type="date"
            value={filters.periodo.start?.toISOString().split("T")[0] || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                periodo: {
                  ...filters.periodo,
                  start: e.target.value ? new Date(e.target.value) : null,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
