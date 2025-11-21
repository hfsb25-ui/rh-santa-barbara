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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

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
    return `<h1 style="text-align: center;">CONTRATO DE TRABALHO - ${tipoContrato.toUpperCase()}</h1>

<p><strong>CONTRATANTE:</strong> {{NOME_EMPRESA}}<br>
<strong>CNPJ:</strong> {{CNPJ_EMPRESA}}<br>
<strong>Endereço:</strong> {{ENDERECO_EMPRESA}}</p>

<p><strong>CONTRATADO:</strong> {{NOME_COMPLETO}}<br>
<strong>CPF:</strong> {{CPF}}<br>
<strong>Endereço:</strong> {{ENDERECO}}<br>
<strong>Telefone:</strong> {{TELEFONE}}</p>

<p><strong>FUNÇÃO:</strong> {{CARGO}}<br>
<strong>SETOR:</strong> {{SETOR}}<br>
<strong>DATA DE ADMISSÃO:</strong> {{DATA_ADMISSAO}}<br>
<strong>SALÁRIO:</strong> R$ {{SALARIO}}</p>

<p>[Adicione aqui as cláusulas específicas do contrato ${tipoContrato}]</p>

<h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p>...</p>

<h3>CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES</h3>
<p>...</p>

<h3>CLÁUSULA TERCEIRA - DA REMUNERAÇÃO</h3>
<p>...</p>

<h3>CLÁUSULA QUARTA - DO PRAZO</h3>
<p>...</p>

<p>Data: {{DATA_ATUAL}}</p>

<p>_________________________<br>
Assinatura do Contratante</p>

<p>_________________________<br>
Assinatura do Contratado</p>`;
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
            automaticamente pelos dados do funcionário e da empresa:
            <ul className="list-disc list-inside mt-2 text-xs space-y-1">
              <li>
                <code>{"{{NOME_EMPRESA}}"}</code> - Nome da empresa
              </li>
              <li>
                <code>{"{{CNPJ_EMPRESA}}"}</code> - CNPJ da empresa
              </li>
              <li>
                <code>{"{{ENDERECO_EMPRESA}}"}</code> - Endereço da empresa
              </li>
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

        <RichTextEditor
          content={conteudo}
          onChange={setConteudo}
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
