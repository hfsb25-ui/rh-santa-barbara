import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Copy, Loader2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

interface BadgeTemplate {
  id: string;
  nome: string;
  background_url: string | null;
  orientacao: string;
  largura: number;
  altura: number;
  created_at: string;
}

interface BadgeTemplateListProps {
  onEdit: (templateId: string) => void;
  onSelect: (template: BadgeTemplate) => void;
  selectedTemplateId?: string;
}

export default function BadgeTemplateList({ onEdit, onSelect, selectedTemplateId }: BadgeTemplateListProps) {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('cracha_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('cracha_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
      toast.success("Template excluído!");
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir template");
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (template: BadgeTemplate) => {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('cracha_templates')
        .select('*')
        .eq('id', template.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: insertError } = await supabase
        .from('cracha_templates')
        .insert({
          nome: `${original.nome} (cópia)`,
          background_url: original.background_url,
          configuracao_json: original.configuracao_json,
          orientacao: original.orientacao,
          largura: original.largura,
          altura: original.altura,
          empresa_id: original.empresa_id,
        });

      if (insertError) throw insertError;

      fetchTemplates();
      toast.success("Template duplicado!");
    } catch (error: any) {
      console.error("Error duplicating template:", error);
      toast.error("Erro ao duplicar template");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <LayoutTemplate className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum template personalizado criado</p>
        <p className="text-sm">Crie seu primeiro template para começar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card 
          key={template.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelect(template)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium truncate">{template.nome}</h3>
                <Badge variant="outline" className="mt-1">
                  {template.orientacao === 'horizontal' ? 'Horizontal' : 'Vertical'}
                </Badge>
              </div>
              {selectedTemplateId === template.id && (
                <Badge className="bg-primary">Selecionado</Badge>
              )}
            </div>

            {/* Preview */}
            <div 
              className="relative bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden"
              style={{ 
                aspectRatio: template.orientacao === 'horizontal' ? '85/54' : '54/85',
                maxHeight: '120px'
              }}
            >
              {template.background_url ? (
                <img 
                  src={template.background_url} 
                  alt={template.nome}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="text-xs text-muted-foreground">
                  Sem imagem de fundo
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onEdit(template.id)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDuplicate(template)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    {deleting === template.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o template "{template.nome}"?
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(template.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
