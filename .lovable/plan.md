
# Plano: Módulo de Inteligência Artificial para RH

## Visão Geral
Implementar um conjunto de funcionalidades de IA que utilizam os modelos disponíveis via Lovable AI para análise preditiva, geração automática de insights e assistência inteligente para gestores de RH.

---

## Funcionalidades Propostas

### 1. Assistente de RH com IA (Chat)
Um chatbot inteligente que responde perguntas sobre:
- Consultas sobre funcionários ("Quem está de férias em março?")
- Análise de dados ("Qual o setor com maior turnover?")
- Sugestões ("Quem deveria receber promoção?")
- Relatórios rápidos ("Resumo das contratações deste ano")

### 2. Predição de Risco de Turnover
Análise preditiva usando dados históricos:
- Combina: avaliações, faltas, TACs, engajamento (logins), treinamentos
- Gera score de risco de 0-100
- Lista funcionários com maior probabilidade de saída
- Sugere ações preventivas específicas

### 3. Sugestões Automáticas de Promoção
Baseado em:
- Notas de avaliação >= 8
- Tempo de empresa
- Cursos concluídos
- Ausência de TACs recentes
- Histórico de faltas

### 4. Geração Automática de Relatórios
- Relatório mensal resumido em texto natural
- Insights sobre tendências
- Alertas importantes destacados
- Comparativo com mês anterior

### 5. Análise de Sentimento de Avaliações
- Processa comentários das avaliações
- Identifica padrões positivos/negativos
- Agrupa por setor/função

---

## Arquitetura Técnica

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ AI Assistant  │  │ Predictions   │  │ Auto Reports  │   │
│  │    (Chat)     │  │   Dashboard   │  │   Generator   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Edge Functions (Deno)                      │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  ai-assistant │  │ ai-predictions│  │  ai-reports   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lovable AI Models                        │
│         (google/gemini-2.5-flash - sem API key)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### Nova Página: `/ai-insights`

| Componente | Descrição |
|------------|-----------|
| `src/pages/AIInsights.tsx` | Página principal do módulo de IA |
| `src/components/ai/AIAssistant.tsx` | Chat interativo com IA |
| `src/components/ai/TurnoverPrediction.tsx` | Dashboard de predição de turnover |
| `src/components/ai/PromotionSuggestions.tsx` | Lista de sugestões de promoção |
| `src/components/ai/AIReportGenerator.tsx` | Gerador de relatórios com IA |
| `src/components/ai/SentimentAnalysis.tsx` | Análise de sentimento |

### Edge Functions

| Função | Propósito |
|--------|-----------|
| `supabase/functions/ai-assistant/index.ts` | Processa perguntas do chat |
| `supabase/functions/ai-predictions/index.ts` | Gera predições de turnover |
| `supabase/functions/ai-reports/index.ts` | Gera relatórios automáticos |

---

## Interface do Usuário

### Layout da Página AI Insights

```text
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar                                                   │
│                                                             │
│  🤖 Inteligência Artificial                                 │
│  Análises preditivas e assistência inteligente              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Assistente] [Turnover] [Promoções] [Relatórios] [Sentim.] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    CONTEÚDO DA ABA                   │   │
│  │                                                      │   │
│  │  (Chat / Predições / Sugestões / etc.)              │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Chat do Assistente

```text
┌─────────────────────────────────────────────────────────────┐
│  💬 Assistente de RH                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🤖 Olá! Sou seu assistente de RH. Como posso ajudar?│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  👤 Quantos funcionários temos de férias este mês?   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🤖 Atualmente há 5 funcionários de férias em        │  │
│  │  fevereiro de 2026:                                   │  │
│  │  - João Silva (01/02 - 15/02)                        │  │
│  │  - Maria Santos (10/02 - 25/02)                      │  │
│  │  ...                                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐ [Enviar]│
│  │ Digite sua pergunta...                          │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  Sugestões: [Férias] [Turnover] [Contratações] [Avaliações] │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard de Predição de Turnover

```text
┌─────────────────────────────────────────────────────────────┐
│  🎯 Predição de Risco de Turnover                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Alto Risco  │ │ Médio Risco │ │ Baixo Risco │           │
│  │     3       │ │      7      │ │     12      │           │
│  │  🔴         │ │  🟡         │ │  🟢         │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Funcionários em Atenção                             │   │
│  │                                                      │   │
│  │  1. Pedro Costa - Score: 85/100 (Alto)              │   │
│  │     ├─ Avaliação baixa: 4.2                         │   │
│  │     ├─ 5 faltas não justificadas                    │   │
│  │     └─ 2 TACs pendentes                             │   │
│  │     💡 Sugestão: Agendar reunião de feedback        │   │
│  │                                                      │   │
│  │  2. Ana Lima - Score: 72/100 (Alto)                 │   │
│  │     ├─ Sem login há 25 dias                         │   │
│  │     └─ 3 cursos obrigatórios pendentes              │   │
│  │     💡 Sugestão: Verificar engajamento              │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Gerar Análise Detalhada com IA]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados

### Assistente de IA

1. Usuário digita pergunta no chat
2. Frontend envia para edge function `ai-assistant`
3. Edge function:
   - Busca dados relevantes do banco (funcionários, férias, etc.)
   - Monta contexto com os dados
   - Envia para Lovable AI (gemini-2.5-flash)
   - Retorna resposta processada
4. Frontend exibe resposta formatada

### Predição de Turnover

1. Coleta dados: avaliações, faltas, TACs, logins, treinamentos
2. Calcula score de risco baseado em pesos:
   - Avaliação baixa: 30%
   - Faltas frequentes: 20%
   - TACs pendentes: 20%
   - Baixo engajamento: 15%
   - Treinamentos pendentes: 15%
3. IA gera sugestões personalizadas para cada funcionário de risco

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/AIInsights.tsx` | Criar |
| `src/components/ai/AIAssistant.tsx` | Criar |
| `src/components/ai/TurnoverPrediction.tsx` | Criar |
| `src/components/ai/PromotionSuggestions.tsx` | Criar |
| `src/components/ai/AIReportGenerator.tsx` | Criar |
| `src/components/ai/SentimentAnalysis.tsx` | Criar |
| `supabase/functions/ai-assistant/index.ts` | Criar |
| `supabase/functions/ai-predictions/index.ts` | Criar |
| `supabase/functions/ai-reports/index.ts` | Criar |
| `supabase/config.toml` | Modificar |
| `src/App.tsx` | Modificar (adicionar rota) |
| `src/components/dashboard/GestorDashboard.tsx` | Modificar (adicionar acesso) |

---

## Modelo de IA

Utilizaremos o **google/gemini-2.5-flash** via Lovable AI:
- Sem necessidade de API key externa
- Bom equilíbrio entre velocidade e qualidade
- Suporta análise de texto e raciocínio

---

## Benefícios

- **Tomada de decisão baseada em dados**: Insights acionáveis sobre a equipe
- **Prevenção proativa**: Identificar riscos antes que se tornem problemas
- **Economia de tempo**: Relatórios automáticos e respostas instantâneas
- **Melhoria contínua**: Análise de sentimento para entender a equipe
- **Interface amigável**: Chat natural para consultas rápidas
