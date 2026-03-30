

## Plano: Corrigir tratamento de erro na busca de CPF

### Problema

Quando o CPFHub retorna "CPF não encontrado" (404), a edge function retorna status 404. O `supabase.functions.invoke` interpreta qualquer resposta não-2xx como `error`, mostrando uma mensagem genérica ("FunctionsHttpError") em vez da mensagem amigável.

### Solução

1. **Edge Function (`cpf-lookup/index.ts`)** — Quando a API retorna 404, retornar status **200** com `{ success: false, error: "CPF não encontrado na base de dados" }` em vez de repassar o status 404. Isso garante que o frontend receba o JSON corretamente.

2. **Frontend (`EmployeeForm.tsx`)** — O tratamento `result?.error` já existe e exibirá a mensagem corretamente após a correção acima. Nenhuma alteração necessária no frontend.

### Alterações

- **`supabase/functions/cpf-lookup/index.ts`** — Na seção onde `!response.ok`, retornar sempre status 200 com o campo `error` descritivo no JSON, para que o frontend consiga ler a mensagem.

