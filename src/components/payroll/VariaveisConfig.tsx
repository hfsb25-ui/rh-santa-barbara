import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface Variavel {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: "desconto" | "provento";
  empresa_id: string | null;
  ativo: boolean;
}

interface VariaveisConfigProps {
  empresaId?: string;
}

const VariaveisConfig = ({ empresaId }: VariaveisConfigProps) => {
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingVariavel, setEditingVariavel] = useState<Variavel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVariaveis();
  }, [empresaId]);

  const fetchVariaveis = async () => {
    let query = supabase
      .from("variaveis_folha")
      .select("*")
      .order("tipo")
      .order("nome");

    if (empresaId) {
      query = query.or(`empresa_id.eq.${empresaId},empresa_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar variáveis");
      return;
    }
    setVariaveis(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const codigo = (formData.get("codigo") as string)?.toUpperCase() || null;
    const tipo = formData.get("tipo") as "desconto" | "provento";

    try {
      if (editingVariavel) {
        const { error } = await supabase
          .from("variaveis_folha")
          .update({ nome, codigo, tipo })
          .eq("id", editingVariavel.id);
        if (error) throw error;
        toast.success("Variável atualizada!");
      } else {
        const { error } = await supabase
          .from("variaveis_folha")
          .insert({ nome, codigo, tipo, empresa_id: empresaId || null });
        if (error) throw error;
        toast.success("Variável criada!");
      }
      setShowForm(false);
      setEditingVariavel(null);
      fetchVariaveis();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23505") {
        toast.error("Este código já está em uso");
      } else {
        toast.error("Erro ao salvar variável");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (variavel: Variavel) => {
    try {
      const { error } = await supabase
        .from("variaveis_folha")
        .update({ ativo: !variavel.ativo })
        .eq("id", variavel.id);
      if (error) throw error;
      toast.success(variavel.ativo ? "Variável desativada" : "Variável ativada");
      fetchVariaveis();
    } catch (error) {
      toast.error("Erro ao atualizar variável");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("variaveis_folha")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Variável excluída!");
      fetchVariaveis();
    } catch (error) {
      toast.error("Erro ao excluir variável");
    }
  };

  const filteredVariaveis = variaveis.filter(v => 
    filtroTipo === "all" || v.tipo === filtroTipo
  );

  const proventos = filteredVariaveis.filter(v => v.tipo === "provento");
  const descontos = filteredVariaveis.filter(v => v.tipo === "desconto");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="provento">Proventos</SelectItem>
              <SelectItem value="desconto">Descontos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingVariavel(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Variável
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVariavel ? "Editar Variável" : "Nova Variável"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input 
                  name="codigo" 
                  defaultValue={editingVariavel?.codigo || ""} 
                  placeholder="Ex: HE, INSS, VT"
                  className="uppercase"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código para busca rápida durante o lançamento
                </p>
              </div>
              <div>
                <Label>Nome</Label>
                <Input 
                  name="nome" 
                  required 
                  defaultValue={editingVariavel?.nome || ""} 
                  placeholder="Ex: Hora Extra, INSS, Vale Transporte"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="tipo" defaultValue={editingVariavel?.tipo || "provento"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provento">Provento (+)</SelectItem>
                    <SelectItem value="desconto">Desconto (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingVariavel ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(filtroTipo === "all" || filtroTipo === "provento") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                Proventos ({proventos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {proventos.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={v.ativo} 
                      onCheckedChange={() => handleToggleAtivo(v)}
                    />
                    {v.codigo && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {v.codigo}
                      </Badge>
                    )}
                    <span className={v.ativo ? "" : "text-muted-foreground line-through"}>
                      {v.nome}
                    </span>
                    {!v.empresa_id && (
                      <Badge variant="secondary" className="text-xs">Global</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingVariavel(v);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Variável</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja excluir "{v.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive text-destructive-foreground">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {proventos.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhum provento cadastrado</p>
              )}
            </CardContent>
          </Card>
        )}

        {(filtroTipo === "all" || filtroTipo === "desconto") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrendingDown className="w-5 h-5" />
                Descontos ({descontos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {descontos.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={v.ativo} 
                      onCheckedChange={() => handleToggleAtivo(v)}
                    />
                    {v.codigo && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {v.codigo}
                      </Badge>
                    )}
                    <span className={v.ativo ? "" : "text-muted-foreground line-through"}>
                      {v.nome}
                    </span>
                    {!v.empresa_id && (
                      <Badge variant="secondary" className="text-xs">Global</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingVariavel(v);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Variável</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja excluir "{v.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive text-destructive-foreground">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {descontos.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhum desconto cadastrado</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VariaveisConfig;
