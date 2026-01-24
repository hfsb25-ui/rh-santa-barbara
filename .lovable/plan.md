
# Plano: Reorganização do Cadastro de Funcionários em Abas

## Resumo
Vou reorganizar o formulário e a visualização de funcionários em 4 abas separadas, adicionando os novos campos solicitados tanto no banco de dados quanto na interface.

## Estrutura das Abas

### Aba 1: Dados Pessoais
- Nome Completo
- Data de Nascimento
- Nacionalidade (novo)
- Naturalidade - Estado (novo)
- Naturalidade - Município (novo)
- Nome do Pai (novo)
- Nome da Mãe (novo)
- Raça/Cor (novo)
- Sexo
- Foto
- Senha (apenas no cadastro)

### Aba 2: Documentação
- Carteira de Trabalho (novo)
- CPF
- PIS (novo)
- RG
- RG - Órgão Expedidor (novo)
- RG - Data de Emissão (novo)
- RG - UF de Emissão (novo)

### Aba 3: Endereço
- CEP (novo)
- Endereço
- Número (novo)
- Complemento (novo)
- Bairro (novo)
- UF (novo)
- Cidade (novo)

### Aba 4: Movimentações
- Função
- Setor
- Empresa
- Tipo de Contrato
- Salário
- Tipo de Salário
- Data de Admissão
- Status
- Data de Desligamento (quando demitido)

---

## Etapas de Implementação

### Etapa 1: Migração do Banco de Dados
Adicionar as novas colunas à tabela `employees`:

```text
Novos campos:
- nacionalidade (text)
- naturalidade_estado (text)
- naturalidade_municipio (text)
- nome_pai (text)
- nome_mae (text)
- raca_cor (text)
- carteira_trabalho (text)
- pis (text)
- rg_orgao_expedidor (text)
- rg_data_emissao (date)
- rg_uf (text)
- cep (text)
- endereco_numero (text)
- endereco_complemento (text)
- bairro (text)
- uf (text)
- cidade (text)
```

### Etapa 2: Reformular o Formulário de Funcionários
Modificar `src/components/forms/EmployeeForm.tsx`:
- Adicionar componente de Tabs para organizar o formulário em 4 abas
- Distribuir os campos existentes e novos nas abas corretas
- Implementar navegação entre as abas
- Adicionar validação por aba

### Etapa 3: Reformular a Visualização de Informações
Modificar `src/components/employees/EmployeeInfo.tsx`:
- Reorganizar a exibição das informações do funcionário em 4 abas
- Mostrar todos os novos campos nas suas respectivas abas
- Manter o visual limpo e organizado

### Etapa 4: Atualizar a Lógica de Salvamento
Ajustar o `handleSubmit` do formulário para:
- Capturar todos os novos campos
- Enviar os dados corretamente para o banco

---

## Detalhes Técnicos

### SQL da Migração
```sql
ALTER TABLE employees
ADD COLUMN nacionalidade text,
ADD COLUMN naturalidade_estado text,
ADD COLUMN naturalidade_municipio text,
ADD COLUMN nome_pai text,
ADD COLUMN nome_mae text,
ADD COLUMN raca_cor text,
ADD COLUMN carteira_trabalho text,
ADD COLUMN pis text,
ADD COLUMN rg_orgao_expedidor text,
ADD COLUMN rg_data_emissao date,
ADD COLUMN rg_uf text,
ADD COLUMN cep text,
ADD COLUMN endereco_numero text,
ADD COLUMN endereco_complemento text,
ADD COLUMN bairro text,
ADD COLUMN uf text,
ADD COLUMN cidade text;
```

### Estrutura do Formulário com Abas
```text
EmployeeForm.tsx
├── Tabs
│   ├── TabsList
│   │   ├── "Dados Pessoais"
│   │   ├── "Documentação"
│   │   ├── "Endereço"
│   │   └── "Movimentações"
│   ├── TabsContent (Dados Pessoais)
│   ├── TabsContent (Documentação)
│   ├── TabsContent (Endereço)
│   └── TabsContent (Movimentações)
└── Botões Salvar/Cancelar
```

### Listas de Seleção
- **Raça/Cor**: Branca, Preta, Parda, Amarela, Indígena, Não informado
- **UF**: Todos os estados brasileiros (AC, AL, AM, etc.)
- **Nacionalidade**: Brasileiro(a), Estrangeiro(a)

---

## Arquivos a Serem Modificados
1. `src/components/forms/EmployeeForm.tsx` - Adicionar abas e novos campos
2. `src/components/employees/EmployeeInfo.tsx` - Reorganizar exibição em abas
3. Banco de dados - Adicionar novas colunas

---

## Resultado Final
O cadastro e visualização de funcionários terá uma interface mais organizada com 4 abas distintas, facilitando o preenchimento e a consulta das informações do funcionário de forma mais intuitiva e categorizada.
