import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Shirt } from "lucide-react";
import UniformForm from "@/components/forms/UniformForm";

interface UniformTabProps {
  employeeId: string;
}

const UniformTab = ({ employeeId }: UniformTabProps) => {
  const [uniformes, setUniformes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchUniformes();
  }, [employeeId]);

  const fetchUniformes = async () => {
    const { data } = await supabase
      .from("uniformes")
      .select("*")
      .eq("employee_id", employeeId)
      .order("data_entrega", { ascending: false });

    setUniformes(data || []);
  };

  const handleSaved = () => {
    setShowForm(false);
    fetchUniformes();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Uniformes Entregues</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Uniforme
        </Button>
      </div>

      {showForm && (
        <UniformForm
          employeeId={employeeId}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {uniformes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum uniforme registrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {uniformes.map((uniforme) => (
            <Card key={uniforme.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shirt className="w-4 h-4" />
                  {uniforme.tipo_uniforme}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tamanho</p>
                    <p className="font-medium">{uniforme.tamanho}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{uniforme.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data de Entrega</p>
                    <p className="font-medium">
                      {new Date(uniforme.data_entrega).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {uniforme.observacoes && (
                    <div className="col-span-3">
                      <p className="text-muted-foreground">Observações</p>
                      <p className="font-medium">{uniforme.observacoes}</p>
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

export default UniformTab;
