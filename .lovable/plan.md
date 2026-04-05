

## Plano: Redesign Moderno e Limpo do Sistema

### Visão Geral

Redesign visual completo focado em: espaçamento generoso, tipografia limpa, cores suaves, menos bordas, mais uso de sombras sutis e gradientes leves. Interface "arejada" e moderna.

### Mudanças

#### 1. Paleta de Cores e CSS Variables (`src/index.css`)
- Background principal levemente acinzentado (não branco puro) para reduzir contraste
- Cards sem borda visível, usando sombra suave como separador
- Cores primárias mais suaves e sofisticadas (azul-indigo)
- Sidebar com fundo escuro elegante (dark sidebar)
- Reduzir saturação geral para visual mais calmo
- Aumentar border-radius para 0.75rem (mais arredondado)

#### 2. Sidebar Modernizada (`src/components/layout/AppSidebar.tsx`)
- Fundo escuro (slate-900) com texto claro
- Ícones com destaque sutil no item ativo (pill highlight)
- Remover labels de grupo excessivos — agrupar visualmente com espaçamento
- Logo/brand mais proeminente no topo
- Transição suave ao hover

#### 3. Header Simplificado (`src/components/layout/AppLayout.tsx`)
- Header mais alto (h-16) e limpo
- Saudação ao usuário ("Olá, Gestor")
- Remover borda inferior, usar sombra sutil
- Seletor de empresa mais discreto

#### 4. Cards e Componentes Base (`src/components/ui/card.tsx`)
- Remover borda padrão dos cards
- Sombra suave (`shadow-sm hover:shadow-md transition-shadow`)
- Padding mais generoso
- Border-radius maior

#### 5. Dashboard Limpo (`src/components/dashboard/GestorDashboard.tsx`)
- KPI cards com ícones coloridos em fundo circular
- Tipografia hierárquica mais clara (título grande, subtítulo discreto)
- Espaçamento entre seções aumentado
- Remover elementos visuais redundantes

#### 6. Tela de Login (`src/pages/Auth.tsx`)
- Layout split-screen: lado esquerdo com branding/gradiente, lado direito com formulário
- Formulário centralizado e minimalista

#### 7. Filtros do Dashboard (`src/components/dashboard/DashboardFilters.tsx`)
- Filtros inline sem card wrapper (mais leve)
- Estilo de pills/chips para filtros

### Arquivos a Editar
- `src/index.css` — nova paleta de cores
- `src/components/ui/card.tsx` — estilo sem borda, com sombra
- `src/components/layout/AppSidebar.tsx` — sidebar dark moderna
- `src/components/layout/AppLayout.tsx` — header limpo
- `src/components/dashboard/GestorDashboard.tsx` — KPIs e layout do dashboard
- `src/components/dashboard/DashboardFilters.tsx` — filtros simplificados
- `src/pages/Auth.tsx` — login redesenhado
- `src/components/dashboard/charts/ChartCard.tsx` — cards de gráfico limpos

