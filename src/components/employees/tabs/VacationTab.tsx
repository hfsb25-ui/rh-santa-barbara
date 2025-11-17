import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar } from "lucide-react";
import VacationForm from "@/components/forms/VacationForm";

interface VacationTabProps {
  employeeId: string;
}

const VacationTab = ({ employeeId }: VacationTabProps) => {
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
          {ferias.map((feria) => (
            <Card key={feria.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Férias - {feria.dias_totais} dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Período Aquisitivo</p>
                    <p className="font-medium">
                      {new Date(feria.periodo_aquisitivo_inicio).toLocaleDateString("pt-BR")} a{" "}
                      {new Date(feria.periodo_aquisitivo_fim).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Período de Gozo</p>
                    <p className="font-medium">
                      {new Date(feria.periodo_gozo_inicio).toLocaleDateString("pt-BR")} a{" "}
                      {new Date(feria.periodo_gozo_fim).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VacationTab;
