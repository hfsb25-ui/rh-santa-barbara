## Reestruturação do Controle Financeiro

Adicionar visão completa de variáveis de pagamento (Bruto, INSS, FGTS, IRRF, Líquido) e separação Holerite Principal vs Diferença em todo o módulo.

### 1. Hook `useFinanceiroData.ts`
Estender o agregador para somar, por período, valores de itens da folha identificados pelo nome da variável:
- **Bruto** — `valor_bruto` da folha
- **INSS** — itens cujo `variaveis_folha.nome` contém "inss"
- **FGTS** — itens cujo nome contém "fgts"
- **IRRF** — itens cujo nome contém "irrf" ou "imposto de renda"
- **Líquido** — `valor_liquido`
- **Total Holerite Diferença** — soma de `valor_liquido` onde `tipo = 'diferenca'`
- **Total Holerite Principal** — soma de `valor_liquido` onde `tipo != 'diferenca'`

Buscar `folha_pagamento` já com `folha_pagamento_itens(valor, variaveis_folha(nome))` e calcular os encargos em memória.

Novos campos em `KPIsData`:
```ts
totalBruto, totalInss, totalFgts, totalIrrf, totalLiquido,
totalDiferenca, totalPrincipal, quantidadeDiferenca
```

Estender também `HistoricoData` com `inss`, `fgts`, `irrf` para o gráfico de evolução.

### 2. `FinanceiroKPIs.tsx`
Reescrever os cards em grid responsivo destacando:
- Valor Bruto (verde) · INSS (âmbar) · FGTS (azul) · IRRF (roxo) · Líquido (indigo)
- Holerite Principal vs Holerite Diferença (dois cards lado a lado, com contagem)
- Manter Total Funcionários e Variação Mensal abaixo

### 3. `HistoricoMensal.tsx`
Adicionar linhas/áreas para INSS e FGTS no gráfico existente (toggle), mantendo Bruto/Líquido/Descontos.

### 4. Filtros
Mantidos como estão (empresa, período, setor, contrato, tipo folha). O filtro `tipoFolha` continua restringindo entre principal/diferença/todos.

### 5. Exportações PDF/Excel (`Financeiro.tsx`)
Incluir as novas colunas (Bruto, INSS, FGTS, IRRF, Líquido, Diferença) no resumo exportado.

### Identificação de variáveis
Match case-insensitive por `ilike` no nome da variável. Robustez: se houver múltiplas variáveis com "inss" (ex.: INSS Empresa vs INSS Funcionário), somar todas marcadas como `tipo = 'desconto'` para INSS/IRRF, e todas (provento+desconto) para FGTS já que é encargo da empresa não descontado em folha — confirmar comportamento durante implementação consultando os dados reais.

### Arquivos afetados
- `src/components/financeiro/hooks/useFinanceiroData.ts` (extensão)
- `src/components/financeiro/FinanceiroKPIs.tsx` (reescrita visual)
- `src/components/financeiro/HistoricoMensal.tsx` (séries extras)
- `src/pages/Financeiro.tsx` (export atualizado)

Sem mudanças de banco de dados.