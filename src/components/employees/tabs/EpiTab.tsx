import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Shield, Trash2, FileDown } from "lucide-react";
import EpiForm from "@/components/forms/EpiForm";
import { toast } from "sonner";
import { generateEpiReceipt } from "@/lib/pdfGenerator";

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

  const handleReprintReceipt = async (epi: any) => {
    // Buscar dados completos do funcionário
    const { data: employee } = await supabase
      .from("employees")
      .select("nome_completo, cpf, cargo")
      .eq("id", employeeId)
      .single();

    // Buscar dados completos do EPI do estoque (se disponível)
    const { data: stockData } = await supabase
      .from("estoque_epis")
      .select("marca_modelo, ca, tamanho, finalidade")
      .eq("tipo_epi", epi.tipo_epi)
      .limit(1)
      .maybeSingle();

    if (!employee) {
      toast.error("Erro ao buscar dados do funcionário");
      return;
    }

    generateEpiReceipt({
      employeeName: employee.nome_completo,
      employeeCpf: employee.cpf || "Não informado",
      employeeRole: employee.cargo,
      tipoEpi: epi.tipo_epi,
      marcaModelo: stockData?.marca_modelo || null,
      ca: stockData?.ca || null,
      quantidade: epi.quantidade,
      tamanho: stockData?.tamanho || null,
      finalidade: stockData?.finalidade || null,
      dataEntrega: epi.data_entrega,
      observacoes: epi.observacoes,
      assinatura: epi.assinatura_funcionario,
    });

    toast.success("Recibo gerado com sucesso!");
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleReprintReceipt(epi)}
                      title="Reimprimir Recibo"
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(epi.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
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
                  {epi.assinatura_funcionario && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Status da Assinatura</p>
                      <p className="font-medium text-green-600">✓ Assinado digitalmente</p>
                    </div>
                  )}
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
