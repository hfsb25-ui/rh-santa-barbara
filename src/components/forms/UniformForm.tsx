import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { generateUniformReceipt } from "@/lib/pdfGenerator";

interface UniformFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const UniformForm = ({ employeeId, onSaved, onCancel }: UniformFormProps) => {
  const [loading, setLoading] = useState(false);
  const [lastInsertedData, setLastInsertedData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const uniformData = {
      employee_id: employeeId,
      tipo_uniforme: formData.get("tipo_uniforme") as string,
      tamanho: formData.get("tamanho") as string,
      quantidade: parseInt(formData.get("quantidade") as string),
      data_entrega: formData.get("data_entrega") as string,
      observacoes: formData.get("observacoes") as string || null,
    };

    // Get employee data for PDF
    const { data: employee } = await supabase
      .from("employees")
      .select("nome_completo, cpf, cargo")
      .eq("id", employeeId)
      .single();

    const { error } = await supabase.from("uniformes").insert(uniformData);

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Uniforme registrado!");
      setLastInsertedData({
        ...uniformData,
        employeeName: employee?.nome_completo || "",
        employeeCpf: employee?.cpf || "",
        employeeRole: employee?.cargo || "",
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (lastInsertedData) {
      generateUniformReceipt({
        employeeName: lastInsertedData.employeeName,
        employeeCpf: lastInsertedData.employeeCpf,
        employeeRole: lastInsertedData.employeeRole,
        tipoUniforme: lastInsertedData.tipo_uniforme,
        tamanho: lastInsertedData.tamanho,
        quantidade: lastInsertedData.quantidade,
        dataEntrega: lastInsertedData.data_entrega,
        observacoes: lastInsertedData.observacoes,
      });
      toast.success("Recibo baixado!");
      onSaved();
      setLastInsertedData(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Uniforme</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Uniforme</Label>
            <Input name="tipo_uniforme" required />
          </div>
          <div>
            <Label>Tamanho</Label>
            <Input name="tamanho" required />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input name="quantidade" type="number" defaultValue="1" required />
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

export default UniformForm;
