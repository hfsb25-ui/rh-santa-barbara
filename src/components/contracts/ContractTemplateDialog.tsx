import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Funcao {
  id: string;
  nome: string;
}

interface ContractTemplate {
  id: string;
  funcao_id: string;
  tipo_contrato: string;
  conteudo_template: string;
}

interface ContractTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  funcao: Funcao | null;
  tipoContrato: string;
  existingTemplate?: ContractTemplate;
}

export const ContractTemplateDialog = ({
  open,
  onClose,
  funcao,
  tipoContrato,
  existingTemplate,
}: ContractTemplateDialogProps) => {
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingTemplate) {
      setConteudo(existingTemplate.conteudo_template);
    } else {
      setConteudo(getDefaultTemplate());
    }
  }, [existingTemplate, tipoContrato, funcao]);

  const getDefaultTemplate = () => {
    return `CONTRATO DE TRABALHO - ${tipoContrato.toUpperCase()}

CONTRATANTE: Hotel Fazenda Santa Bárbara
CNPJ: [CNPJ da empresa]

CONTRATADO: {{NOME_COMPLETO}}
CPF: {{CPF}}
Endereço: {{ENDERECO}}
Telefone: {{TELEFONE}}

FUNÇÃO: {{CARGO}}
SETOR: {{SETOR}}
DATA DE ADMISSÃO: {{DATA_ADMISSAO}}
SALÁRIO: R$ {{SALARIO}}

[Adicione aqui as cláusulas específicas do contrato ${tipoContrato}]

CLÁUSULA PRIMEIRA - DO OBJETO
...

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES
...

CLÁUSULA TERCEIRA - DA REMUNERAÇÃO
...

CLÁUSULA QUARTA - DO PRAZO
...

Data: {{DATA_ATUAL}}

_________________________
Assinatura do Contratante

_________________________
Assinatura do Contratado`;
  };

  const handleSave = async () => {
    if (!funcao) return;

    setLoading(true);
    try {
      // Mapear o tipo de contrato para o formato do banco de dados
      const tipoContratoDb = tipoContrato === "Prestador de Serviço" 
        ? "prestador_servico" 
        : tipoContrato;

      if (existingTemplate) {
        const { error } = await supabase
          .from("modelos_contrato")
          .update({ conteudo_template: conteudo })
          .eq("id", existingTemplate.id);

        if (error) throw error;
        toast.success("Template atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("modelos_contrato").insert([{
          funcao_id: funcao.id,
          tipo_contrato: tipoContratoDb as "fixo" | "intermitente" | "prestador_servico",
          conteudo_template: conteudo,
        }]);

        if (error) throw error;
        toast.success("Template criado com sucesso!");
      }

      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tipoLabel =
    tipoContrato === "fixo"
      ? "Fixo"
      : tipoContrato === "intermitente"
      ? "Intermitente"
      : "Prestador de Serviço";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Template de Contrato - {funcao?.nome} ({tipoLabel})
          </DialogTitle>
          <DialogDescription>
            Configure o modelo de contrato que será usado para esta função
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Use as variáveis abaixo no texto do contrato. Elas serão substituídas
            automaticamente pelos dados do funcionário:
            <ul className="list-disc list-inside mt-2 text-xs space-y-1">
              <li>
                <code>{"{{NOME_COMPLETO}}"}</code> - Nome completo do funcionário
              </li>
              <li>
                <code>{"{{CPF}}"}</code> - CPF do funcionário
              </li>
              <li>
                <code>{"{{ENDERECO}}"}</code> - Endereço do funcionário
              </li>
              <li>
                <code>{"{{TELEFONE}}"}</code> - Telefone do funcionário
              </li>
              <li>
                <code>{"{{CARGO}}"}</code> - Cargo/Função do funcionário
              </li>
              <li>
                <code>{"{{SETOR}}"}</code> - Setor do funcionário
              </li>
              <li>
                <code>{"{{DATA_ADMISSAO}}"}</code> - Data de admissão
              </li>
              <li>
                <code>{"{{SALARIO}}"}</code> - Salário do funcionário
              </li>
              <li>
                <code>{"{{DATA_ATUAL}}"}</code> - Data atual
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder="Digite o modelo do contrato..."
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
