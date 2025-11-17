import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle } from "lucide-react";
import FaultForm from "@/components/forms/FaultForm";

interface FaultTabProps {
  employeeId: string;
}

const FaultTab = ({ employeeId }: FaultTabProps) => {
  const [faltas, setFaltas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchFaltas();
  }, [employeeId]);

  const fetchFaltas = async () => {
    const { data } = await supabase
      .from("faltas")
      .select("*")
      .eq("employee_id", employeeId)
      .order("data", { ascending: false });

    setFaltas(data || []);
  };

  const handleSaved = () => {
    setShowForm(false);
    fetchFaltas();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Faltas</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Falta
        </Button>
      </div>

      {showForm && (
        <FaultForm
          employeeId={employeeId}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {faltas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma falta registrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {faltas.map((falta) => (
            <Card key={falta.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {new Date(falta.data).toLocaleDateString("pt-BR")}
                  </div>
                  <Badge variant={falta.justificada ? "default" : "destructive"}>
                    {falta.justificada ? "Justificada" : "Não justificada"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              {falta.motivo && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">Motivo</p>
                  <p className="font-medium">{falta.motivo}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FaultTab;
