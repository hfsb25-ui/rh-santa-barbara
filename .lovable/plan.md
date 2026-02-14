

# Migrar IA para Google Gemini (Gratis)

## Resumo
Trocar todas as edge functions que usam o gateway Lovable AI (`ai.gateway.lovable.dev`) para usar a API gratuita do Google Gemini (`generativelanguage.googleapis.com`) diretamente.

## Passo 1 - Obter chave de API (voce)
- Acessar https://aistudio.google.com/apikey
- Criar uma chave de API gratuita (o plano free tem limite generoso: ~1500 req/dia do Gemini Flash)
- Informar a chave quando solicitado no Lovable

## Passo 2 - Salvar o segredo
- Adicionar o segredo `GOOGLE_GEMINI_API_KEY` nas configuracoes do projeto

## Passo 3 - Atualizar as 6 Edge Functions

Todas as funcoes abaixo serao alteradas para usar a API do Google Gemini em vez do gateway Lovable:

| Funcao | Tipo de uso | Streaming |
|--------|-------------|-----------|
| `ai-assistant` | Chat com contexto RH | Sim |
| `ai-predictions` | Sugestoes de turnover | Nao |
| `ai-reports` | Relatorios mensais e sentimento | Nao |
| `whatsapp-ai` | Chat WhatsApp com tools | Nao |
| `whatsapp-daily-reminder` | Briefing matinal | Nao |
| `whatsapp-event-reminder` | Lembrete de evento | Nao |

### Mudancas em cada funcao

**Substituicao do endpoint:**
- De: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Para: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

**Substituicao da autenticacao:**
- De: `Authorization: Bearer ${LOVABLE_API_KEY}`
- Para: `Authorization: Bearer ${GOOGLE_GEMINI_API_KEY}`

**Substituicao do modelo:**
- De: `google/gemini-3-flash-preview`
- Para: `gemini-2.0-flash` (modelo gratuito mais capaz e rapido)

**Variavel de ambiente:**
- De: `Deno.env.get("LOVABLE_API_KEY")`
- Para: `Deno.env.get("GOOGLE_GEMINI_API_KEY")`

### Detalhes tecnicos

A API do Google Gemini e compativel com o formato OpenAI (`/v1beta/openai/chat/completions`), entao as mudancas sao minimas - apenas URL, chave e nome do modelo. O formato de request/response (messages, tools, streaming SSE) permanece identico.

Para funcoes com streaming (`ai-assistant`), o formato SSE do Gemini via endpoint OpenAI-compatible e identico, entao o frontend nao precisa de nenhuma alteracao.

Para funcoes com tool calling (`whatsapp-ai`), o formato de tools tambem e compativel.

## Resultado
- Zero custo de IA (plano gratuito do Google Gemini)
- Mesma qualidade de respostas (Gemini 2.0 Flash)
- Nenhuma mudanca no frontend
- Nenhuma mudanca na logica de negocio

