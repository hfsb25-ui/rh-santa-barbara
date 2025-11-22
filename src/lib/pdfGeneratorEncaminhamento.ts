import jsPDF from "jspdf";

export const generateEncaminhamentoPDF = async (encaminhamento: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GUIA DE ENCAMINHAMENTO EM SAÚDE OCUPACIONAL", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 15;

  // Dados da Empresa
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`CNPJ: ${encaminhamento.empresas?.cnpj || ""}`, 20, yPos);
  yPos += 6;
  doc.text(`EMPRESA: ${encaminhamento.empresas?.nome || ""}`, 20, yPos);
  yPos += 10;

  // Dados do Funcionário
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO FUNCIONÁRIO", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  
  doc.text(`NOME: ${encaminhamento.employees?.nome_completo || ""}`, 20, yPos);
  yPos += 6;
  doc.text(
    `DATA DE NASCIMENTO: ${
      encaminhamento.employees?.data_nascimento
        ? new Date(encaminhamento.employees.data_nascimento).toLocaleDateString("pt-BR")
        : ""
    }`,
    20,
    yPos
  );
  yPos += 6;
  doc.text(`ENDEREÇO: ${encaminhamento.employees?.endereco || ""}`, 20, yPos);
  yPos += 6;
  
  const rgCpf = `RG: ${encaminhamento.employees?.rg || ""}                  CPF: ${encaminhamento.employees?.cpf || ""}`;
  doc.text(rgCpf, 20, yPos);
  yPos += 6;
  
  doc.text(`CTPS: ${encaminhamento.employees?.ctps || ""}`, 20, yPos);
  yPos += 10;

  // Dados Ocupacionais
  doc.setFont("helvetica", "bold");
  doc.text("DADOS OCUPACIONAIS", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  
  doc.text(`FUNÇÃO: ${encaminhamento.funcao || ""}`, 20, yPos);
  yPos += 6;
  doc.text(`CBO: ${encaminhamento.cbo || ""}`, 20, yPos);
  yPos += 6;
  doc.text(`SETOR: ${encaminhamento.setor || ""}`, 20, yPos);
  yPos += 6;
  doc.text(`MATRÍCULA E-SOCIAL: ${encaminhamento.matricula_esocial || ""}`, 20, yPos);
  yPos += 10;

  // Condições Especiais
  doc.setFont("helvetica", "bold");
  doc.text("CONDIÇÕES ESPECIAIS", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  
  const checkbox = (checked: boolean) => (checked ? "☑" : "☐");
  
  doc.text(
    `${checkbox(encaminhamento.beneficiario_reabilitado)} BENEFICIÁRIO REABILITADO`,
    20,
    yPos
  );
  yPos += 6;
  doc.text(
    `${checkbox(encaminhamento.portador_deficiencia)} PORTADOR DE DEFICIÊNCIA HABILITADO`,
    20,
    yPos
  );
  yPos += 6;
  doc.text(
    `${checkbox(encaminhamento.trabalho_altura)} REALIZA TRABALHO EM ALTURA`,
    20,
    yPos
  );
  yPos += 6;
  doc.text(
    `${checkbox(encaminhamento.espaco_confinado)} TRABALHA EM ESPAÇO CONFINADO`,
    20,
    yPos
  );
  yPos += 10;

  // Data de Admissão
  doc.text(
    `DATA DE ADMISSÃO: ${
      encaminhamento.employees?.data_admissao
        ? new Date(encaminhamento.employees.data_admissao).toLocaleDateString("pt-BR")
        : ""
    }`,
    20,
    yPos
  );
  yPos += 10;

  // Tipo de Exame
  doc.setFont("helvetica", "bold");
  doc.text("TIPO DE EXAME:", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  
  const tipoExameMap: Record<string, string> = {
    admissional: "ADMISSIONAL",
    demissional: "DEMISSIONAL",
    periodico: "PERIÓDICO",
    mudanca_riscos: "MUDANÇA DE RISCOS OCUPACIONAIS",
    retorno_trabalho: "RETORNO AO TRABALHO",
  };
  
  Object.entries(tipoExameMap).forEach(([key, label]) => {
    doc.text(`${checkbox(encaminhamento.tipo_exame === key)} ${label}`, 20, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Descrição da Atividade
  if (encaminhamento.descricao_atividade) {
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO DA ATIVIDADE:", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    
    const splitText = doc.splitTextToSize(encaminhamento.descricao_atividade, pageWidth - 40);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 6 + 5;
  }

  // Observações
  if (encaminhamento.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES:", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    
    const splitObs = doc.splitTextToSize(encaminhamento.observacoes, pageWidth - 40);
    doc.text(splitObs, 20, yPos);
    yPos += splitObs.length * 6 + 10;
  }

  // Espaço para assinatura
  yPos += 20;
  doc.line(20, yPos, 90, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.text("Assinatura e Carimbo do Médico", 20, yPos);

  // Data de emissão
  yPos += 15;
  doc.setFontSize(9);
  doc.text(
    `Data de Emissão: ${new Date(encaminhamento.data_encaminhamento).toLocaleDateString("pt-BR")}`,
    20,
    yPos
  );

  // Salvar PDF
  const fileName = `Encaminhamento_${encaminhamento.employees?.nome_completo?.replace(
    /\s+/g,
    "_"
  )}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};
