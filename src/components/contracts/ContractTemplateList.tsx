import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { ContractTemplateDialog } from "./ContractTemplateDialog";

interface Funcao {
  id: string;
  nome: string;
  cbo: string | null;
}

interface ContractTemplate {
  id: string;
  funcao_id: string;
  tipo_contrato: string;
  conteudo_template: string;
}

export const ContractTemplateList = () => {
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFuncao, setSelectedFuncao] = useState<Funcao | null>(null);
  const [selectedTipoContrato, setSelectedTipoContrato] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [funcoesResult, templatesResult] = await Promise.all([
        supabase.from("funcoes").select("*").order("nome"),
        supabase.from("modelos_contrato").select("*"),
      ]);

      if (funcoesResult.error) throw funcoesResult.error;
      if (templatesResult.error) throw templatesResult.error;

      setFuncoes(funcoesResult.data || []);
      setTemplates(templatesResult.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTemplateForFuncaoAndTipo = (funcaoId: string, tipoContrato: string) => {
    return templates.find(
      (t) => t.funcao_id === funcaoId && t.tipo_contrato === tipoContrato
    );
  };

  const handleEditTemplate = (funcao: Funcao, tipoContrato: string) => {
    setSelectedFuncao(funcao);
    setSelectedTipoContrato(tipoContrato);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFuncao(null);
    setSelectedTipoContrato("");
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tiposContrato = [
    { value: "fixo", label: "Fixo", dbValue: "fixo" },
    { value: "intermitente", label: "Intermitente", dbValue: "intermitente" },
    { value: "Prestador de Serviço", label: "Prestador de Serviço", dbValue: "prestador_servico" },
  ];

  return (
    <div className="space-y-6">
      {funcoes.map((funcao) => (
        <Card key={funcao.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {funcao.nome}
              {funcao.cbo && (
                <span className="text-sm text-muted-foreground font-normal">
                  (CBO: {funcao.cbo})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiposContrato.map((tipo) => {
                const template = getTemplateForFuncaoAndTipo(
                  funcao.id,
                  tipo.dbValue
                );
                const hasTemplate = !!template;

                return (
                  <Button
                    key={tipo.value}
                    variant={hasTemplate ? "default" : "outline"}
                    className="h-auto py-4"
                    onClick={() => handleEditTemplate(funcao, tipo.value)}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{tipo.label}</div>
                      <div className="text-xs mt-1">
                        {hasTemplate ? "Template Configurado" : "Configurar Template"}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {funcoes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma função cadastrada. Cadastre funções primeiro para configurar
            contratos.
          </CardContent>
        </Card>
      )}

      <ContractTemplateDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        funcao={selectedFuncao}
        tipoContrato={selectedTipoContrato}
        existingTemplate={
          selectedFuncao
            ? getTemplateForFuncaoAndTipo(selectedFuncao.id, selectedTipoContrato)
            : undefined
        }
      />
    </div>
  );
};
