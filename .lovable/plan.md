

# Reformulacao do Sistema de Lancamento de Folha

## Problema Atual

O formulario de lancamento mostra todos os funcionarios de uma vez, cada um com secoes separadas de proventos e descontos, campos de codigo, valor e observacoes. Isso cria uma pagina extremamente longa e confusa, especialmente com muitos funcionarios.

## Solucao Proposta

Redesenhar o formulario com uma abordagem de **navegacao por funcionario** usando um layout compacto em formato de tabela/stepper, onde o usuario trabalha com um funcionario por vez.

### Mudancas principais:

1. **Lista lateral de funcionarios** - Uma lista compacta a esquerda mostrando todos os funcionarios com indicador visual de quem ja tem dados preenchidos (check verde) e quem falta.

2. **Painel de edicao focado** - Ao clicar em um funcionario, o painel a direita mostra apenas os dados dele, organizados de forma limpa:
   - Salario base no topo
   - Tabela simples de proventos (nome | valor | remover)
   - Tabela simples de descontos (nome | valor | remover)
   - Campo unico para adicionar variavel (codigo + valor + Enter, ou Enter vazio para picker)
   - Observacoes
   - Resumo (proventos, descontos, liquido) fixo no rodape

3. **Navegacao rapida** - Botoes "Anterior" / "Proximo" para navegar entre funcionarios sem voltar a lista.

4. **Resumo geral compacto** - O resumo geral fica sempre visivel no topo, mostrando progresso (ex: "5 de 12 funcionarios preenchidos").

---

## Detalhes Tecnicos

### Arquivo: `src/components/payroll/LancamentoFolhaForm.tsx`

**Reestruturacao completa do layout (render/JSX):**

- Substituir o scroll vertical com todos os funcionarios por um layout de 2 colunas:
  - Coluna esquerda (~250px): `ScrollArea` com lista de nomes, badge de status (preenchido/vazio), busca por nome
  - Coluna direita (flex-1): formulario do funcionario selecionado

- O `selectedEmployee` ja existe no state; sera usado para controlar qual funcionario esta ativo no painel.

- Remover o select de "Todos os funcionarios" - o padrao sera o primeiro da lista.

- Adicionar botoes de navegacao (Anterior/Proximo) no rodape do painel para avancar entre funcionarios.

- O campo de adicionar variavel permanece igual (digitar codigo + Enter, ou Enter vazio abre picker), mas agora em uma unica linha para proventos e outra para descontos, com um `Select` inline para escolher o tipo ao inves de ter dois blocos separados.

**Simplificacao do input de variavel:**
- Unificar proventos e descontos em um unico campo "Adicionar variavel" com um select de tipo (Provento/Desconto) ao lado. Isso reduz a duplicacao visual.

**Resumo fixo:**
- Mover o resumo geral para um header sticky compacto mostrando: total de funcionarios preenchidos, total proventos, total descontos, total liquido - tudo em uma unica linha.

### Logica (sem mudancas):
- Toda a logica de `lancamentos`, `handleBuscarVariavel`, `handleSelectVariavelFromPicker`, `handleSubmit`, draft/restore permanece identica.
- Apenas a apresentacao visual e reorganizada.

