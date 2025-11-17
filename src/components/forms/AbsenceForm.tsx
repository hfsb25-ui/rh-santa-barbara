import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AbsenceForm = ({ employeeId, onSaved, onCancel }: any) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from("afastamentos").insert({
      employee_id: employeeId,
      data_inicio: formData.get("data_inicio") as string,
      data_fim: formData.get("data_fim") as string,
      motivo: formData.get("motivo") as string,
      cid: formData.get("cid") as string || null,
    });

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Afastamento registrado!");
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Afastamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input name="data_inicio" type="date" required />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input name="data_fim" type="date" required />
            </div>
          </div>
          <div>
            <Label>Motivo</Label>
            <Textarea name="motivo" required />
          </div>
          <div>
            <Label>CID (opcional)</Label>
            <Input name="cid" />
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

export default AbsenceForm;
