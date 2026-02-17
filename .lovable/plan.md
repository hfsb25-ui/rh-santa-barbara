
# Corrigir o Cérebrum no WhatsApp — Mensagens com Traço

## Causa Raiz Identificada

Os logs da edge function mostram claramente o erro:

```
ReferenceError: fetchResumoMinimo is not defined
```

Na linha 978 do arquivo `supabase/functions/whatsapp-ai/index.ts`, a função `fetchResumoMinimo(supabase)` é chamada dentro do `Promise.all`, mas essa função **não existe** no código. O nome correto da função definida no arquivo é `consultarResumoRapido` (linha 95).

Esse erro derruba toda a execução da função, e quando o Cérebrum falha, o WhatsApp exibe apenas um traço (mensagem vazia ou não entregue).

## O Que Será Feito

### Arquivo: `supabase/functions/whatsapp-ai/index.ts`

- **Linha 978**: Trocar `fetchResumoMinimo(supabase)` por `consultarResumoRapido(supabase)`

Essa é a única mudança necessária. Depois de feita, o arquivo será reimplantado automaticamente e o Cérebrum voltará a responder normalmente no WhatsApp.

## Impacto

- Todos os usuários autorizados voltarão a receber respostas completas do Cérebrum via WhatsApp
- Não há risco de regressão — é apenas a correção de um nome de função incorreto
- A lógica de consulta, formatação, envio e histórico permanecem intactas
