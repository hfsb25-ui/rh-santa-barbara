import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const UniformDistributionHistory = () => {
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistributions();
  }, []);

  const fetchDistributions = async () => {
    const { data, error } = await supabase
      .from("uniformes")
      .select(`
        *,
        employees (
          nome_completo,
          cargo,
          setor
        )
      `)
      .order("data_entrega", { ascending: false });

    if (!error && data) {
      setDistributions(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (distributions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Nenhuma distribuição de uniforme registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {distributions.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle className="text-lg">{item.tipo_uniforme}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Funcionário:</p>
              <p className="text-sm text-muted-foreground">{item.employees?.nome_completo}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Cargo:</p>
              <p className="text-sm text-muted-foreground">{item.employees?.cargo}</p>
            </div>
            {item.employees?.setor && (
              <div>
                <p className="text-sm font-medium">Setor:</p>
                <p className="text-sm text-muted-foreground">{item.employees.setor}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Tamanho:</p>
              <p className="text-sm text-muted-foreground">{item.tamanho}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Quantidade:</p>
              <p className="text-sm text-muted-foreground">{item.quantidade}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Data de Entrega:</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(item.data_entrega), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            {item.observacoes && (
              <div>
                <p className="text-sm font-medium">Observações:</p>
                <p className="text-sm text-muted-foreground">{item.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UniformDistributionHistory;
