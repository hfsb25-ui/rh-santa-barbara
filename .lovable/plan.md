

# Plano: Melhorias no Calendário de Férias

## Situação Atual
O calendário de férias atual permite visualizar funcionários de férias em cada dia, mas ao clicar em um dia, ele abre diretamente o formulário para adicionar novas férias. Não existe uma forma de ver detalhes completos de quem está de férias naquele dia específico.

## Objetivo
Criar uma experiência mais interativa e informativa ao clicar em um dia do calendário, permitindo:
1. Ver lista completa de funcionários de férias naquele dia
2. Visualizar detalhes de cada férias
3. Opção de adicionar novas férias a partir da visualização do dia

---

## Melhorias Propostas

### 1. Dialog de Detalhes do Dia
Ao clicar em um dia, abrirá um modal mostrando:
- Data selecionada em destaque
- Lista de todos os funcionários de férias naquele dia
- Para cada funcionário:
  - Nome completo e setor
  - Período das férias (início e fim)
  - Dias restantes de férias
  - Status (Planejado, Aprovado, Em Andamento, Concluído)
- Estatísticas do dia (ex: "3 funcionários de férias")
- Botão para adicionar novas férias para aquele dia

### 2. Indicadores Visuais Melhorados
- Mostrar fins de semana com cor diferente (cinza claro)
- Barra de progresso visual quando há muitos funcionários de férias
- Ícone de alerta quando mais de X funcionários estão ausentes no mesmo setor

### 3. Navegação Rápida
- Botão para ir para "Hoje" já existe
- Adicionar mini-calendário para selecionar mês/ano rapidamente

### 4. Resumo Mensal
- Card no topo mostrando estatísticas do mês:
  - Total de dias com férias
  - Funcionários diferentes de férias
  - Dia com mais ausências

---

## Implementação Técnica

### Novo Componente: `DayDetailsDialog.tsx`

```text
+----------------------------------------+
|         Sexta-feira, 14/02/2025        |
+----------------------------------------+
|  3 funcionários de férias neste dia    |
+----------------------------------------+
|                                        |
|  [João Silva]                          |
|   Setor: Administrativo                |
|   01/02 - 15/02 (15 dias)              |
|   [Badge: Em Andamento]                |
|                                        |
|  [Maria Santos]                        |
|   Setor: Comercial                     |
|   10/02 - 25/02 (16 dias)              |
|   [Badge: Em Andamento]                |
|                                        |
|  [Pedro Costa]                         |
|   Setor: Administrativo                |
|   14/02 - 28/02 (15 dias - Planejado)  |
|   [Badge: Planejado]                   |
|                                        |
+----------------------------------------+
|  [+ Adicionar Férias]  [Fechar]        |
+----------------------------------------+
```

### Alterações no `VacationCalendar.tsx`
1. Adicionar estado para controlar qual dialog abrir (detalhes vs adicionar)
2. Modificar `handleDayClick` para abrir primeiro o dialog de detalhes
3. Adicionar cores para fins de semana
4. Melhorar a visualização de conflitos

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/vacation-schedule/DayDetailsDialog.tsx` | Criar |
| `src/components/vacation-schedule/VacationCalendar.tsx` | Modificar |
| `src/components/vacation-schedule/types.ts` | Adicionar interface se necessário |

---

## Resumo Visual das Mudanças

**Antes:** Clicar no dia → Abre formulário de adicionar férias

**Depois:** Clicar no dia → Abre modal com lista de férias do dia → Opção de adicionar novas férias

---

## Benefícios
- Visão clara de quem está de férias em cada dia
- Navegação mais intuitiva
- Identificação rápida de conflitos de ausência
- Melhora na tomada de decisão para planejamento de férias

