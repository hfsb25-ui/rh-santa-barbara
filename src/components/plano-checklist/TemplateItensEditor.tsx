import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TemplateItensEditorProps {
  templateId: string;
  onUpdate: () => void;
}

export function TemplateItensEditor({ templateId, onUpdate }: TemplateItensEditorProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchItens = async () => {
    try {
      const { data, error } = await supabase
        .from("plano_checklist_itens")
        .select("*")
        .eq("template_id", templateId)
        .order("ordem");

      if (error) throw error;
      setItens(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItens();
  }, [templateId]);

  const addItem = () => {
    setItens([
      ...itens,
      {
        id: `new-${Date.now()}`,
        template_id: templateId,
        titulo: "",
        descricao: "",
        ordem: itens.length + 1,
        obrigatorio: false,
        prazo_dias: null,
        isNew: true,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItens((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value, isDirty: true } : item
      )
    );
  };

  const removeItem = async (index: number) => {
    const item = itens[index];
    
    if (!item.isNew) {
      try {
        const { error } = await supabase
          .from("plano_checklist_itens")
          .delete()
          .eq("id", item.id);

        if (error) throw error;
      } catch (error: any) {
        toast({
          title: "Erro ao excluir item",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    setItens((prev) => prev.filter((_, i) => i !== index));
    onUpdate();
  };

  const saveAll = async () => {
    try {
      setSaving(true);

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        
        if (!item.titulo.trim()) {
          toast({
            title: "Título obrigatório",
            description: `O item ${i + 1} precisa de um título.`,
            variant: "destructive",
          });
          return;
        }

        const data = {
          template_id: templateId,
          titulo: item.titulo.trim(),
          descricao: item.descricao?.trim() || null,
          ordem: i + 1,
          obrigatorio: item.obrigatorio,
          prazo_dias: item.prazo_dias || null,
        };

        if (item.isNew) {
          const { error } = await supabase
            .from("plano_checklist_itens")
            .insert(data);

          if (error) throw error;
        } else if (item.isDirty) {
          const { error } = await supabase
            .from("plano_checklist_itens")
            .update(data)
            .eq("id", item.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Itens salvos",
        description: "Todos os itens foram salvos com sucesso.",
      });
      
      fetchItens();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar itens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {itens.map((item, index) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg space-y-3 bg-card"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              <span className="text-sm font-medium text-muted-foreground">
                #{index + 1}
              </span>
              <div className="flex-1" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeItem(index)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={item.titulo}
                  onChange={(e) => updateItem(index, "titulo", e.target.value)}
                  placeholder="Ex: Documentos Pessoais"
                />
              </div>

              <div className="space-y-2">
                <Label>Prazo (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.prazo_dias || ""}
                  onChange={(e) =>
                    updateItem(index, "prazo_dias", e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={item.descricao || ""}
                onChange={(e) => updateItem(index, "descricao", e.target.value)}
                placeholder="Descrição detalhada do item..."
                className="min-h-[60px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id={`obrigatorio-${item.id}`}
                checked={item.obrigatorio}
                onCheckedChange={(checked) => updateItem(index, "obrigatorio", checked)}
              />
              <Label htmlFor={`obrigatorio-${item.id}`}>Item obrigatório</Label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Todos"}
        </Button>
      </div>
    </div>
  );
}
