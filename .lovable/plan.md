

## Plano: Lista de Tarefas no Dashboard

### O que será feito

Criar um sistema de lista de tarefas (to-do list) para gestores, com persistência no banco de dados, exibido como um card no dashboard.

### Funcionalidades

- Criar, editar, marcar como concluída e excluir tarefas
- Prioridade (alta, média, baixa) com indicação visual por cor
- Data de vencimento opcional
- Tarefas ordenadas: pendentes primeiro (por prioridade/data), concluídas por último
- Card compacto no dashboard com opção de expandir

### Implementação

1. **Nova tabela `tarefas`** — Campos: id, user_id, titulo, descricao, prioridade (alta/media/baixa), data_vencimento, concluida, concluida_em, created_at. RLS: cada usuário vê/gerencia apenas suas próprias tarefas.

2. **Novo componente `TaskList.tsx`** — Card com:
   - Input para adicionar tarefa rapidamente (título + Enter)
   - Lista de tarefas com checkbox para marcar concluída
   - Badge de prioridade colorido
   - Botão de excluir
   - Contador de tarefas pendentes no header

3. **Integração no `GestorDashboard.tsx`** — Adicionar o card de tarefas na área do dashboard, visível logo no topo ou em posição de destaque.

### Detalhes técnicos

- **Migração SQL**: Criar tabela `tarefas` com RLS (usuário autenticado gerencia suas próprias tarefas)
- **Novo arquivo**: `src/components/dashboard/TaskList.tsx`
- **Alteração**: `src/components/dashboard/GestorDashboard.tsx` — importar e renderizar o TaskList

