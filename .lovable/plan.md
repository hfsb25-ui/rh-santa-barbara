

# Plano para Reduzir o Consumo de Tokens do Cerebrum

## Diagnostico Atual

Analisei toda a arquitetura do Cerebrum e identifiquei os principais pontos de consumo excessivo de tokens:

1. **System prompt muito extenso** (~2.500 caracteres) enviado em TODA requisicao
2. **Resumo Minimo** carregado em toda mensagem (mesmo quando desnecessario)
3. **100 memorias** carregadas do banco em toda requisicao
4. **21 tool definitions** (~3.000 tokens) enviadas em toda chamada a IA
5. **Tool calls nao-streaming** + resposta final simulada como streaming = 2 chamadas minimas a IA por pergunta simples
6. **Dados retornados pelas tools muito verbosos** (listas completas com formatacao pesada)
7. **Historico de mensagens do frontend** enviado sem limite
8. **`consultar_resumo_geral`** executa TODAS as 12 consultas de uma vez

## Acoes Propostas (por impacto)

### 1. Compactar o System Prompt
- Reduzir texto descritivo da personalidade (manter essencia, cortar repeticoes)
- Mover a historia de criacao para uma tool separada (`consultar_identidade`) em vez de enviar em toda mensagem
- Economia estimada: ~500 tokens por mensagem

### 2. Limitar Historico de Mensagens
- No frontend, enviar apenas as ultimas 6-8 mensagens (3-4 pares user/assistant) em vez de todo o historico
- Economia estimada: cresce com o uso, pode chegar a milhares de tokens

### 3. Carregar Memorias sob Demanda
- Em vez de carregar 100 memorias em toda requisicao, criar uma tool `consultar_memorias` que a IA chama quando precisa
- Remover o bloco de memorias do system prompt
- Economia estimada: ~200-1.000 tokens por mensagem

### 4. Compactar Retorno das Tools
- Reduzir formatacao dos dados retornados (remover labels redundantes, usar formato mais compacto)
- Limitar resultados: ex. listar top 10 em vez de 200 funcionarios
- Economia estimada: variavel, ate 50% menos tokens nas respostas de tools

### 5. Remover o Resumo Minimo do Prompt Inicial
- Mover o resumo para uma tool `consultar_resumo_rapido` que a IA chama quando precisa de contexto geral
- Nao carregar automaticamente
- Economia estimada: ~200 tokens por mensagem

### 6. Streaming Real na Resposta Final
- Usar `stream: true` na chamada final da IA em vez de gerar tudo e simular SSE
- Nao reduz tokens diretamente, mas melhora latencia percebida

### 7. Cache de Configuracao da IA
- Evitar consultar `configuracoes_ia` em toda requisicao (usar valor em memoria com TTL)

## Detalhes Tecnicos

### Arquivo: `supabase/functions/ai-assistant/index.ts`

**System prompt compactado:**
- Remover bloco "IDENTIDADE E HISTORIA DE CRIACAO" (mover para tool)
- Remover lista de tools do prompt (a IA ja recebe via parametro `tools`)
- Condensar regras de personalidade em 2-3 linhas

**Nova tool `consultar_memorias`:**
```text
function consultar_memorias(supabase, params)
  -> busca cerebrum_memorias filtrado por categoria se fornecida
```

**Nova tool `consultar_identidade`:**
```text
function consultar_identidade()
  -> retorna historia de criacao do Cerebrum
```

**Limite de historico no frontend (`AIAssistant.tsx`):**
```text
- Enviar apenas as ultimas 8 mensagens no body da requisicao
- Manter todas localmente para exibicao
```

**Compactacao de retornos das tools:**
- `consultarFuncionarios`: limitar a 30 resultados, formato mais curto
- `consultarResumoGeral`: remover (ou deprecar), ja que cada area tem sua tool
- Outras tools: reduzir `.limit()` e cortar campos desnecessarios

### Arquivo: `src/components/ai/AIAssistant.tsx`

- Limitar array `messages` enviado ao backend para as ultimas 8 entradas

### Arquivo: `supabase/functions/whatsapp-ai/index.ts`

- Aplicar as mesmas otimizacoes de prompt e memorias

## Resultado Esperado

- Reducao de **40-60%** no consumo de tokens por interacao
- Respostas mais rapidas (menos dados no prompt inicial)
- Mesma qualidade de resposta (tools continuam disponiveis sob demanda)

