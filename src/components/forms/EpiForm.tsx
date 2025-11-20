import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileDown, PenTool } from "lucide-react";
import { generateEpiReceipt } from "@/lib/pdfGenerator";
import SignatureCanvas from "./SignatureCanvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EpiFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const EpiForm = ({ employeeId, onSaved, onCancel }: EpiFormProps) => {
  const [loading, setLoading] = useState(false);
  const [lastInsertedData, setLastInsertedData] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    const { data, error } = await supabase
      .from("estoque_epis")
      .select("*")
      .gt("quantidade_estoque", 0)
      .order("tipo_epi");
    
    if (!error && data) {
      setStockItems(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedItem) {
      toast.error("Selecione um EPI do estoque");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const selectedStock = stockItems.find(item => item.id === selectedItem);
    
    if (!selectedStock) {
      toast.error("Item não encontrado no estoque");
      setLoading(false);
      return;
    }

    const epiData = {
      employee_id: employeeId,
      tipo_epi: selectedStock.tipo_epi,
      quantidade: 1,
      data_entrega: formData.get("data_entrega") as string,
      observacoes: formData.get("observacoes") as string || null,
    };

    // Get employee data for PDF
    const { data: employee } = await supabase
      .from("employees")
      .select("nome_completo, cpf, cargo")
      .eq("id", employeeId)
      .single();

    // Insert EPI record
    const { data: insertedEpi, error } = await supabase.from("epis").insert(epiData).select().single();

    if (error) {
      toast.error("Erro ao salvar");
      setLoading(false);
      return;
    }

    // Decrease stock
    const { error: stockError } = await supabase
      .from("estoque_epis")
      .update({ quantidade_estoque: selectedStock.quantidade_estoque - 1 })
      .eq("id", selectedItem);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Register stock movement
    if (!stockError) {
      await supabase.from("historico_estoque_epis").insert({
        estoque_epi_id: selectedItem,
        tipo_movimentacao: "saida",
        quantidade: 1,
        quantidade_anterior: selectedStock.quantidade_estoque,
        quantidade_nova: selectedStock.quantidade_estoque - 1,
        motivo: "Distribuição para funcionário",
        employee_id: employeeId,
        created_by: user?.id,
      });
    }

    setLoading(false);
    if (stockError) {
      toast.error("Erro ao atualizar estoque");
    } else {
      toast.success("EPI registrado e estoque atualizado!");
      setLastInsertedId(insertedEpi.id);
      setLastInsertedData({
        ...epiData,
        employeeName: employee?.nome_completo || "",
        employeeCpf: employee?.cpf || "",
        employeeRole: employee?.cargo || "",
        marca: selectedStock.marca_modelo || "",
        ca: selectedStock.ca || "",
        finalidade: selectedStock.finalidade || "",
        tamanho: selectedStock.tamanho || "",
      });
      setShowSignatureDialog(true);
    }
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (!lastInsertedId) return;

    const { error } = await supabase
      .from("epis")
      .update({
        assinatura_funcionario: signatureData,
        data_assinatura: new Date().toISOString(),
      })
      .eq("id", lastInsertedId);

    if (error) {
      toast.error("Erro ao salvar assinatura");
      return;
    }

    setSignature(signatureData);
    setShowSignatureDialog(false);
    toast.success("Assinatura salva com sucesso!");
  };

  const handleSkipSignature = () => {
    setShowSignatureDialog(false);
    toast.info("Lembre o funcionário de assinar após o login");
  };

  const handleDownloadReceipt = async () => {
    if (lastInsertedData && lastInsertedId) {
      // Buscar assinatura do banco de dados
      const { data: epiData } = await supabase
        .from("epis")
        .select("assinatura_funcionario")
        .eq("id", lastInsertedId)
        .single();

      generateEpiReceipt({
        employeeName: lastInsertedData.employeeName,
        employeeCpf: lastInsertedData.employeeCpf,
        employeeRole: lastInsertedData.employeeRole,
        tipoEpi: lastInsertedData.tipo_epi,
        marcaModelo: lastInsertedData.marca,
        ca: lastInsertedData.ca,
        quantidade: lastInsertedData.quantidade,
        tamanho: lastInsertedData.tamanho,
        finalidade: lastInsertedData.finalidade,
        dataEntrega: lastInsertedData.data_entrega,
        observacoes: lastInsertedData.observacoes,
        assinatura: epiData?.assinatura_funcionario || signature,
      });
      toast.success("Recibo baixado!");
      onSaved();
      setLastInsertedData(null);
      setSignature(null);
      setLastInsertedId(null);
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
          <CardTitle>Registrar EPI</CardTitle>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Selecione o EPI do Estoque</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {stockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum EPI disponível no estoque</p>
              ) : (
                stockItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={selectedItem === item.id}
                      onCheckedChange={(checked) => {
                        setSelectedItem(checked ? item.id : null);
                      }}
                    />
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.tipo_epi} {item.marca_modelo && `- ${item.marca_modelo}`} {item.tamanho && `(${item.tamanho})`} - Estoque: {item.quantidade_estoque}
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
                <Button type="submit" disabled={loading}>Salvar</Button>
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button type="button" onClick={handleDownloadReceipt}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Baixar Recibo
                </Button>
                <Button type="button" variant="outline" onClick={() => { onSaved(); setLastInsertedData(null); }}>
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

export default EpiForm;
