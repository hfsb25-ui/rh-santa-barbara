import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface CriteriosConfigProps {
  onClose: () => void;
}

export default function CriteriosConfig({ onClose }: CriteriosConfigProps) {
  const [editingCriterio, setEditingCriterio] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    peso: 1,
    ativo: true,
  });

  const { data: criterios, refetch } = useQuery({
    queryKey: ["criterios-avaliacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criterios_avaliacao")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    try {
      if (!formData.nome) {
        toast.error("Nome do critério é obrigatório");
        return;
      }

      if (editingCriterio) {
        const { error } = await supabase
          .from("criterios_avaliacao")
          .update(formData)
          .eq("id", editingCriterio.id);

        if (error) throw error;
        toast.success("Critério atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("criterios_avaliacao")
          .insert(formData);

        if (error) throw error;
        toast.success("Critério criado com sucesso!");
      }

      setFormData({ nome: "", descricao: "", peso: 1, ativo: true });
      setEditingCriterio(null);
      refetch();
    } catch (error: any) {
      toast.error("Erro ao salvar critério: " + error.message);
    }
  };

  const handleEdit = (criterio: any) => {
    setEditingCriterio(criterio);
    setFormData({
      nome: criterio.nome,
      descricao: criterio.descricao || "",
      peso: criterio.peso,
      ativo: criterio.ativo,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("criterios_avaliacao")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Critério excluído com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao excluir critério: " + error.message);
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("criterios_avaliacao")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;
      toast.success(ativo ? "Critério desativado" : "Critério ativado");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao atualizar critério: " + error.message);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Critérios de Avaliação</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {editingCriterio ? "Editar Critério" : "Novo Critério"}
            </h3>
            
            <div className="space-y-2">
              <Label>Nome do Critério</Label>
              <Input
                placeholder="Ex: Pontualidade, Trabalho em equipe..."
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o que será avaliado neste critério..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Peso (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.peso}
                onChange={(e) => setFormData({ ...formData, peso: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Ativo</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                {editingCriterio ? "Atualizar" : "Adicionar"}
              </Button>
              {editingCriterio && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCriterio(null);
                    setFormData({ nome: "", descricao: "", peso: 1, ativo: true });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Critérios */}
          <div className="space-y-4">
            <h3 className="font-semibold">Critérios Cadastrados</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {criterios?.map((criterio) => (
                <Card key={criterio.id} className={!criterio.ativo ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{criterio.nome}</h4>
                          <span className="text-xs text-muted-foreground">
                            Peso: {criterio.peso}
                          </span>
                        </div>
                        {criterio.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {criterio.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={criterio.ativo}
                          onCheckedChange={() => handleToggleAtivo(criterio.id, criterio.ativo)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(criterio)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(criterio.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {criterios?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum critério cadastrado
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
