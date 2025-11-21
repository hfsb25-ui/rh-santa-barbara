import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  tipo_contrato: string;
  tipo_salario: string;
  salario: number | null;
  exibir_salario: boolean;
  empresas: { nome: string } | null;
  setores: { nome: string } | null;
}

export default function Vagas() {
  const navigate = useNavigate();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [search, setSearch] = useState("");
  const [tipoContratoFilter, setTipoContratoFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVagas();
  }, []);

  const fetchVagas = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select(`
          *,
          empresas:empresa_id(nome),
          setores:setor_id(nome)
        `)
        .eq("status", "aberta")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error("Erro ao buscar vagas:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVagas = vagas.filter((vaga) => {
    const matchSearch = vaga.titulo.toLowerCase().includes(search.toLowerCase()) ||
      vaga.descricao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoContratoFilter === "todos" || vaga.tipo_contrato === tipoContratoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Trabalhe Conosco</h1>
          <p className="text-muted-foreground mt-2">Encontre a oportunidade perfeita para você</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vagas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoContratoFilter} onValueChange={setTipoContratoFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os contratos</SelectItem>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="intermitente">Intermitente</SelectItem>
                <SelectItem value="Prestador de Serviço">Prestador de Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando vagas...</div>
        ) : filteredVagas.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma vaga disponível no momento</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVagas.map((vaga) => (
              <Card key={vaga.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span>{vaga.titulo}</span>
                    <Badge variant="secondary">{vaga.tipo_contrato}</Badge>
                  </CardTitle>
                  <CardDescription className="space-y-2 mt-2">
                    {vaga.empresas && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>{vaga.empresas.nome}</span>
                      </div>
                    )}
                    {vaga.setores && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{vaga.setores.nome}</span>
                      </div>
                    )}
                    {vaga.exibir_salario && vaga.salario && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>R$ {vaga.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {vaga.descricao.replace(/<[^>]*>/g, '')}
                  </p>
                  <Button onClick={() => navigate(`/vaga/${vaga.id}`)} className="w-full">
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
