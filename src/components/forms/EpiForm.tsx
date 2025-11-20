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
import { generateEpiReceipt } from "@/lib/pdfGenerator";

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
    const { error } = await supabase.from("epis").insert(epiData);

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

    setLoading(false);
    if (stockError) {
      toast.error("Erro ao atualizar estoque");
    } else {
      toast.success("EPI registrado e estoque atualizado!");
      setLastInsertedData({
        ...epiData,
        employeeName: employee?.nome_completo || "",
        employeeCpf: employee?.cpf || "",
        employeeRole: employee?.cargo || "",
        marcaModelo: selectedStock.marca_modelo,
        ca: selectedStock.ca,
        tamanho: selectedStock.tamanho,
        finalidade: selectedStock.finalidade,
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (lastInsertedData) {
      generateEpiReceipt({
        employeeName: lastInsertedData.employeeName,
        employeeCpf: lastInsertedData.employeeCpf,
        employeeRole: lastInsertedData.employeeRole,
        tipoEpi: lastInsertedData.tipo_epi,
        quantidade: lastInsertedData.quantidade,
        dataEntrega: lastInsertedData.data_entrega,
        observacoes: lastInsertedData.observacoes,
        marcaModelo: lastInsertedData.marcaModelo,
        ca: lastInsertedData.ca,
        tamanho: lastInsertedData.tamanho,
        finalidade: lastInsertedData.finalidade,
      });
      toast.success("Recibo baixado!");
      onSaved();
      setLastInsertedData(null);
    }
  };

  return (
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
  );
};

export default EpiForm;
