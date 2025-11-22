import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { EncaminhamentoCard } from "./EncaminhamentoCard";
import { Skeleton } from "@/components/ui/skeleton";

export const EncaminhamentosList = () => {
  const [encaminhamentos, setEncaminhamentos] = useState<any[]>([]);
  const [filteredEncaminhamentos, setFilteredEncaminhamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  useEffect(() => {
    fetchEncaminhamentos();
  }, []);

  useEffect(() => {
    filterEncaminhamentos();
  }, [encaminhamentos, searchTerm, statusFilter, tipoFilter]);

  const fetchEncaminhamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("encaminhamentos_medicos")
        .select(`
          *,
          employees(nome_completo, cpf, cargo, setor),
          empresas(nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEncaminhamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar encaminhamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEncaminhamentos = () => {
    let filtered = [...encaminhamentos];

    // Filtro por texto de busca
    if (searchTerm) {
      filtered = filtered.filter((enc) =>
        enc.employees?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((enc) => enc.status === statusFilter);
    }

    // Filtro por tipo
    if (tipoFilter !== "all") {
      filtered = filtered.filter((enc) => enc.tipo_exame === tipoFilter);
    }

    setFilteredEncaminhamentos(filtered);
  };

  const handleRefresh = () => {
    fetchEncaminhamentos();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encaminhamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Encaminhamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome do funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="admissional">Admissional</SelectItem>
              <SelectItem value="demissional">Demissional</SelectItem>
              <SelectItem value="periodico">Periódico</SelectItem>
              <SelectItem value="mudanca_riscos">Mudança de Riscos</SelectItem>
              <SelectItem value="retorno_trabalho">Retorno ao Trabalho</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Encaminhamentos */}
        {filteredEncaminhamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum encaminhamento encontrado
          </p>
        ) : (
          <div className="space-y-4">
            {filteredEncaminhamentos.map((encaminhamento) => (
              <EncaminhamentoCard
                key={encaminhamento.id}
                encaminhamento={encaminhamento}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
