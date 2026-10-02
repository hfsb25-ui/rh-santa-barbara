# Importação por página com vínculo manual

## Objetivo
Transformar **Importar para assinatura** em um fluxo sem IA: cada página do PDF será tratada como um holerite independente, para o gestor escolher manualmente o colaborador correspondente.

## Alterações
- Ao clicar em **Processar holerites**, contar as páginas do PDF diretamente no navegador, sem chamar Gemini ou qualquer extração automática.
- Criar uma linha para cada página, já com mês, ano e empresa definidos pelos campos da tela.
- Exigir que o gestor selecione um colaborador em cada página antes de marcá-la para importação.
- Simplificar a tabela para mostrar página, colaborador, competência, situação e ações; remover CPF, bruto, líquido, rubricas e opções ligadas à leitura automática.
- Manter a proteção contra sobrescrever documentos existentes ou assinados.
- Na confirmação, recortar exatamente a página indicada e salvar somente em **Meus Holerites**, sem alterar cálculos ou lançamentos manuais.

## Validação
- Confirmar que um PDF com várias páginas gera exatamente uma linha por página.
- Confirmar que páginas vinculadas manualmente são importadas separadamente.
- Verificar compilação e erros recentes da aplicação.
