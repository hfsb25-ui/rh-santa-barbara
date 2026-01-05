import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Printer, Users, Filter } from "lucide-react";
import { generateEtiquetasPontoPDF, getMesNome } from "@/lib/pdfGeneratorEtiquetasPonto";

export function EtiquetasPonto() {
  const currentDate = new Date();
  const [mes, setMes] = useState(String(currentDate.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [tipoContratoFilter, setTipoContratoFilter] = useState<string>("all");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Buscar empresas
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-etiquetas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Buscar setores
  const { data: setores = [] } = useQuery({
    queryKey: ["setores-etiquetas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Buscar funcionários com filtros
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-etiquetas", empresaFilter, setorFilter, tipoContratoFilter],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select(`
          id,
          nome_completo,
          cargo,
          setor,
          tipo_contrato,
          empresa_id,
          empresas (nome)
        `)
        .eq("status", "ativo")
        .order("nome_completo");

      if (empresaFilter !== "all") {
        query = query.eq("empresa_id", empresaFilter);
      }

      if (setorFilter !== "all") {
        query = query.eq("setor", setorFilter);
      }

      if (tipoContratoFilter !== "all") {
        query = query.eq("tipo_contrato", tipoContratoFilter as "fixo" | "intermitente" | "prestador_servico");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Buscar nomes dos setores para exibição
  const { data: setoresMap = {} } = useQuery({
    queryKey: ["setores-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome");
      if (error) throw error;
      return data.reduce((acc, s) => ({ ...acc, [s.id]: s.nome }), {} as Record<string, string>);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    } else {
      setSelectedEmployees(new Set());
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmployees);
    if (checked) {
      newSelected.add(employeeId);
    } else {
      newSelected.delete(employeeId);
    }
    setSelectedEmployees(newSelected);
    setSelectAll(newSelected.size === employees.length);
  };

  const handleGenerateEtiquetas = () => {
    if (selectedEmployees.size === 0) {
      toast.error("Selecione pelo menos um funcionário");
      return;
    }

    const selectedData = employees
      .filter((e) => selectedEmployees.has(e.id))
      .map((e) => ({
        nomeCompleto: e.nome_completo,
        cargo: e.cargo,
        empresa: (e.empresas as any)?.nome || "Não informada",
        setor: e.setor ? setoresMap[e.setor] || e.setor : undefined,
        mes: getMesNome(parseInt(mes)),
        ano: ano,
      }));

    try {
      generateEtiquetasPontoPDF(selectedData);
      toast.success(`${selectedData.length} etiqueta(s) gerada(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao gerar etiquetas:", error);
      toast.error("Erro ao gerar etiquetas");
    }
  };

  const tiposContrato = [
    { value: "fixo", label: "Fixo" },
    { value: "intermitente", label: "Intermitente" },
    { value: "prestador_servico", label: "Prestador de Serviço" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Printer className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Etiquetas de Cartão de Ponto</h3>
        <span className="text-sm text-muted-foreground">(Pimaco 6282)</span>
      </div>

      {/* Seleção de Mês/Ano */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                  {getMesNome(i + 1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ano</Label>
          <Input
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            min="2020"
            max="2099"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <Select value={tipoContratoFilter} onValueChange={setTipoContratoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tiposContrato.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Funcionários */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Funcionários</span>
            <span className="text-sm text-muted-foreground">
              ({selectedEmployees.size} de {employees.length} selecionados)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              Selecionar todos
            </Label>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando funcionários...
            </div>
          ) : employees.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum funcionário encontrado com os filtros selecionados
            </div>
          ) : (
            <div className="divide-y">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-3 flex items-center gap-3 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedEmployees.has(employee.id)}
                    onCheckedChange={(checked) =>
                      handleSelectEmployee(employee.id, checked as boolean)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.nome_completo}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {employee.cargo}
                      {employee.setor && setoresMap[employee.setor] && (
                        <> • {setoresMap[employee.setor]}</>
                      )}
                      {(employee.empresas as any)?.nome && (
                        <> • {(employee.empresas as any).nome}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botão de Gerar */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerateEtiquetas}
          disabled={selectedEmployees.size === 0}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Gerar Etiquetas ({selectedEmployees.size})
        </Button>
      </div>

      {/* Info sobre o padrão */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <strong>Padrão Pimaco 6282:</strong> 14 etiquetas por folha (2 colunas x 7 linhas), 
        dimensões 33,9mm x 101,6mm, papel Carta.
      </div>
    </div>
  );
}
