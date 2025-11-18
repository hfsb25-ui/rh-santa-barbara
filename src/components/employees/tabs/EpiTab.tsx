import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Shield, Trash2 } from "lucide-react";
import EpiForm from "@/components/forms/EpiForm";
import { toast } from "sonner";

interface EpiTabProps {
  employeeId: string;
}

const EpiTab = ({ employeeId }: EpiTabProps) => {
  const [epis, setEpis] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEpis();
  }, [employeeId]);

  const fetchEpis = async () => {
    const { data } = await supabase
      .from("epis")
      .select("*")
      .eq("employee_id", employeeId)
      .order("data_entrega", { ascending: false });

    setEpis(data || []);
  };

  const handleSaved = () => {
    setShowForm(false);
    fetchEpis();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este EPI?")) return;

    const { error } = await supabase
      .from("epis")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir EPI");
    } else {
      toast.success("EPI excluído com sucesso");
      fetchEpis();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">EPIs Entregues</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar EPI
        </Button>
      </div>

      {showForm && (
        <EpiForm employeeId={employeeId} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
      )}

      {epis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum EPI registrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {epis.map((epi) => (
            <Card key={epi.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {epi.tipo_epi}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(epi.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{epi.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data de Entrega</p>
                    <p className="font-medium">
                      {new Date(epi.data_entrega).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {epi.observacoes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Observações</p>
                      <p className="font-medium">{epi.observacoes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EpiTab;
