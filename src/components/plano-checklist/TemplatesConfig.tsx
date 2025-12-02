import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GripVertical, FileText } from "lucide-react";
import { TemplateForm } from "./TemplateForm";
import { TemplateItensEditor } from "./TemplateItensEditor";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function TemplatesConfig() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoTab, setTipoTab] = useState<"admissao" | "desligamento">("admissao");
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingItens, setEditingItens] = useState<any>(null);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("plano_checklist_templates")
        .select(`
          *,
          empresa:empresas(nome),
          setor:setores(nome),
          funcao:funcoes(nome),
          itens:plano_checklist_itens(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("plano_checklist_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "O template foi removido com sucesso.",
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("plano_checklist_templates")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter((t) => t.tipo === tipoTab);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Configurar Templates</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Tabs value={tipoTab} onValueChange={(v) => setTipoTab(v as any)}>
        <TabsList>
          <TabsTrigger value="admissao">Admissão</TabsTrigger>
          <TabsTrigger value="desligamento">Desligamento</TabsTrigger>
        </TabsList>

        <TabsContent value={tipoTab} className="mt-4">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum template de {tipoTab === "admissao" ? "admissão" : "desligamento"} cadastrado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{template.nome}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.empresa && (
                            <Badge variant="outline">{template.empresa.nome}</Badge>
                          )}
                          {template.setor && (
                            <Badge variant="outline">{template.setor.nome}</Badge>
                          )}
                          {template.funcao && (
                            <Badge variant="outline">{template.funcao.nome}</Badge>
                          )}
                          {!template.empresa && !template.setor && !template.funcao && (
                            <Badge variant="secondary">Geral</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={template.ativo ? "default" : "secondary"}>
                        {template.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{template.itens?.length || 0} itens</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingItens(template)}
                      >
                        <GripVertical className="h-4 w-4 mr-1" />
                        Itens
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAtivo(template.id, template.ativo)}
                      >
                        {template.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O template e todos os seus itens serão
                              removidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)}>
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
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingTemplate(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            defaultTipo={tipoTab}
            onSaved={() => {
              setShowForm(false);
              setEditingTemplate(null);
              fetchTemplates();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItens} onOpenChange={(open) => !open && setEditingItens(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itens do Template: {editingItens?.nome}</DialogTitle>
          </DialogHeader>
          {editingItens && (
            <TemplateItensEditor
              templateId={editingItens.id}
              onUpdate={fetchTemplates}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
