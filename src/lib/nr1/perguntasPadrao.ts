export interface PerguntaClima {
  id: string;
  texto: string;
  /** quando true, nota baixa = bom (inversa) */
  inversa?: boolean;
}

export const PERGUNTAS_PADRAO: PerguntaClima[] = [
  { id: "pressao", texto: "Você sofre pressão excessiva no trabalho?", inversa: true },
  { id: "respeito", texto: "Seu líder trata a equipe com respeito?" },
  { id: "seguranca_emocional", texto: "Você sente segurança emocional no ambiente de trabalho?" },
  { id: "favoritismo", texto: "Existe favoritismo na sua equipe?", inversa: true },
  { id: "sobrecarga", texto: "Você se sente sobrecarregado(a)?", inversa: true },
  { id: "reconhecimento", texto: "Você se sente reconhecido(a) pelo seu trabalho?" },
  { id: "comunicacao", texto: "A comunicação entre a equipe e a liderança é clara?" },
  { id: "saude_mental", texto: "A empresa se preocupa com sua saúde mental?" },
];

export const CATEGORIAS_DENUNCIA = [
  { value: "assedio_moral", label: "Assédio Moral" },
  { value: "assedio_sexual", label: "Assédio Sexual" },
  { value: "discriminacao", label: "Discriminação" },
  { value: "abuso_autoridade", label: "Abuso de Autoridade" },
  { value: "conflito_interno", label: "Conflito Interno" },
  { value: "pressao_excessiva", label: "Pressão Excessiva" },
  { value: "outro", label: "Outro" },
];

export const STATUS_DENUNCIA = [
  { value: "recebida", label: "Recebida", color: "bg-blue-100 text-blue-700" },
  { value: "em_apuracao", label: "Em Apuração", color: "bg-yellow-100 text-yellow-700" },
  { value: "concluida", label: "Concluída", color: "bg-green-100 text-green-700" },
  { value: "arquivada", label: "Arquivada", color: "bg-slate-100 text-slate-700" },
];
