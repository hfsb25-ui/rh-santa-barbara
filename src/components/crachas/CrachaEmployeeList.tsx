import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Printer, Search, Users, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { generateBadgesPDF, BADGE_TEMPLATES, BadgeTemplate } from "@/lib/pdfGeneratorCrachas";

const CrachaEmployeeList = () => {
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("ativo");
  const [isGenerating, setIsGenerating] = useState(false);

  // Badge options
  const [showCpf, setShowCpf] = useState(true);
  const [showSector, setShowSector] = useState(true);
  const [showCompanyLogo, setShowCompanyLogo] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<BadgeTemplate>(BADGE_TEMPLATES[0]);
  const [customColor, setCustomColor] = useState<string>("");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-for-badges", empresaFilter, setorFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select(`
          id,
          nome_completo,
          cargo,
          setor,
          foto_url,
          cpf,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            logo_url
          )
        `)
        .order("nome_completo");

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "ativo" | "ferias" | "afastado" | "demitido");
      }

      if (empresaFilter !== "all") {
        query = query.eq("empresa_id", empresaFilter);
      }

      if (setorFilter !== "all") {
        query = query.eq("setor", setorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-for-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: setores = [] } = useQuery({
    queryKey: ["setores-for-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleGeneratePDF = async () => {
    if (selectedEmployees.size === 0) {
      toast.error("Selecione pelo menos um funcionário");
      return;
    }

    setIsGenerating(true);
    try {
      const selectedData = filteredEmployees
        .filter((e) => selectedEmployees.has(e.id))
        .map((e) => ({
          id: e.id,
          nome_completo: e.nome_completo,
          cargo: e.cargo,
          setor: e.setor,
          foto_url: e.foto_url,
          cpf: e.cpf,
          empresa: e.empresas
            ? {
                nome: e.empresas.nome,
                logo_url: e.empresas.logo_url,
              }
            : null,
        }));

      await generateBadgesPDF(selectedData, {
        showCpf,
        showSector,
        showCompanyLogo,
        template: selectedTemplate,
        customHeaderColor: customColor || undefined,
      });

      toast.success(`PDF gerado com ${selectedData.length} crachá(s)`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF de crachás");
    } finally {
      setIsGenerating(false);
    }
  };

  const allSelected = filteredEmployees.length > 0 && selectedEmployees.size === filteredEmployees.length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.nome}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="afastado">Afastados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Estilo do Crachá
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {BADGE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  selectedTemplate.id === template.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div
                  className="w-full h-8 rounded mb-2"
                  style={{ backgroundColor: template.headerColor }}
                />
                <span className="text-xs font-medium">{template.name}</span>
                {selectedTemplate.id === template.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Label htmlFor="customColor">Cor personalizada:</Label>
              <Input
                id="customColor"
                type="color"
                value={customColor || selectedTemplate.headerColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-8 p-1 cursor-pointer"
              />
              {customColor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomColor("")}
                >
                  Resetar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={showCpf} onCheckedChange={setShowCpf} id="showCpf" />
              <Label htmlFor="showCpf">Exibir CPF</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showSector} onCheckedChange={setShowSector} id="showSector" />
              <Label htmlFor="showSector">Exibir Setor</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showCompanyLogo} onCheckedChange={setShowCompanyLogo} id="showLogo" />
              <Label htmlFor="showLogo">Exibir Logo</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Funcionários ({filteredEmployees.length})
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{selectedEmployees.size} selecionado(s)</Badge>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
              <Button onClick={handleGeneratePDF} disabled={selectedEmployees.size === 0 || isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Gerar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEmployees.has(employee.id) ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleEmployee(employee.id)}
                >
                  <Checkbox
                    checked={selectedEmployees.has(employee.id)}
                    onCheckedChange={() => handleToggleEmployee(employee.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.foto_url || undefined} />
                    <AvatarFallback>{employee.nome_completo.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.nome_completo}</p>
                    <p className="text-sm text-muted-foreground truncate">{employee.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrachaEmployeeList;
