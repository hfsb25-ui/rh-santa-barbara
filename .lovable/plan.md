# Importação em lote de holerites para assinatura

## Objetivo
Permitir enviar um único PDF com vários holerites, conferir o vínculo de cada página com o colaborador e liberar os documentos importados para assinatura e download no acesso do funcionário.

## Implementação
1. Manter a leitura atual do PDF em lote e a identificação por CPF, com seleção individual e correção manual do colaborador antes de concluir.
2. Adicionar na confirmação da importação a opção de liberar imediatamente os holerites válidos para os funcionários; quando ativa, salvar como publicados em vez de rascunho.
3. Preservar a opção de sobrescrever, mas impedir a substituição de holerites já assinados ou pagos.
4. Exibir um resumo claro de quantos holerites foram vinculados, liberados, ignorados ou apresentaram erro.
5. Confirmar que o funcionário vê o holerite em **Meus Holerites**, consegue assinar e depois baixar o PDF assinado.

## Detalhes técnicos
- A liberação será feita no processamento protegido da importação, mantendo a associação por `employee_id` e `empresa_id`.
- O status publicado seguirá o mesmo valor já usado pelos lançamentos manuais para aparecer nas telas do funcionário.
- A importação continuará aceitando PDFs grandes pelo processamento assíncrono existente.

## Validação
- Importar um PDF com vários holerites e conferir vínculos, competência e valores.
- Validar os estados com e sem liberação imediata.
- Verificar o fluxo completo do funcionário: aviso pendente, assinatura e download.
