import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import UniformStockForm from "./UniformStockForm";

const UniformStockList = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("estoque_uniformes")
      .select("*")
      .order("tipo_uniforme");

    if (error) {
      toast.error("Erro ao carregar uniformes");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este item?")) return;

    const { error } = await supabase
      .from("estoque_uniformes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Uniforme excluído do estoque");
      fetchItems();
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleDuplicate = async (item: any) => {
    const { id, created_at, updated_at, ...itemData } = item;
    
    const { error } = await supabase
      .from("estoque_uniformes")
      .insert({
        ...itemData,
        tipo_uniforme: `${itemData.tipo_uniforme} (Cópia)`,
      });

    if (error) {
      toast.error("Erro ao duplicar item");
    } else {
      toast.success("Item duplicado com sucesso");
      fetchItems();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum uniforme cadastrado no estoque
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isLowStock = item.quantidade_estoque <= item.quantidade_minima;
          
          return (
            <Card key={item.id} className={isLowStock ? "border-warning" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {item.tipo_uniforme}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicate(item)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Tamanho:</strong> {item.tamanho}
                </p>
                {item.cor && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Cor:</strong> {item.cor}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={isLowStock ? "destructive" : "default"}>
                    Estoque: {item.quantidade_estoque}
                  </Badge>
                  {isLowStock && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo: {item.quantidade_minima}
                </p>
                {item.observacoes && (
                  <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                    {item.observacoes}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Uniforme</DialogTitle>
          </DialogHeader>
          <UniformStockForm
            initialData={editingItem}
            onSaved={() => {
              setShowEditDialog(false);
              setEditingItem(null);
              fetchItems();
            }}
            onCancel={() => {
              setShowEditDialog(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UniformStockList;
