import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Employee {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  foto_url: string | null;
  empresa_id: string | null;
  status: string | null;
}

interface Setor {
  id: string;
  nome: string;
}

export default function Organograma() {
  const [expandedSectors, setExpandedSectors] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  const { data: empresas } = useQuery({
    queryKey: ["organograma-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["organograma-setores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["organograma-employees", selectedCompany],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*")
        .in("status", ["ativo", "ferias"])
        .order("nome_completo");
      
      if (selectedCompany !== "all") {
        query = query.eq("empresa_id", selectedCompany);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Employee[];
    },
  });

  const toggleSector = (sectorName: string) => {
    setExpandedSectors(prev => 
      prev.includes(sectorName) 
        ? prev.filter(s => s !== sectorName)
        : [...prev, sectorName]
    );
  };

  const expandAll = () => {
    setExpandedSectors(setores?.map(s => s.nome) || []);
  };

  const collapseAll = () => {
    setExpandedSectors([]);
  };

  // Agrupar funcionários por setor
  const employeesBySetor = setores?.reduce((acc, setor) => {
    acc[setor.nome] = employees?.filter(e => e.setor === setor.nome) || [];
    return acc;
  }, {} as Record<string, Employee[]>) || {};

  // Funcionários sem setor
  const employeesWithoutSetor = employees?.filter(e => !e.setor || !setores?.some(s => s.nome === e.setor)) || [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="border rounded-md px-3 py-2 bg-background"
              >
                <option value="all">Todas as empresas</option>
                {empresas?.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={expandAll}
                className="text-sm text-primary hover:underline"
              >
                Expandir todos
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-primary hover:underline"
              >
                Recolher todos
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organograma Visual */}
      <div className="space-y-4">
        {setores?.map((setor) => {
          const sectorEmployees = employeesBySetor[setor.nome] || [];
          const isExpanded = expandedSectors.includes(setor.nome);

          return (
            <Collapsible
              key={setor.id}
              open={isExpanded}
              onOpenChange={() => toggleSector(setor.nome)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{setor.nome}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {sectorEmployees.length} funcionário{sectorEmployees.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg px-4">
                        {sectorEmployees.length}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {sectorEmployees.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sectorEmployees.map((employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={employee.foto_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {employee.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{employee.nome_completo}</p>
                              <p className="text-sm text-muted-foreground truncate">{employee.cargo}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum funcionário neste setor
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {/* Funcionários sem setor */}
        {employeesWithoutSetor.length > 0 && (
          <Collapsible
            open={expandedSectors.includes("sem-setor")}
            onOpenChange={() => toggleSector("sem-setor")}
          >
            <Card className="border-dashed">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSectors.includes("sem-setor") ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="p-2 bg-muted rounded-lg">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-muted-foreground">Sem Setor Definido</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {employeesWithoutSetor.length} funcionário{employeesWithoutSetor.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg px-4">
                      {employeesWithoutSetor.length}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {employeesWithoutSetor.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.foto_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {employee.nome_completo?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{employee.nome_completo}</p>
                          <p className="text-sm text-muted-foreground truncate">{employee.cargo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      {/* Resumo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{setores?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Setores</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold">{empresas?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Empresas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
