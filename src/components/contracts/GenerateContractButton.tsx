import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GenerateContractButtonProps {
  employee: any;
}

export const GenerateContractButton = ({
  employee,
}: GenerateContractButtonProps) => {
  const [loading, setLoading] = useState(false);

  const generateContract = async () => {
    setLoading(true);
    try {
      // Buscar a função do funcionário
      const { data: funcaoData, error: funcaoError } = await supabase
        .from("funcoes")
        .select("id, nome")
        .eq("nome", employee.cargo)
        .single();

      if (funcaoError) throw new Error("Função não encontrada");

      // Mapear o tipo de contrato do funcionário para o formato do banco de dados
      const tipoContratoDb = employee.tipo_contrato === "Prestador de Serviço" 
        ? "prestador_servico" 
        : employee.tipo_contrato;

      // Buscar o template de contrato
      const { data: templateData, error: templateError } = await supabase
        .from("modelos_contrato")
        .select("*")
        .eq("funcao_id", funcaoData.id)
        .eq("tipo_contrato", tipoContratoDb)
        .maybeSingle();

      if (templateError) throw templateError;

      if (!templateData) {
        toast.error(
          "Template de contrato não configurado para esta função e tipo de contrato"
        );
        return;
      }

      // Substituir variáveis no template
      let conteudo = templateData.conteudo_template;
      conteudo = conteudo.replace(/\{\{NOME_COMPLETO\}\}/g, employee.nome_completo || "");
      conteudo = conteudo.replace(/\{\{CPF\}\}/g, employee.cpf || "");
      conteudo = conteudo.replace(/\{\{ENDERECO\}\}/g, employee.endereco || "");
      conteudo = conteudo.replace(/\{\{TELEFONE\}\}/g, employee.telefone || "");
      conteudo = conteudo.replace(/\{\{CARGO\}\}/g, employee.cargo || "");
      conteudo = conteudo.replace(/\{\{SETOR\}\}/g, employee.setor || "");
      conteudo = conteudo.replace(
        /\{\{DATA_ADMISSAO\}\}/g,
        employee.data_admissao
          ? format(new Date(employee.data_admissao), "dd/MM/yyyy", {
              locale: ptBR,
            })
          : ""
      );
      conteudo = conteudo.replace(
        /\{\{SALARIO\}\}/g,
        employee.salario
          ? new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(employee.salario)
          : ""
      );
      conteudo = conteudo.replace(
        /\{\{DATA_ATUAL\}\}/g,
        format(new Date(), "dd/MM/yyyy", { locale: ptBR })
      );

      // Gerar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 7;
      let y = margin;

      // Dividir o conteúdo em linhas
      const lines = doc.splitTextToSize(
        conteudo,
        pageWidth - 2 * margin
      );

      // Adicionar linhas ao PDF
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      // Salvar PDF
      const fileName = `Contrato_${employee.nome_completo}_${format(
        new Date(),
        "ddMMyyyy"
      )}.pdf`;
      doc.save(fileName);

      toast.success("Contrato gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar contrato: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateContract}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Gerar Contrato
    </Button>
  );
};
