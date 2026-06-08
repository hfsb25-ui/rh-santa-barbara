# Holerite Diferença

Novo tipo de folha que paga a diferença entre o salário cadastrado do funcionário e um conjunto pré-configurado de descontos do mês. Sempre emitido após o holerite principal, sem fluxo de assinatura eletrônica.

## Fórmula

```
base       = employees.salario
descontos  = soma das variáveis configuradas (presentes na folha do mês)
diferença  = base - descontos
```

Se diferença ≤ 0, o sistema avisa e não gera lançamento.

## 1. Banco de dados

Nova tabela `configuracao_holerite_diferenca` (global, 1 linha):
- `variaveis_desconto_ids uuid[]` — IDs das variáveis de desconto consideradas
- `ativo boolean`
- timestamps + RLS (admin/gestor gerencia, authenticated lê)

Reutiliza `folha_pagamento` adicionando o valor `'diferenca'` ao campo `tipo_folha` (já é texto livre). Cada holerite diferença é uma linha em `folha_pagamento` com:
- `tipo_folha = 'diferenca'`
- `valor_bruto = salario base`
- `descontos = soma das variáveis configuradas`
- `valor_liquido = diferença`
- itens em `folha_pagamento_itens` referenciando as variáveis descontadas (com seus valores do holerite principal do mês)

## 2. Configuração (Settings ou aba em Payroll)

Nova tela **"Holerite Diferença"** em Configurações da Folha:
- Lista todas as variáveis tipo `desconto` de `variaveis_folha` com checkbox
- Salva seleção na `configuracao_holerite_diferenca`
- Texto explicativo da fórmula

## 3. Geração — dois fluxos

**A) Botão individual** em `HoleriteDialog` / lista de holerites:
- Botão "Gerar Holerite Diferença" aparece em holerites `tipo_folha='normal'`
- Abre dialog de preview com: base, descontos detalhados, valor final, observações editáveis
- Confirma → cria registro `tipo_folha='diferenca'` no mesmo mês/ano

**B) Geração em lote** em nova aba "Holerite Diferença" dentro de `Payroll`:
- Seletor mês/ano + empresa
- Lista funcionários com holerite normal do mês mas sem diferença ainda
- Mostra prévia da diferença de cada um
- Botão "Gerar todos" cria os registros em lote
- Pula quem não tem holerite normal ou diferença ≤ 0

## 4. PDF e visualização

- Reusa `pdfGeneratorHolerite.ts`, só ajusta cabeçalho para "RECIBO DE PAGAMENTO - DIFERENÇA" quando `tipo_folha='diferenca'`
- Sem fluxo de assinatura: oculta botões "Assinar" e badge de assinatura para tipo `diferenca`
- Aparece nas listagens (`HoleritesTab` do funcionário, `Payroll`) com tipo "Diferença"
- Painel do funcionário: visualiza/baixa PDF, mas não há etapa de assinatura

## Detalhes técnicos

**Arquivos novos:**
- `supabase/migrations/...` — tabela `configuracao_holerite_diferenca` + RLS + GRANT
- `src/components/payroll/ConfigHoleriteDiferenca.tsx` — tela de configuração
- `src/components/payroll/GerarHoleriteDiferencaDialog.tsx` — preview individual
- `src/components/payroll/HoleriteDiferencaLoteTab.tsx` — geração em lote
- `src/lib/holeriteDiferencaCalc.ts` — função pura de cálculo (base, itens, total)

**Arquivos editados:**
- `src/pages/Payroll.tsx` — nova aba "Diferença" + entrada de configuração
- `src/components/payroll/HoleriteDialog.tsx` — botão "Gerar Diferença" quando `tipo_folha='normal'`
- `src/lib/pdfGeneratorHolerite.ts` — título dinâmico conforme `tipo_folha`
- `src/components/employees/tabs/HoleritesTab.tsx` — coluna "Tipo" já existe, apenas garantir exibição e ocultar coluna assinatura para tipo `diferenca`
- `src/pages/MeusHolerites.tsx` — listar também tipo `diferenca` sem CTA de assinatura

**Regras de validação:**
- Não permitir duplicar: 1 holerite diferença por funcionário/mês/ano
- Exigir holerite normal do mesmo mês/ano antes de gerar
- Se config global vazia → bloquear com mensagem "Configure as variáveis de desconto primeiro"
- Itens copiados pegam o valor real da variável no holerite normal daquele mês (não o valor padrão da variável)
