import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { generateUniformReceipt } from "@/lib/pdfGenerator";
import SignatureCanvas from "./SignatureCanvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface UniformFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface InsertedItem {
  id: string;
  tipo_uniforme: string;
  tamanho: string;
  cor?: string;
  data_entrega: string;
  observacoes: string | null;
  quantidade: number;
}

const UniformForm = ({ employeeId, onSaved, onCancel }: UniformFormProps) => {
  const [loading, setLoading] = useState(false);
  const [lastInsertedData, setLastInsertedData] = useState<{
    items: InsertedItem[];
    employeeName: string;
    employeeCpf: string;
    employeeRole: string;
  } | null>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [insertedIds, setInsertedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    const { data, error } = await supabase
      .from("estoque_uniformes")
      .select("*")
      .gt("quantidade_estoque", 0)
      .order("tipo_uniforme");
    
    if (!error && data) {
      setStockItems(data);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um uniforme do estoque");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const dataEntrega = formData.get("data_entrega") as string;
    const observacoes = formData.get("observacoes") as string || null;

    // Get employee data for PDF
    const { data: employee } = await supabase
      .from("employees")
      .select("nome_completo, cpf, cargo")
      .eq("id", employeeId)
      .single();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const insertedItems: InsertedItem[] = [];
    const newInsertedIds: string[] = [];

    for (const itemId of selectedItems) {
      const selectedStock = stockItems.find(item => item.id === itemId);
      if (!selectedStock) continue;

      const uniformData = {
        employee_id: employeeId,
        tipo_uniforme: selectedStock.tipo_uniforme,
        tamanho: selectedStock.tamanho,
        quantidade: 1,
        data_entrega: dataEntrega,
        observacoes: observacoes,
      };

      // Insert uniform record
      const { data: insertedUniform, error } = await supabase.from("uniformes").insert(uniformData).select().single();

      if (error) {
        toast.error(`Erro ao salvar ${selectedStock.tipo_uniforme}`);
        continue;
      }

      // Decrease stock
      const { error: stockError } = await supabase
        .from("estoque_uniformes")
        .update({ quantidade_estoque: selectedStock.quantidade_estoque - 1 })
        .eq("id", itemId);

      // Register stock movement
      if (!stockError) {
        await supabase.from("historico_estoque_uniformes").insert({
          estoque_uniforme_id: itemId,
          tipo_movimentacao: "saida",
          quantidade: 1,
          quantidade_anterior: selectedStock.quantidade_estoque,
          quantidade_nova: selectedStock.quantidade_estoque - 1,
          motivo: "Distribuição para funcionário",
          employee_id: employeeId,
          created_by: user?.id,
        });
      }

      newInsertedIds.push(insertedUniform.id);
      insertedItems.push({
        id: insertedUniform.id,
        tipo_uniforme: selectedStock.tipo_uniforme,
        tamanho: selectedStock.tamanho,
        cor: selectedStock.cor,
        data_entrega: dataEntrega,
        observacoes: observacoes,
        quantidade: 1,
      });
    }

    setLoading(false);

    if (insertedItems.length === 0) {
      toast.error("Nenhum uniforme foi registrado");
      return;
    }

    toast.success(`${insertedItems.length} uniforme(s) registrado(s) com sucesso!`);
    setInsertedIds(newInsertedIds);
    setLastInsertedData({
      items: insertedItems,
      employeeName: employee?.nome_completo || "",
      employeeCpf: employee?.cpf || "",
      employeeRole: employee?.cargo || "",
    });
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (insertedIds.length === 0) return;

    // Update all inserted records with the signature
    for (const id of insertedIds) {
      await supabase
        .from("uniformes")
        .update({
          assinatura_funcionario: signatureData,
          data_assinatura: new Date().toISOString(),
        })
        .eq("id", id);
    }

    setSignature(signatureData);
    setShowSignatureDialog(false);
    toast.success("Assinatura salva em todos os registros!");
  };

  const handleSkipSignature = () => {
    setShowSignatureDialog(false);
    toast.info("Lembre o funcionário de assinar após o login");
  };

  const handleDownloadReceipt = async () => {
    if (lastInsertedData && insertedIds.length > 0) {
      // Buscar assinatura do banco de dados (do primeiro item)
      const { data: uniformeData } = await supabase
        .from("uniformes")
        .select("assinatura_funcionario")
        .eq("id", insertedIds[0])
        .single();

      // Gerar recibo para cada item
      for (const item of lastInsertedData.items) {
        generateUniformReceipt({
          employeeName: lastInsertedData.employeeName,
          employeeCpf: lastInsertedData.employeeCpf,
          employeeRole: lastInsertedData.employeeRole,
          tipoUniforme: item.tipo_uniforme,
          tamanho: item.tamanho,
          quantidade: item.quantidade,
          dataEntrega: item.data_entrega,
          observacoes: item.observacoes,
          assinatura: uniformeData?.assinatura_funcionario || signature,
        });
      }
      
      toast.success(`${lastInsertedData.items.length} recibo(s) baixado(s)!`);
      onSaved();
      setLastInsertedData(null);
      setSignature(null);
      setInsertedIds([]);
      setSelectedItems([]);
    }
  };

  return (
    <>
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capturar Assinatura do Funcionário</DialogTitle>
          </DialogHeader>
          <SignatureCanvas
            onSave={handleSaveSignature}
            onCancel={handleSkipSignature}
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleSkipSignature}>
              Pular (funcionário assinará depois)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registrar Uniforme</span>
            {selectedItems.length > 0 && (
              <Badge variant="secondary">{selectedItems.length} selecionado(s)</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Selecione os Uniformes do Estoque (múltipla seleção)</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {stockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum uniforme disponível no estoque</p>
              ) : (
                stockItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.tipo_uniforme} - Tamanho: {item.tamanho} {item.cor && `- Cor: ${item.cor}`} - Estoque: {item.quantidade_estoque}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <Label>Data de Entrega</Label>
            <Input name="data_entrega" type="date" required />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="observacoes" />
          </div>
          <div className="flex gap-2">
            {!lastInsertedData ? (
              <>
                <Button type="submit" disabled={loading || selectedItems.length === 0}>
                  {loading ? "Salvando..." : `Salvar ${selectedItems.length > 0 ? `(${selectedItems.length})` : ""}`}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button type="button" onClick={handleDownloadReceipt}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Baixar Recibos ({lastInsertedData.items.length})
                </Button>
                <Button type="button" variant="outline" onClick={() => { onSaved(); setLastInsertedData(null); setSelectedItems([]); }}>
                  Fechar
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  );
};

export default UniformForm;
