
# Importacao de XML de Nota Fiscal para Entrada no Estoque

## Objetivo

Criar uma funcionalidade que permite ao usuario fazer upload de um arquivo XML de Nota Fiscal Eletronica (NF-e) e, a partir dos itens listados na nota, dar entrada automatica no estoque de EPIs e Uniformes.

## Como funciona

1. O usuario clica em um botao "Importar NF-e" na pagina de Estoque
2. Seleciona o arquivo XML da nota fiscal
3. O sistema le o XML e extrai os produtos (descricao, quantidade, valor unitario, NCM)
4. Os itens sao exibidos em uma tabela de preview onde o usuario pode:
   - Classificar cada item como "EPI" ou "Uniforme" (ou ignorar)
   - Ajustar campos como tamanho, cor, CA (para EPIs), etc.
5. Ao confirmar, o sistema:
   - Verifica se ja existe um item no estoque com a mesma descricao
   - Se existir, incrementa a quantidade
   - Se nao existir, cria um novo registro
   - Registra a movimentacao no historico com o numero da NF-e como referencia

## Estrutura do XML NF-e (padrao brasileiro)

O XML da NF-e segue o padrao nacional e contem os produtos dentro da tag `<det>` -> `<prod>`, com campos como:
- `xProd` (descricao do produto)
- `qCom` (quantidade)
- `vUnCom` (valor unitario)
- `NCM` (codigo NCM)
- `uCom` (unidade)
- `nNF` (numero da nota)

## Mudancas

### 1. Novo componente: `src/components/stock/ImportNfeDialog.tsx`
- Dialog com area de upload de arquivo XML
- Parser de XML usando `DOMParser` nativo do browser (nao precisa de biblioteca extra)
- Tabela de preview dos itens extraidos com colunas: Descricao, Qtd, Valor, Tipo (EPI/Uniforme/Ignorar)
- Campos editaveis para cada item: tamanho, cor, CA, marca/modelo
- Botao de confirmar importacao

### 2. Alteracao: `src/pages/Stock.tsx`
- Adicionar botao "Importar NF-e" ao lado do titulo da pagina
- Integrar o novo dialog de importacao
- Ao confirmar importacao, atualizar as listas de estoque

### 3. Logica de entrada no estoque
- Para cada item classificado como EPI:
  - Buscar no `estoque_epis` por `tipo_epi` similar
  - Se encontrar, fazer UPDATE somando a quantidade
  - Se nao encontrar, INSERT novo registro
  - Registrar movimentacao em `historico_estoque_epis` com motivo "Entrada via NF-e [numero]"
- Para cada item classificado como Uniforme:
  - Mesma logica usando `estoque_uniformes` e `historico_estoque_uniformes`

## Detalhes Tecnicos

- **Parser XML**: Usar `DOMParser` nativo do browser, sem dependencias externas
- **Validacao**: Verificar se o XML e uma NF-e valida checando a presenca da tag `<nfeProc>` ou `<NFe>`
- **Matching**: Tentativa de match automatico com itens existentes por nome similar (case-insensitive), mas usuario pode ajustar manualmente
- **Historico**: Todas as entradas registradas com referencia ao numero da NF-e para rastreabilidade
- **Nenhuma migracao necessaria**: Os campos existentes nas tabelas `estoque_epis` e `estoque_uniformes` ja atendem os dados necessarios
