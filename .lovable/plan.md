
# Plano: Integrar Assistente IA com WhatsApp via Evolution API

## Visao Geral

Criar uma edge function que recebe mensagens do WhatsApp (via webhook da Evolution API), processa a pergunta usando o mesmo assistente de IA que ja existe no sistema, e envia a resposta de volta para o WhatsApp.

## Como Vai Funcionar

```text
Admin envia          Evolution API          Edge Function           AI Assistant
mensagem no   --->   (webhook)     --->     whatsapp-ai    --->     ai-assistant
WhatsApp                                        |                       |
                                                |                       |
Admin recebe  <---   Evolution API  <---    Resposta formatada  <---  Resposta IA
resposta no           (send text)
WhatsApp
```

## Requisitos

O admin precisa ter:
1. Uma instancia da Evolution API rodando (auto-hospedada ou em nuvem)
2. Um numero de WhatsApp conectado na instancia
3. O webhook da instancia configurado para apontar para a edge function

## Segredos Necessarios

| Segredo | Descricao |
|---------|-----------|
| `EVOLUTION_API_URL` | URL base da instancia Evolution API (ex: `https://evolution.seudominio.com`) |
| `EVOLUTION_API_KEY` | Chave de API da instancia Evolution |
| `EVOLUTION_INSTANCE_NAME` | Nome da instancia configurada na Evolution API |
| `WHATSAPP_ALLOWED_NUMBERS` | Numeros de telefone autorizados a usar o assistente (separados por virgula, ex: `5511999999999,5511888888888`) |

## Arquitetura

### Edge Function: `whatsapp-ai`

Responsabilidades:
1. Receber o webhook da Evolution API (evento `MESSAGES_UPSERT`)
2. Validar se a mensagem veio de um numero autorizado (seguranca)
3. Extrair o texto da mensagem
4. Buscar todos os dados do sistema (mesma logica do `ai-assistant`)
5. Enviar para o Lovable AI (sem streaming, resposta completa)
6. Enviar a resposta de volta via Evolution API (`POST /message/sendText/{instance}`)

### Formato do Webhook (Evolution API - MESSAGES_UPSERT)

```text
{
  "event": "messages.upsert",
  "instance": "nome-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "..."
    },
    "message": {
      "conversation": "Quem esta de ferias este mes?"
    }
  }
}
```

### Envio de Resposta (Evolution API)

```text
POST {EVOLUTION_API_URL}/message/sendText/{INSTANCE_NAME}
Headers: { "apikey": EVOLUTION_API_KEY }
Body: {
  "number": "5511999999999",
  "text": "Resposta da IA aqui..."
}
```

### Seguranca

- Apenas numeros listados em `WHATSAPP_ALLOWED_NUMBERS` poderao usar o assistente
- Mensagens de numeros nao autorizados serao ignoradas silenciosamente
- Mensagens do proprio bot (`fromMe: true`) serao ignoradas para evitar loops
- Mensagens de grupo serao ignoradas (apenas conversas diretas)

## Detalhes Tecnicos

### Fluxo Completo

1. Admin envia mensagem no WhatsApp para o numero do bot
2. Evolution API dispara webhook para `https://{SUPABASE_URL}/functions/v1/whatsapp-ai`
3. Edge function valida: e mensagem de texto? Numero autorizado? Nao e do bot?
4. Busca todos os dados do sistema (mesma logica de ~45 tabelas do ai-assistant)
5. Envia pergunta + contexto para Lovable AI (**sem streaming**, resposta completa)
6. Formata a resposta (remove markdown excessivo para ficar legivel no WhatsApp)
7. Envia resposta via `POST /message/sendText/{instance}` da Evolution API
8. Admin recebe a resposta no WhatsApp

### Formatacao para WhatsApp

O WhatsApp suporta formatacao basica:
- `*negrito*` em vez de `**negrito**`
- `_italico_` em vez de `*italico*`
- Listas com `-` ou numeros funcionam normalmente
- Remover headers markdown (`###`)

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/whatsapp-ai/index.ts` | Criar - Edge function principal do webhook |
| `supabase/config.toml` | Modificar - Adicionar funcao com `verify_jwt = false` |

## Configuracao na Evolution API

Apos criar a edge function, o admin precisara configurar o webhook na Evolution API:

```text
POST {EVOLUTION_API_URL}/webhook/instance
Body: {
  "url": "https://uyrdlevpowoviwvyehro.supabase.co/functions/v1/whatsapp-ai",
  "webhook_by_events": false,
  "webhook_base64": false,
  "events": ["MESSAGES_UPSERT"]
}
```

Instrucoes de configuracao serao fornecidas ao admin apos a implementacao.
