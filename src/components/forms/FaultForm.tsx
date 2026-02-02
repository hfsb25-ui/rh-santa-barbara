import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const FaultForm = ({ employeeId, onSaved, onCancel }: any) => {
  const [loading, setLoading] = useState(false);
  const [justificada, setJustificada] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dataFalta = formData.get("data") as string;

    // Coluna no banco é DATE: enviar apenas YYYY-MM-DD (evita salvar dia anterior)
    const { error } = await supabase.from("faltas").insert({
      employee_id: employeeId,
      data: dataFalta,
      justificada,
      motivo: formData.get("motivo") as string || null,
    });

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Falta registrada!");
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Falta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input name="data" type="date" required />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="justificada" checked={justificada} onCheckedChange={(v) => setJustificada(!!v)} />
            <Label htmlFor="justificada">Falta justificada</Label>
          </div>
          <div>
            <Label>Motivo</Label>
            <Textarea name="motivo" />
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

export default FaultForm;
