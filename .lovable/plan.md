

# Adicionar Tools Completos ao Cerebrum

## Situacao Atual

O Cerebrum ja possui 13 tools de consulta cobrindo as tabelas principais. Porem, existem **~20 tabelas** que nao sao consultaveis diretamente, incluindo dados importantes como metas de funcionarios, progresso detalhado de treinamentos, historico de movimentacoes, variaveis fixas, arquivos, contratos e detalhes de candidaturas.

## Tabelas NAO cobertas atualmente

| Tabela | Dados |
|--------|-------|
| `metas_funcionario` | Metas individuais de desempenho |
| `modulos`, `aulas`, `progresso_treinamento` | Detalhes de modulos/aulas e progresso individual |
| `notas_avaliacao`, `criterios_avaliacao` | Notas detalhadas por criterio nas avaliacoes |
| `historico_banco_horas` | Movimentacoes de banco de horas |
| `historico_estoque_epis`, `historico_estoque_uniformes` | Movimentacoes de entrada/saida de estoque |
| `historico_folgas` | Alteracoes no saldo de folgas |
| `historico_status_candidatura` | Timeline de status das candidaturas |
| `variaveis_fixas_funcionario` | Proventos/descontos fixos por funcionario |
| `variaveis_folha` | Variaveis globais da folha de pagamento |
| `employee_files` | Arquivos/documentos dos funcionarios |
| `modelos_contrato` | Templates de contrato |
| `login_history` | Historico de login dos usuarios |
| `configuracao_setor` | Configuracao de lotacao por setor |
| `configuracoes_ferias` | Regras de ferias |
| `plano_checklist_templates`, `plano_checklist_itens` | Templates de checklists |
| `uniformes`, `epis` (entregas individuais) | Ja parcialmente no estoque, mas sem detalhe individual |

## Novos Tools a Adicionar (8 tools)

### 1. `consultar_metas`
- Tabela: `metas_funcionario`
- Busca metas por funcionario, status (pendente, em_andamento, concluida)
- Parametros: `nome_funcionario`, `status`

### 2. `consultar_progresso_treinamento`
- Tabelas: `modulos`, `aulas`, `progresso_treinamento`
- Progresso individual de cada funcionario nos cursos
- Parametros: `nome_funcionario`, `curso`

### 3. `consultar_detalhes_avaliacao`
- Tabelas: `notas_avaliacao`, `criterios_avaliacao`
- Notas detalhadas por criterio de cada avaliacao
- Parametros: `nome_funcionario`

### 4. `consultar_historicos`
- Tabelas: `historico_banco_horas`, `historico_estoque_epis`, `historico_estoque_uniformes`, `historico_folgas`
- Movimentacoes e alteracoes recentes
- Parametros: `tipo` (banco_horas, estoque_epis, estoque_uniformes, folgas), `nome_funcionario`

### 5. `consultar_variaveis_fixas`
- Tabelas: `variaveis_fixas_funcionario`, `variaveis_folha`
- Proventos/descontos fixos e variaveis globais da folha
- Parametros: `nome_funcionario`

### 6. `consultar_arquivos_funcionario`
- Tabela: `employee_files`
- Lista de documentos/arquivos de um funcionario
- Parametros: `nome_funcionario`

### 7. `consultar_contratos`
- Tabela: `modelos_contrato`
- Templates de contrato disponiveis
- Parametros: nenhum

### 8. `consultar_configuracoes`
- Tabelas: `configuracao_setor`, `configuracoes_ferias`, `plano_checklist_templates`, `plano_checklist_itens`
- Configuracoes do sistema (lotacao, ferias, templates de checklist)
- Parametros: `tipo` (setores, ferias, checklists)

## Melhorias nos Tools Existentes

Alem dos novos tools, os seguintes serao enriquecidos:

- **`consultar_recrutamento`**: Adicionar `historico_status_candidatura` para timeline de cada candidato e detalhes completos das candidaturas
- **`consultar_treinamentos`**: Incluir contagem de modulos e aulas por curso
- **`consultar_estoque`**: Incluir entregas individuais de EPIs e uniformes com mais detalhes

## Arquivos Modificados

- `supabase/functions/whatsapp-ai/index.ts` - Adicionar 8 novas funcoes handler + tool definitions + switch cases
- `supabase/functions/ai-assistant/index.ts` - Mesmas adicoes para paridade web/WhatsApp

## Impacto

- O Cerebrum passara a cobrir **100% das tabelas** do sistema
- Nenhuma query adicional no prompt inicial (mantem o modelo retrieval)
- Cada novo tool so e chamado quando relevante a pergunta do usuario

