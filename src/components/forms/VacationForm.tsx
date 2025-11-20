import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { addYears, differenceInDays, format } from "date-fns";

interface VacationFormProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const VacationForm = ({ employeeId, onSaved, onCancel }: VacationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [periodoAquisitivoInicio, setPeriodoAquisitivoInicio] = useState("");
  const [periodoAquisitivoFim, setPeriodoAquisitivoFim] = useState("");
  const [periodoGozoInicio, setPeriodoGozoInicio] = useState("");
  const [periodoGozoFim, setPeriodoGozoFim] = useState("");
  const [diasCalculados, setDiasCalculados] = useState(0);

  const handlePeriodoAquisitivoInicioChange = (dateString: string) => {
    setPeriodoAquisitivoInicio(dateString);
    if (dateString) {
      const startDate = new Date(dateString);
      const endDate = addYears(startDate, 1);
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      setPeriodoAquisitivoFim(formattedEndDate);
    }
  };

  const handlePeriodoGozoChange = (inicio?: string, fim?: string) => {
    const inicioDate = inicio || periodoGozoInicio;
    const fimDate = fim || periodoGozoFim;
    
    if (inicioDate && fimDate) {
      const start = new Date(inicioDate);
      const end = new Date(fimDate);
      const days = differenceInDays(end, start) + 1;
      setDiasCalculados(days > 0 ? days : 0);
    } else {
      setDiasCalculados(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("ferias").insert({
      employee_id: employeeId,
      periodo_aquisitivo_inicio: periodoAquisitivoInicio,
      periodo_aquisitivo_fim: periodoAquisitivoFim,
      periodo_gozo_inicio: periodoGozoInicio,
      periodo_gozo_fim: periodoGozoFim,
      dias_totais: diasCalculados,
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período Aquisitivo - Início</Label>
                <Input
                  type="date"
                  value={periodoAquisitivoInicio}
                  onChange={(e) => handlePeriodoAquisitivoInicioChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Período Aquisitivo - Fim</Label>
                <Input
                  type="date"
                  value={periodoAquisitivoFim}
                  onChange={(e) => setPeriodoAquisitivoFim(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Período de Gozo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={periodoGozoInicio}
                    onChange={(e) => {
                      setPeriodoGozoInicio(e.target.value);
                      handlePeriodoGozoChange(e.target.value, undefined);
                    }}
                    required
                  />
                </div>
                <div>
                  <Label>Data de Fim</Label>
                  <Input
                    type="date"
                    value={periodoGozoFim}
                    onChange={(e) => {
                      setPeriodoGozoFim(e.target.value);
                      handlePeriodoGozoChange(undefined, e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
              {diasCalculados > 0 && (
                <div className="mt-3 p-3 bg-primary/10 rounded-md">
                  <p className="text-sm font-medium">
                    Total de dias: <span className="text-lg">{diasCalculados}</span> {diasCalculados === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || diasCalculados === 0}>
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VacationForm;
