import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface VacationFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const VacationForm = ({ employeeId, onSaved, onCancel }: VacationFormProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dataInicio = formData.get("data_inicio") as string;
    const diasTotais = parseInt(formData.get("dias_totais") as string);
    
    // Calculate end date
    const inicio = new Date(dataInicio);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + diasTotais - 1);

    const { error } = await supabase.from("ferias").insert({
      employee_id: employeeId,
      periodo_aquisitivo_inicio: dataInicio,
      periodo_aquisitivo_fim: fim.toISOString().split('T')[0],
      periodo_gozo_inicio: dataInicio,
      periodo_gozo_fim: fim.toISOString().split('T')[0],
      dias_totais: diasTotais,
    });

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Férias registradas!");
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Férias</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início das Férias</Label>
              <Input name="data_inicio" type="date" required />
            </div>
            <div>
              <Label>Quantidade de Dias</Label>
              <Input name="dias_totais" type="number" min="1" max="30" required />
            </div>
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

export default VacationForm;
