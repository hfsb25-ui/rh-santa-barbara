
# Auditoria Completa do Cérebrum — Falhas Identificadas

Após leitura integral do arquivo (1.211 linhas), foram encontradas **8 falhas** em consultas, respostas e lógica geral.

---

## FALHA 1 — Funcionário não encontrado por nome (ex: "Bruno Brandi")
**Gravidade: Alta**

Na função `consultarFuncionarios`, a busca por nome usa `.ilike("nome_completo", `%${params.nome}%`)`. O problema é que o campo `nome_completo` está indexado e os dados estão no banco, mas **a IA às vezes passa só o primeiro nome ou sobrenome** e o sistema não encontra o registro. Além disso, quando **não encontra ninguém**, a função retorna o objeto `{ total: 0, funcionarios: [] }` — a IA interpreta isso como "não existe no sistema" em vez de "busca vazia", e afirma que a pessoa não existe.

**Correção:** Quando `total === 0`, a mensagem retornada deve ser explícita: `"Nenhum funcionário encontrado com nome contendo '${params.nome}'. Verifique se o nome está correto."` — em formato string, não objeto, evitando que a IA fabrique conclusões.

---

## FALHA 2 — Faltas trazem dados errados quando há múltiplos funcionários com nome similar
**Gravidade: Alta**

Na `consultarFaltasFolgas`, quando o usuário pergunta "quantas faltas tem a Aline", o sistema faz:
1. Busca por `employees` com `.ilike("nome_completo", "%Aline%")` — pode retornar **várias Alines** (ex: Aline Silva, Aline Santos).
2. Usa `.in("employee_id", employeeIds)` — traz faltas de **todas** as Alines juntas.
3. A IA soma tudo e responde o total errado.

O retorno do resultado não especifica **de qual pessoa** são as faltas — apenas lista sem identificar claramente.

**Correção:** Quando `employeeIds.length > 1`, retornar os nomes encontrados e pedir confirmação: `"Encontrei X funcionários com esse nome: [lista]. Qual deles você quer consultar?"`. Além disso, o resultado deve agrupar por funcionário mostrando contagem individual.

---

## FALHA 3 — Banco de horas usa filtro por string (não por ID) — mesmo padrão quebrado
**Gravidade: Alta**

Na `consultarPontoBancoHoras`, o filtro por funcionário ainda usa o padrão antigo e quebrado:
```typescript
bancoHoras.filter((b: any) => 
  (b.employees?.nome_completo || "").toLowerCase()
    .includes(params.nome_funcionario.toLowerCase())
)
```
Isso filtra **depois de buscar tudo** do banco. Se houver mais de 1000 registros (limite Supabase), registros do funcionário podem ser cortados antes de chegar ao filtro. Além disso, filtra em memória sem garantia de precisão.

**Correção:** Resolver o `employee_id` primeiro (padrão da correção da semana passada) e aplicar `.in()` direto nas queries de `banco_horas` e `registros_ponto`.

---

## FALHA 4 — `consultarPontoBancoHoras` ignora filtro de nome nos registros de ponto
**Gravidade: Média**

Na linha 198-200, quando `params.nome_funcionario` existe, a query de `registros_ponto` busca os últimos 500 registros **sem filtrar por funcionário**:
```typescript
supabase.from("registros_ponto").select("...").gte("data", startOfYear).order(...).limit(500)
```
Depois filtra em JS. Com muitos funcionários, isso desperdiça banda e pode cortar o funcionário certo se ele não estiver nos 500 primeiros.

**Correção:** Resolver o `employee_id` antes e filtrar direto no banco: `.eq("employee_id", empId)`.

---

## FALHA 5 — Resposta truncada em 3000 caracteres pode cortar dados no meio
**Gravidade: Média**

O prompt instrui: *"Máximo 3000 caracteres"*, mas não há truncamento automático no código. Se a IA gerar uma resposta longa (ex: listar 30 funcionários com detalhes), o WhatsApp pode recusar o envio ou a mensagem pode chegar cortada.

**Correção:** Aplicar truncamento programático antes de enviar: `if (formattedText.length > 3800) formattedText = formattedText.substring(0, 3800) + "\n\n_(resposta truncada — peça mais detalhes específicos)_"`.

---

## FALHA 6 — Whitelist de números verificada duas vezes com lógicas diferentes
**Gravidade: Média**

O número é verificado **duas vezes**:
1. Linha 902-905: Via variável de ambiente `WHATSAPP_ALLOWED_NUMBERS`
2. Linha 1042-1045: Via banco de dados `whatsapp_allowed_numbers`

Se o gestor configura os números no painel (banco de dados), mas a variável de ambiente está vazia ou com outros números, a verificação da linha 902 pode bloquear usuários autorizados **antes mesmo** de consultar o banco. Ou o inverso: usuários bloqueados no banco passam pela primeira checagem.

**Correção:** Remover a verificação por variável de ambiente (linha 902-905) e usar somente a configuração do banco de dados, que é a fonte de verdade atualizada pelo painel.

---

## FALHA 7 — `consultarFaltasFolgas` só olha os últimos 90 dias — não informa o período ao usuário
**Gravidade: Baixa**

Quando alguém pergunta "quantas faltas tem X?", o Cérebrum responde com um número mas **não menciona que é dos últimos 90 dias**. O gestor pode interpretar como o total histórico.

**Correção:** O retorno da função já inclui "(últimos 90 dias)" no texto, mas a IA às vezes reformula e omite esse contexto. Adicionar instrução no system prompt para sempre indicar o período das consultas.

---

## FALHA 8 — Erro silencioso se a IA retorna `content: null` com tool_calls
**Gravidade: Baixa**

Na linha 1181:
```typescript
const aiText = assistantMessage?.content || "Desculpe, não consegui processar sua pergunta.";
```
Se o loop de tool calls terminar nas 3 rodadas sem produzir uma resposta final (último assistantMessage ainda tem `tool_calls` e `content: null`), a mensagem enviada ao usuário será "Desculpe, não consegui processar sua pergunta." sem nenhum log de diagnóstico.

**Correção:** Logar explicitamente quando o loop de 3 rodadas esgota sem resposta final: `console.error("Tool call loop exhausted without final response")`.

---

## O Que Será Corrigido

### Arquivo: `supabase/functions/whatsapp-ai/index.ts`

1. **`consultarFuncionarios`**: Retornar string explicativa quando nenhum funcionário for encontrado, em vez de objeto `{total:0}`.

2. **`consultarFaltasFolgas`**: Quando múltiplos funcionários forem encontrados, retornar lista de nomes para o usuário confirmar qual quer, agrupando os dados por pessoa.

3. **`consultarPontoBancoHoras`**: Resolver `employee_id` antes das queries e aplicar filtro `.eq()` direto nas queries de banco de dados.

4. **Truncamento automático**: Aplicar limite de 3800 caracteres na resposta final antes de enviar ao WhatsApp.

5. **Whitelist dupla**: Remover a verificação por variável de ambiente, mantendo apenas a do banco de dados.

6. **Log de loop esgotado**: Adicionar log de erro quando as 3 rodadas de tool calls se esgotam sem resposta.
