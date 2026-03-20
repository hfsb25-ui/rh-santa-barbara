

## Plano: Readmissão de Funcionário Demitido

### Resumo

Adicionar um botão "Readmitir" na página de detalhes do funcionário demitido. Ao clicar, abre um dialog onde o gestor define a nova data de admissão, cargo, setor e salário. O sistema reativa o registro existente (mantendo todo o histórico) e opcionalmente inicia um novo checklist de admissão.

### Como funciona

1. Na página de detalhes (`EmployeeDetails.tsx`), quando o funcionário tem status "demitido", exibir botão **"Readmitir"** (ícone de refresh/undo)
2. Ao clicar, abre dialog com campos:
   - Nova data de admissão (obrigatório)
   - Cargo (pré-preenchido com o atual)
   - Setor (pré-preenchido com o atual)
   - Empresa (pré-preenchido com a atual)
   - Novo salário (pré-preenchido com o anterior)
   - Checkbox: "Iniciar checklist de admissão?"
3. Ao confirmar:
   - Atualiza o status para "ativo" (ou "em_admissao" se checklist marcado)
   - Atualiza `data_admissao` com a nova data
   - Limpa `data_desligamento`
   - Atualiza cargo/setor/salário se alterados
   - Se checklist marcado, cria automaticamente o processo de onboarding

### Vantagem

Todo o histórico do funcionário (EPIs, férias, faltas, avaliações, arquivos, holerites) permanece intacto. Não é necessário recadastrar nada.

### Implementação técnica

1. **Novo componente `ReadmitDialog.tsx`** — Dialog com formulário de readmissão e lógica de update no banco
2. **Alteração em `EmployeeDetails.tsx`** — Renderizar botão "Readmitir" condicionalmente quando `employee.status === "demitido"`
3. **Alteração em `EmployeeInfo.tsx`** — Exibir badge visual diferenciado para funcionário readmitido (opcional)

Nenhuma alteração de banco de dados é necessária — a tabela `employees` já possui todos os campos necessários.

