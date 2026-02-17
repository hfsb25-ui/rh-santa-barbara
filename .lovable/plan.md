
# Identificação de Funcionários por Características Visuais nas Fotos

## O Que Será Feito

Quando o gestor perguntar no WhatsApp algo como *"qual funcionário do restaurante tem olho azul?"* ou *"quem do setor de cozinha tem tatuagem no braço?"*, o Cérebrum vai analisar as fotos cadastradas dos funcionários usando visão computacional (o próprio modelo de IA que já está configurado — OpenAI GPT-4o ou Google Gemini) e retornar os nomes e fotos dos que mais correspondem à descrição.

---

## Como Vai Funcionar

O fluxo será:

1. Gestor pergunta: *"quem tem olho azul no restaurante?"*
2. Cérebrum chama a nova tool `identificar_funcionario_por_aparencia`
3. A função busca todos os funcionários com `foto_url` preenchida, filtrando por setor/empresa se mencionado
4. Para cada foto, envia a imagem ao modelo de visão (GPT-4o Vision ou Gemini Vision) com a pergunta: *"este funcionário tem olho azul?"*
5. O modelo responde com sim/não e um score de confiança
6. Os funcionários que correspondem são retornados ao Cérebrum
7. O Cérebrum envia as fotos dos correspondentes + resposta textual

---

## Arquitetura Técnica

### Nova função: `identificarPorAparencia`

```typescript
async function identificarPorAparencia(supabase, params, iaConfig) {
  // 1. Busca funcionários com foto, filtrando por setor se informado
  // 2. Para cada foto, chama a Vision API com a característica
  // 3. Retorna lista de matches com nome + url + cargo + setor
}
```

**Parâmetros da tool:**
- `caracteristica`: descrição física (ex: "olho azul", "cabelo vermelho", "tatuagem no braço")
- `setor`: filtro opcional de setor
- `empresa`: filtro opcional de empresa

### Chamada Vision — OpenAI (GPT-4o)

```json
{
  "model": "gpt-4o",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Analise esta foto. Responda APENAS com JSON: {\"match\": true/false, \"confianca\": \"alta/media/baixa\", \"descricao\": \"...\"}" },
      { "type": "image_url", "image_url": { "url": "https://url-da-foto.jpg" } }
    ]
  }]
}
```

### Chamada Vision — Gemini (fallback)

```json
{
  "contents": [{
    "parts": [
      { "text": "..." },
      { "inline_data": { "mime_type": "image/jpeg", "data": "base64..." } }
    ]
  }]
}
```

### Detecção de múltiplos resultados

| Situação | Comportamento |
|---|---|
| 1 correspondência | Envia foto + texto |
| 2-4 correspondências | Envia todas as fotos em sequência + texto listando os nomes |
| Nenhuma correspondência | Responde: "Não encontrei nenhum funcionário com essa característica nas fotos cadastradas." |
| Muitos funcionários sem foto | Avisa quantos foram ignorados por não ter foto |
| Mais de 10 fotos a analisar | Limita a 10 para não exceder tempo de resposta |

---

## Cuidados Importantes

- **Performance**: A análise é feita em paralelo (Promise.all) para não demorar demais
- **Fallback por setor/empresa**: Se o gestor mencionar "do restaurante" ou "da cozinha", o filtro reduz o número de fotos a analisar
- **Modelo de visão**: O sistema usa o provedor já configurado — se for `openai`, usa `gpt-4o` (que tem visão); se for `gemini`, usa `gemini-2.0-flash`
- **Limite de fotos**: Máximo 10 funcionários analisados por busca para evitar timeout da Edge Function

---

## Mudanças no Arquivo

### `supabase/functions/whatsapp-ai/index.ts`

1. **Nova função `identificarPorAparencia`**: Lógica completa de busca + análise visual
2. **Nova tool `identificar_funcionario_por_aparencia`**: Adicionada em `toolDefinitions`
3. **`executeTool`**: Novo case para a tool, passando a configuração de IA
4. **`executeTool`**: Assinatura atualizada para receber `iaConfig` (já disponível no handler)
5. **Handler principal**: Atualização para suportar `_sendMultipleImages` — quando múltiplos funcionários correspondem, o handler envia cada foto em sequência antes do texto
6. **System Prompt**: Nova instrução para usar a tool quando perguntas sobre aparência física forem feitas

---

## Exemplos de Uso

- *"quem tem cabelo loiro no setor de atendimento?"*
- *"qual funcionário da cozinha usa óculos?"*
- *"tem alguém com barba no restaurante?"*
- *"quem tem tatuagem visível?"*
- *"me mostra os funcionários de uniforme azul"*

