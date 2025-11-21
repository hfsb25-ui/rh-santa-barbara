import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, MapPin, DollarSign, FileText, Award } from "lucide-react";
import CandidaturaForm from "@/components/recrutamento/CandidaturaForm";

interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  tipo_contrato: string;
  tipo_salario: string;
  salario: number | null;
  exibir_salario: boolean;
  quantidade_vagas: number;
  requisitos: string;
  beneficios: string | null;
  empresas: { nome: string } | null;
  setores: { nome: string } | null;
  funcoes: { nome: string; cbo: string } | null;
}

export default function VagaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVaga();
  }, [id]);

  const fetchVaga = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select(`
          *,
          empresas:empresa_id(nome),
          setores:setor_id(nome),
          funcoes:funcao_id(nome, cbo)
        `)
        .eq("id", id)
        .eq("status", "aberta")
        .single();

      if (error) throw error;
      setVaga(data);
    } catch (error) {
      console.error("Erro ao buscar vaga:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>;
  }

  if (!vaga) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Vaga não encontrada</p>
        <Button onClick={() => navigate("/vagas")} className="mt-4 mx-auto block">
          Voltar para Vagas
        </Button>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => setShowForm(false)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <CandidaturaForm vagaId={vaga.id} vagaTitulo={vaga.titulo} onSuccess={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/vagas")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Vagas
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{vaga.titulo}</h1>
              <div className="flex gap-2 mt-4">
                <Badge variant="secondary">{vaga.tipo_contrato}</Badge>
                <Badge variant="outline">{vaga.tipo_salario}</Badge>
              </div>
            </div>
            <Button size="lg" onClick={() => setShowForm(true)}>
              Candidatar-se
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Informações da Vaga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vaga.empresas && (
                <div>
                  <p className="font-semibold">Empresa</p>
                  <p className="text-muted-foreground">{vaga.empresas.nome}</p>
                </div>
              )}
              {vaga.setores && (
                <div>
                  <p className="font-semibold">Setor</p>
                  <p className="text-muted-foreground">{vaga.setores.nome}</p>
                </div>
              )}
              {vaga.funcoes && (
                <div>
                  <p className="font-semibold">Função</p>
                  <p className="text-muted-foreground">{vaga.funcoes.nome} (CBO: {vaga.funcoes.cbo})</p>
                </div>
              )}
              {vaga.exibir_salario && vaga.salario && (
                <div>
                  <p className="font-semibold">Salário</p>
                  <p className="text-muted-foreground">
                    R$ {vaga.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {vaga.tipo_salario}
                  </p>
                </div>
              )}
              <div>
                <p className="font-semibold">Vagas Disponíveis</p>
                <p className="text-muted-foreground">{vaga.quantidade_vagas}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div dangerouslySetInnerHTML={{ __html: vaga.descricao }} className="prose max-w-none" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Requisitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{vaga.requisitos}</div>
            </CardContent>
          </Card>

          {vaga.beneficios && (
            <Card>
              <CardHeader>
                <CardTitle>Benefícios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">{vaga.beneficios}</div>
              </CardContent>
            </Card>
          )}

          <div className="sticky bottom-4 bg-card border rounded-lg p-4 shadow-lg">
            <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
              Candidatar-se Agora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
