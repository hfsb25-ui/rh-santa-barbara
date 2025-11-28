import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import AvaliacaoForm from "@/components/avaliacoes/AvaliacaoForm";
import AvaliacaoCard from "@/components/avaliacoes/AvaliacaoCard";
import CriteriosConfig from "@/components/avaliacoes/CriteriosConfig";

export default function Avaliacoes() {
  const [showAvaliacaoForm, setShowAvaliacaoForm] = useState(false);
  const [showCriteriosConfig, setShowCriteriosConfig] = useState(false);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);

  const { data: avaliacoes, refetch: refetchAvaliacoes } = useQuery({
    queryKey: ["avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select(`
          *,
          employee:employees(id, nome_completo, cargo, setor, foto_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const pendentes = avaliacoes?.filter(a => a.status === "pendente") || [];
  const emAndamento = avaliacoes?.filter(a => a.status === "em_andamento") || [];
  const concluidas = avaliacoes?.filter(a => a.status === "concluida") || [];

  const handleEdit = (avaliacao: any) => {
    setSelectedAvaliacao(avaliacao);
    setShowAvaliacaoForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("avaliacoes_desempenho")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Avaliação excluída com sucesso!");
      refetchAvaliacoes();
    } catch (error: any) {
      toast.error("Erro ao excluir avaliação: " + error.message);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avaliações de Desempenho</h1>
          <p className="text-muted-foreground">
            Gerencie avaliações periódicas e acompanhe o desenvolvimento da equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCriteriosConfig(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Critérios
          </Button>
          <Button onClick={() => {
            setSelectedAvaliacao(null);
            setShowAvaliacaoForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Avaliação
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>Visão geral das avaliações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendentes.length}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{emAndamento.length}</div>
              <div className="text-sm text-muted-foreground">Em Andamento</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{concluidas.length}</div>
              <div className="text-sm text-muted-foreground">Concluídas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="em_andamento">
            Em Andamento ({emAndamento.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas ({concluidas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="space-y-4">
          {pendentes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma avaliação pendente
              </CardContent>
            </Card>
          ) : (
            pendentes.map((avaliacao) => (
              <AvaliacaoCard
                key={avaliacao.id}
                avaliacao={avaliacao}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetchAvaliacoes}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="em_andamento" className="space-y-4">
          {emAndamento.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma avaliação em andamento
              </CardContent>
            </Card>
          ) : (
            emAndamento.map((avaliacao) => (
              <AvaliacaoCard
                key={avaliacao.id}
                avaliacao={avaliacao}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetchAvaliacoes}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="concluidas" className="space-y-4">
          {concluidas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma avaliação concluída
              </CardContent>
            </Card>
          ) : (
            concluidas.map((avaliacao) => (
              <AvaliacaoCard
                key={avaliacao.id}
                avaliacao={avaliacao}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetchAvaliacoes}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showAvaliacaoForm && (
        <AvaliacaoForm
          avaliacao={selectedAvaliacao}
          onClose={() => {
            setShowAvaliacaoForm(false);
            setSelectedAvaliacao(null);
          }}
          onSuccess={() => {
            setShowAvaliacaoForm(false);
            setSelectedAvaliacao(null);
            refetchAvaliacoes();
          }}
        />
      )}

      {showCriteriosConfig && (
        <CriteriosConfig onClose={() => setShowCriteriosConfig(false)} />
      )}
    </div>
  );
}
