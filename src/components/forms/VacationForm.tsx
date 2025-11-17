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
    const inicio = new Date(formData.get("periodo_gozo_inicio") as string);
    const fim = new Date(formData.get("periodo_gozo_fim") as string);
    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await supabase.from("ferias").insert({
      employee_id: employeeId,
      periodo_aquisitivo_inicio: formData.get("periodo_aquisitivo_inicio") as string,
      periodo_aquisitivo_fim: formData.get("periodo_aquisitivo_fim") as string,
      periodo_gozo_inicio: formData.get("periodo_gozo_inicio") as string,
      periodo_gozo_fim: formData.get("periodo_gozo_fim") as string,
      dias_totais: dias,
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
              <Label>Período Aquisitivo - Início</Label>
              <Input name="periodo_aquisitivo_inicio" type="date" required />
            </div>
            <div>
              <Label>Período Aquisitivo - Fim</Label>
              <Input name="periodo_aquisitivo_fim" type="date" required />
            </div>
            <div>
              <Label>Período de Gozo - Início</Label>
              <Input name="periodo_gozo_inicio" type="date" required />
            </div>
            <div>
              <Label>Período de Gozo - Fim</Label>
              <Input name="periodo_gozo_fim" type="date" required />
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
