## Plano: Indicadores Estratégicos no Dashboard

Adicionar uma nova aba **"Estratégico"** no Dashboard do Gestor, agrupando todos os indicadores propostos em seções claras. Isso evita poluir as abas atuais (Visão Geral, Gráficos, Estoque, Frequência) e mantém a hierarquia visual limpa.

### Nova Aba: "Estratégico"

Posicionada entre **Gráficos** e **Estoque**, contendo 7 seções organizadas em cards:

#### 1. Pessoas & Turnover
- **Taxa de Retenção (12 meses)** — % de funcionários ativos vs admitidos no último ano
- **Tempo Médio de Casa** — média de anos por funcionário ativo
- **Evolução de Headcount** — gráfico de linha (admissões vs demissões nos últimos 12 meses)
- **Turnover Mensal** — % de saídas/total

#### 2. Férias & Compliance Trabalhista
- **Férias Vencidas (11+ meses sem gozar)** — lista crítica com nome, dias em aberto e badge vermelho
- **Férias a Vencer (próximos 60 dias)** — alerta amarelo
- **ASO Vencidos / a Vencer** — exames ocupacionais (do módulo Saúde Ocupacional)

#### 3. Absenteísmo
- **Taxa de Absenteísmo Geral** (últimos 30 dias) — total de faltas / dias úteis trabalhados
- **Absenteísmo por Setor** — barras horizontais
- **Top 5 funcionários com mais faltas** (últimos 90 dias)

#### 4. Folha & Custo
- **Custo Total da Folha (mês atual)** — somatório do `valor_bruto`
- **Custo Médio por Funcionário**
- **Adiantamentos Pendentes** — quantidade e valor "Aguardando"
- **Variação % vs mês anterior**

#### 5. TACs & Disciplinar
- **Funcionários Reincidentes** (2+ TACs) — lista com badge laranja
- **TACs por tipo de ocorrência** — distribuição
- **TACs aplicadas no mês**

#### 6. Treinamentos & Performance
- **Taxa de Conclusão de Treinamentos Obrigatórios** — % por setor
- **Funcionários sem treinamento obrigatório completo** — alerta
- **Nota Média de Avaliações** (último ciclo)

#### 7. Recrutamento
- **Vagas Abertas vs Candidaturas Recebidas**
- **Tempo Médio para Preenchimento** (dias entre abertura e contratação)

### Componente Principal

`src/components/dashboard/IndicadoresEstrategicos.tsx` — componente único que faz queries paralelas via `useQuery` e renderiza todas as 7 seções. Cada seção é um sub-componente para manter o arquivo organizado:

```text
IndicadoresEstrategicos.tsx
├── PessoasTurnoverSection
├── FeriasComplianceSection
├── AbsenteismoSection
├── FolhaCustoSection
├── TacsDisciplinarSection
├── TreinamentosSection
└── RecrutamentoSection
```

### Detalhes Técnicos

- **Filtros**: a aba respeita o `empresa_id` selecionado no `DashboardFilters` global (multi-empresa)
- **Exclusões**: funcionários com status `Demitido` excluídos de métricas (regra existente)
- **Datas**: usar helpers de `src/lib/date.ts` (formato YYYY-MM-DD)
- **Visual**: paleta Indigo/Slate, `shadow-elegant`, `rounded-xl`, ícones do lucide-react
- **Responsivo**: grid 1 col (mobile) → 2 cols (tablet) → 3-4 cols (desktop)
- **Loading**: Skeleton em cada card durante fetch
- **Tabelas**: `employees`, `ferias`, `faltas`, `folha_pagamento`, `adiantamentos`, `tacs` (via consulta), `cursos` + `aulas_concluidas`, `avaliacoes_desempenho`, `vagas` + `candidaturas`, `encaminhamentos_medicos`

### Arquivos
- **Novo**: `src/components/dashboard/IndicadoresEstrategicos.tsx`
- **Editado**: `src/components/dashboard/GestorDashboard.tsx` — adicionar TabsTrigger "Estratégico" e TabsContent renderizando o novo componente
