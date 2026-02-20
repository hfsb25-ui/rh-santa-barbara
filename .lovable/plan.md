
# Reformulacao do Holerite - Padrao Nacional

## Objetivo

Redesenhar o recibo de pagamento (holerite) seguindo o padrao nacional brasileiro de contracheque, tanto na visualizacao (preview no dialog) quanto na geracao do PDF.

## Layout Padrao Nacional

O holerite brasileiro padrao segue esta estrutura:

```text
+----------------------------------------------------------+--------+
| RECIBO DE PAGAMENTO DE SALARIO                           |        |
| Empresa: [Nome da Empresa]                               |        |
| CNPJ: [XX.XXX.XXX/XXXX-XX]  Endereco: [...]             |        |
+----------------------------------------------------------+        |
| Cod | Nome Funcionario          | CPF: XXX.XXX.XXX-XX   |        |
| Cargo: [...]  Admissao: [...]  Setor: [...]              | D      |
+------+---------------------+-----+------------+---------+ E      |
| Cod. | Descricao           | Ref | Proventos  |Descontos| C      |
+------+---------------------+-----+------------+---------+ L      |
| 001  | Salario Base        | 30d | 2.500,00   |         | A      |
| 003  | Hora Extra 50%      | 10h |   375,00   |         | R      |
| 051  | INSS                |  9% |            |  258,75 | A      |
| 060  | Vale Transporte     |  6% |            |  150,00 | C      |
|      |                     |     |            |         | A      |
|      |                     |     |            |         | O      |
+------+---------------------+-----+------------+---------+        |
| TOTAL DE VENCIMENTOS: 2.875,00  | TOTAL DESCONTOS: 408,75| Ass.  |
+----------------------------------+------------------------+        |
| VALOR LIQUIDO:                              R$ 2.466,25  | Data  |
+----------------------------------------------------------+--------+
| Sal.Base | Sal.Contr | INSS | Base FGTS | FGTS | IRRF | Faixa  |
| 2.500    | 2.875     | 259  | 2.875     | 230  | 0,00 |  -     |
+----------------------------------------------------------+--------+
```

## Mudancas no arquivo `src/components/payroll/HoleriteDialog.tsx`

### 1. Cabecalho da Empresa (novo)
- Bloco superior com nome da empresa em destaque, CNPJ formatado e endereco
- Se houver logo, exibir a esquerda do nome
- Titulo "RECIBO DE PAGAMENTO DE SALARIO" centralizado acima

### 2. Dados do Funcionario (reformulado)
- Linha 1: Nome completo (destaque) | CPF formatado
- Linha 2: Cargo | Data Admissao | Setor | Periodo (mes/ano)
- Layout mais limpo, sem campos vazios desnecessarios (remover Emp., Local, Secao, Fl., Dependentes que estao todos com "-")

### 3. Tabela de Eventos (melhorada)
- 5 colunas bem definidas com bordas solidas: Cod | Descricao | Referencia | Proventos | Descontos
- Linhas alternadas com fundo levemente cinza para legibilidade
- Minimo de 12 linhas vazias para manter o formato padrao
- Bordas completas ao redor de cada celula

### 4. Rodape de Totais (reformulado)
- Linha de totais com fundo cinza: "TOTAL VENCIMENTOS" a esquerda | "TOTAL DESCONTOS" a direita
- Linha de valor liquido destacada com fundo mais escuro e fonte maior: "VALOR LIQUIDO: R$ X.XXX,XX"

### 5. Base de Calculos (mantida)
- Mesma estrutura atual, porem com bordas mais limpas e alinhamento melhorado

### 6. Barra Lateral de Assinatura (melhorada)
- Manter a barra lateral direita mas com layout mais limpo
- Texto vertical "DECLARO TER RECEBIDO..." 
- Linha para assinatura e data

### 7. PDF (sincronizado)
- A funcao `generatePDF` sera reescrita para espelhar exatamente o novo layout
- Usar `jspdf-autotable` para a tabela de eventos (ja instalado no projeto), garantindo bordas, alinhamento e linhas alternadas corretas
- Cabecalho com logo (se disponivel), nome empresa, CNPJ e endereco
- Mesma estrutura visual do preview

## Resumo das melhorias visuais
- Remover campos inuteis (Emp, Local, Secao, Fl, Dependentes)
- Adicionar dados da empresa no cabecalho
- Bordas solidas e bem definidas em toda a tabela
- Linhas zebradas para legibilidade
- Fonte mais legivel e espacamento adequado
- Layout profissional seguindo o padrao CLT
