
# Plano: Expandir Acesso da IA a Todos os Dados do Sistema

## Situacao Atual

A edge function `ai-assistant` atualmente acessa apenas **7 tabelas**:
- `employees` (funcionarios)
- `ferias` (ferias)
- `faltas` (faltas)
- `tacs` (termos de ajuste de conduta)
- `avaliacoes_desempenho` (avaliacoes)
- `setores` (setores)
- `empresas` (empresas)

## Tabelas Disponiveis no Sistema (Total: ~45 tabelas)

O sistema possui muito mais dados que a IA poderia acessar:

| Categoria | Tabelas |
|-----------|---------|
| **Folha de Pagamento** | `folha_pagamento`, `folha_pagamento_itens`, `variaveis_folha`, `adiantamentos`, `historico_reajustes_salariais` |
| **Ponto e Horas** | `registros_ponto`, `banco_horas`, `historico_banco_horas`, `configuracao_horas_trabalho` |
| **Ferias e Folgas** | `ferias_planejadas`, `folgas`, `historico_folgas`, `configuracoes_ferias` |
| **Estoque** | `estoque_epis`, `estoque_uniformes`, `epis`, `uniformes`, `historico_estoque_epis`, `historico_estoque_uniformes` |
| **Recrutamento** | `vagas`, `candidaturas`, `historico_status_candidatura` |
| **Treinamentos** | `cursos`, `modulos`, `aulas`, `progresso_aulas`, `certificados_liberados` |
| **Avaliacoes** | `ciclos_avaliacao`, `criterios_avaliacao`, `notas_avaliacao`, `metas_funcionario` |
| **Checklists** | `plano_checklist_templates`, `plano_checklist_funcionario`, `plano_checklist_funcionario_itens` |
| **Eventos** | `eventos`, `avisos`, `avisos_leituras` |
| **Saude Ocupacional** | `encaminhamentos_medicos`, `afastamentos` |
| **Configuracoes** | `funcoes`, `configuracao_setor`, `site_settings` |

---

## Objetivo

Modificar a edge function `ai-assistant` para:
1. Buscar dados de **todas as tabelas relevantes** do sistema
2. Organizar o contexto de forma clara e estruturada
3. Adicionar mais sugestoes de perguntas no frontend
4. Permitir que a IA responda perguntas sobre qualquer aspecto do sistema

---

## Implementacao Tecnica

### Dados a Serem Adicionados ao Contexto

```text
FOLHA DE PAGAMENTO:
- Folhas processadas por mes/ano
- Total de proventos e descontos
- Adiantamentos do mes
- Historico de reajustes salariais

CONTROLE DE PONTO:
- Registros de ponto recentes
- Saldo de banco de horas por funcionario
- Horas extras e faltas de ponto

FERIAS PLANEJADAS:
- Ferias aguardando aprovacao
- Calendario de ferias futuras

ESTOQUE:
- Quantidade atual de EPIs e Uniformes
- Itens abaixo do estoque minimo
- Historico de entregas

RECRUTAMENTO:
- Vagas abertas e quantidade de candidatos
- Candidaturas por status
- Taxa de aprovacao

TREINAMENTOS:
- Cursos disponiveis e obrigatorios
- Progresso dos funcionarios
- Certificados emitidos

EVENTOS E AVISOS:
- Proximos eventos agendados
- Avisos ativos

SAUDE OCUPACIONAL:
- Exames pendentes/agendados
- Funcionarios afastados

CHECKLISTS:
- Admissoes/desligamentos em andamento
- Itens pendentes
```

---

## Alteracoes no Codigo

### 1. Edge Function `ai-assistant/index.ts`

Adicionar consultas para todas as tabelas:

```text
// Consultas adicionais
const [
  folhaPagamentoRes,
  registrosPontoRes,
  bancoHorasRes,
  feriasPlanejadasRes,
  folgasRes,
  estoqueEpisRes,
  estoqueUniformesRes,
  vagasRes,
  candidaturasRes,
  cursosRes,
  progressoAulasRes,
  eventosRes,
  avisosRes,
  encaminhamentosMedicosRes,
  afastamentosRes,
  checklistsFuncionarioRes,
  adiantamentosRes,
  funcoesRes,
  ...
] = await Promise.all([...]);
```

### 2. Contexto Organizado por Categoria

O prompt do sistema sera expandido com secoes claras:

```text
DADOS DO SISTEMA DE RH (DATA):

=== FUNCIONARIOS ===
[dados de employees]

=== FOLHA DE PAGAMENTO ===
[dados de folha_pagamento, adiantamentos]

=== CONTROLE DE PONTO ===
[dados de registros_ponto, banco_horas]

=== FERIAS E FOLGAS ===
[dados de ferias, ferias_planejadas, folgas]

=== ESTOQUE (EPIs e UNIFORMES) ===
[dados de estoque_epis, estoque_uniformes]

=== RECRUTAMENTO ===
[dados de vagas, candidaturas]

... e assim por diante
```

### 3. Novas Sugestoes no Frontend

Adicionar mais opcoes de perguntas rapidas:

```typescript
const SUGGESTIONS = [
  // Funcionarios
  "Quem esta de ferias este mes?",
  "Quantos funcionarios ativos temos?",
  // Folha
  "Resumo da folha de pagamento do mes",
  "Quais adiantamentos foram pagos?",
  // Ponto
  "Quem tem banco de horas positivo?",
  "Funcionarios com faltas de ponto",
  // Estoque
  "Quais EPIs estao em falta?",
  "Uniformes abaixo do estoque minimo",
  // Recrutamento
  "Quantas vagas abertas temos?",
  "Candidatos aguardando entrevista",
  // Treinamentos
  "Quais cursos sao obrigatorios?",
  "Funcionarios com treinamentos pendentes",
  // Eventos
  "Proximos eventos agendados",
  "Avisos ativos",
  // Saude
  "Exames medicos pendentes",
  "Funcionarios afastados",
];
```

---

## Estrutura do Contexto Expandido

Para manter o contexto organizado e dentro dos limites do modelo, usaremos:

1. **Resumos estatisticos** em vez de listar todos os registros
2. **Dados recentes** (ultimos 90 dias para historicos)
3. **Limites de registros** (ex: top 30 funcionarios por categoria)
4. **Agrupamentos** (ex: faltas por setor, nao por funcionario individual)

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/ai-assistant/index.ts` | Adicionar consultas para todas as tabelas e expandir contexto |
| `src/components/ai/AIAssistant.tsx` | Adicionar mais sugestoes de perguntas |

---

## Exemplos de Perguntas que a IA Podera Responder

Apos a implementacao, a IA podera responder:

- "Quanto gastamos em folha de pagamento no ultimo mes?"
- "Quais funcionarios tem mais de 10 horas de banco de horas?"
- "Quais EPIs precisam ser repostos?"
- "Quantas candidaturas recebemos para a vaga de Vendedor?"
- "Quais funcionarios tem exames medicos pendentes?"
- "Qual o progresso dos treinamentos obrigatorios?"
- "Quais admissoes estao em andamento?"
- "Resumo financeiro do mes"

---

## Beneficios

- **Visao completa**: IA tera acesso a todos os dados do sistema
- **Respostas precisas**: Informacoes atualizadas e contextualizadas
- **Produtividade**: Gestores podem obter qualquer informacao rapidamente
- **Insights**: IA pode cruzar dados de diferentes modulos
