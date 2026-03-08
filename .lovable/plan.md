

## Plano: Busca automática de dados por CPF via CPFHub.io

### Resumo

Ao digitar o CPF na aba Documentação e clicar "Buscar", o sistema consulta a API do CPFHub.io e preenche automaticamente os campos encontrados (nome completo, data de nascimento).

### Implementação

1. **Solicitar chave de API** — Você precisará fornecer sua chave de API do CPFHub.io, que será armazenada de forma segura no backend.

2. **Nova edge function `cpf-lookup`** — Recebe o CPF, chama `GET https://api.cpfhub.io/cpf/{cpf}` com o header `x-api-key`, e retorna os dados (nome, data de nascimento, situação cadastral).

3. **Alteração em `DocumentacaoTab.tsx`** — Adicionar botão "Buscar" ao lado do campo CPF. Recebe prop `onCpfLookup` e `cpfLoading`.

4. **Alteração em `EmployeeForm.tsx`** — Implementar `handleCpfLookup` que:
   - Chama a edge function com o CPF
   - Mapeia os dados retornados para `formValues` (nome_completo, data_nascimento)
   - Só preenche campos vazios (não sobrescreve dados já digitados)
   - Mostra toast de sucesso/erro

5. **Config** — Adicionar `[functions.cpf-lookup] verify_jwt = false` no `config.toml`.

### Campos preenchidos automaticamente

- `nome_completo` — Nome retornado pela API
- `data_nascimento` — Data de nascimento (convertida para formato yyyy-MM-dd)

### Próximo passo

Preciso que você forneça sua chave de API do CPFHub.io para armazená-la de forma segura no backend. Você já tem a chave?

