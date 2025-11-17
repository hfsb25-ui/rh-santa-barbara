import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface EpiFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const EpiForm = ({ employeeId, onSaved, onCancel }: EpiFormProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from("epis").insert({
      employee_id: employeeId,
      tipo_epi: formData.get("tipo_epi") as string,
      quantidade: parseInt(formData.get("quantidade") as string),
      data_entrega: formData.get("data_entrega") as string,
      observacoes: formData.get("observacoes") as string || null,
    });

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("EPI registrado!");
      onSaved();
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
            <Label>Tipo de EPI</Label>
            <Input name="tipo_epi" required />
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
            <Button type="submit" disabled={loading}>Salvar</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EpiForm;
