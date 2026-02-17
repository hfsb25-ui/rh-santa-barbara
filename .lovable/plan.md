
# Envio de Foto de Funcionário pelo Cérebrum no WhatsApp

## O Que Será Feito

Quando um gestor pedir no WhatsApp "me manda a foto da [nome]" ou "mostra a foto do [nome]", o Cérebrum vai buscar a `foto_url` do funcionário no banco e enviar a imagem diretamente no chat via Evolution API.

---

## Como Funciona a Evolution API para Imagens

A API já suporta envio de mídia pelo endpoint:
```
POST /message/sendMedia/{instance}
```
Com payload:
```json
{
  "number": "5511999999999",
  "mediatype": "image",
  "media": "https://url-da-foto.com/foto.jpg",
  "caption": "📸 João da Silva — Garçom | Restaurante"
}
```
O `media` aceita **URL pública diretamente** — e as fotos já estão no bucket `employee-photos` que é público, então as URLs funcionam sem necessidade de tokens.

---

## Mudanças Técnicas no `whatsapp-ai/index.ts`

### 1. Nova função `enviarFotoFuncionario`
Busca o funcionário pelo nome, valida se tem foto cadastrada, e retorna um objeto especial `{ _sendImage: true, url, caption, nome }` para sinalizar ao handler principal que deve enviar uma imagem.

### 2. Nova tool `enviar_foto_funcionario`
Adicionada na lista `toolDefinitions`, com descrição clara para a IA usar quando o usuário pedir uma foto. Parâmetro: `nome_funcionario`.

### 3. Atualização do `executeTool`
Adiciona o case `"enviar_foto_funcionario"` que chama a nova função.

### 4. Detecção de resposta com imagem no handler principal
Após o loop de tool calls, antes de enviar o texto, o código verifica se alguma tool retornou `_sendImage: true`. Se sim:
- Envia a imagem via `/message/sendMedia/`
- Envia o texto de resposta normalmente em seguida (ou omite se a legenda for suficiente)

### 5. Atualização do System Prompt
Instrução para a IA: *"Se o usuário pedir foto de um funcionário, use a tool `enviar_foto_funcionario`. Informe que a foto foi enviada após o envio."*

---

## Casos Tratados

| Situação | Comportamento |
|---|---|
| Funcionário encontrado com foto | Envia a imagem com legenda (nome, cargo, setor) |
| Funcionário encontrado sem foto | Responde: "X não tem foto cadastrada no sistema." |
| Nome ambíguo (múltiplos) | Retorna lista e pede confirmação |
| Funcionário não encontrado | Retorna mensagem de não encontrado |

---

## Arquivo Modificado

- `supabase/functions/whatsapp-ai/index.ts`
