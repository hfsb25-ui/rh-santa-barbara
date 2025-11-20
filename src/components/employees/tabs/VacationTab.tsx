import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Check } from "lucide-react";
import VacationForm from "@/components/forms/VacationForm";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface VacationTabProps {
  employeeId: string;
  isManager?: boolean;
}

const VacationTab = ({ employeeId, isManager = false }: VacationTabProps) => {
  const [ferias, setFerias] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchFerias();
  }, [employeeId]);

  const fetchFerias = async () => {
    const { data } = await supabase
      .from("ferias")
      .select("*")
      .eq("employee_id", employeeId)
      .order("periodo_gozo_inicio", { ascending: false });

    setFerias(data || []);
  };

  const handleSaved = () => {
    setShowForm(false);
    fetchFerias();
  };

  const handleConfirmReturn = async (feriaId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("ferias")
      .update({
        data_retorno_confirmada: true,
        confirmado_por: user.id,
        data_confirmacao: new Date().toISOString(),
      })
      .eq("id", feriaId);

    if (error) {
      toast.error("Erro ao confirmar retorno");
    } else {
      toast.success("Retorno confirmado!");
      fetchFerias();
    }
  };

  const calculateProgress = (inicio: string, fim: string) => {
    const startDate = new Date(inicio);
    const endDate = new Date(fim);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = totalDays - daysPassed;
    
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    
    return { progress, daysRemaining: Math.max(0, daysRemaining), totalDays };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Férias</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Férias
        </Button>
      </div>

      {showForm && (
        <VacationForm
          employeeId={employeeId}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ferias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma féria registrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ferias.map((feria) => {
            const { progress, daysRemaining, totalDays } = calculateProgress(
              feria.periodo_gozo_inicio,
              feria.periodo_gozo_fim
            );
            const isOngoing = daysRemaining > 0 && progress > 0;
            const isFinished = daysRemaining === 0 && !feria.data_retorno_confirmada;

            return (
              <Card key={feria.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Férias - {feria.dias_totais} dias
                    </div>
                    {feria.data_retorno_confirmada && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        Retorno confirmado
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data de Início</p>
                      <p className="font-medium">
                        {new Date(feria.periodo_gozo_inicio).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data de Retorno</p>
                      <p className="font-medium">
                        {new Date(feria.periodo_gozo_fim).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {isOngoing && !feria.data_retorno_confirmada && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso das férias</span>
                        <span className="font-medium">
                          {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {isFinished && isManager && (
                    <Button
                      onClick={() => handleConfirmReturn(feria.id)}
                      className="w-full"
                      variant="default"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar Retorno
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VacationTab;
