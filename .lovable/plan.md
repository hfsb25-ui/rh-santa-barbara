

# Tornar Todos os Menus/Abas Responsivos

## Problema Identificado

Varias paginas usam `TabsList` com `grid grid-cols-N` fixo, o que causa sobreposicao e corte de texto em telas menores. Algumas paginas ja foram corrigidas (Stock, Relatorios, GestorDashboard, EmployeeDetails), mas muitas ainda nao.

## Paginas que Precisam de Correcao

### Criticas (muitas colunas, quebram em mobile)

1. **ControlePonto.tsx** - `grid-cols-6` fixo, 6 abas com texto longo
2. **PeopleManager.tsx** - `grid-cols-7` fixo, 7 abas com icones + texto
3. **VacationSchedule.tsx** - `grid-cols-5` fixo, 5 abas
4. **AIInsights.tsx** - `grid-cols-5` (parcialmente ok com `lg:w-auto`, mas falta scroll mobile)

### Moderadas (3-4 colunas, podem quebrar em telas pequenas)

5. **Treinamentos.tsx** - `grid-cols-3` fixo
6. **PlanoAdmissaoDesligamento.tsx** - `grid-cols-3` fixo com texto longo
7. **EmployeeForm.tsx** - `grid-cols-4` fixo
8. **EmployeeInfo.tsx** - `grid-cols-4` fixo
9. **BirthdayListDialog.tsx** - `grid-cols-3` fixo

### Ja OK (nao precisam de mudanca)

- **Settings.tsx** - usa `flex-wrap` (ok)
- **Stock.tsx** - usa `overflow-x-auto tabs-scroll` (ok)
- **Relatorios.tsx** - usa `inline-flex lg:grid` (ok)
- **GestorDashboard.tsx** - usa `inline-flex lg:grid` (ok)
- **EmployeeDetails.tsx** - usa `inline-flex overflow-x-auto` (ok)
- **Tacs.tsx** - `grid-cols-2` (ok, so 2 abas)
- **Eventos.tsx** - `grid-cols-2 max-w-md` (ok)
- **Sectors.tsx** - `grid-cols-2` (ok)
- **Payroll.tsx** - sem grid fixo (ok)
- **Avaliacoes.tsx** - sem grid fixo (ok)

## Solucao Padrao

Aplicar o mesmo padrao ja usado nas paginas corrigidas:

```text
TabsList: "inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-N"
TabsTrigger: adicionar "flex-shrink-0 whitespace-nowrap" ou "min-w-fit"
```

Em mobile: scroll horizontal com indicador visual sutil.
Em desktop (lg+): grid normal com colunas distribuidas.

Para abas com icone + texto longo, esconder o texto em mobile e mostrar so o icone:
```text
<span className="hidden sm:inline">Texto</span>
```

## Alteracoes por Arquivo

### 1. `src/pages/ControlePonto.tsx`
- Linha 43: trocar `grid w-full grid-cols-6` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-6`
- Cada TabsTrigger: adicionar `flex-shrink-0 whitespace-nowrap`
- Esconder texto em mobile, manter so icone com `<span className="hidden sm:inline">`

### 2. `src/pages/PeopleManager.tsx`
- Linha 35: trocar `grid w-full grid-cols-7 h-auto` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-7 h-auto`
- Cada TabsTrigger: adicionar `flex-shrink-0`

### 3. `src/pages/VacationSchedule.tsx`
- Linha 79: trocar `grid w-full grid-cols-5` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-5`
- Cada TabsTrigger: adicionar `flex-shrink-0`

### 4. `src/pages/AIInsights.tsx`
- Linha 44: trocar `grid w-full grid-cols-5 lg:w-auto lg:inline-grid` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-5`
- Cada TabsTrigger: adicionar `flex-shrink-0`

### 5. `src/pages/Treinamentos.tsx`
- Linha 17: trocar `grid w-full grid-cols-3` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-3`
- Cada TabsTrigger: adicionar `flex-shrink-0 whitespace-nowrap`

### 6. `src/pages/PlanoAdmissaoDesligamento.tsx`
- Linha 28: trocar `grid w-full grid-cols-3` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-3`
- Cada TabsTrigger: adicionar `flex-shrink-0 whitespace-nowrap`

### 7. `src/components/forms/EmployeeForm.tsx`
- Linha 393: trocar `grid w-full grid-cols-4` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-4`
- Cada TabsTrigger: adicionar `flex-shrink-0`

### 8. `src/components/employees/EmployeeInfo.tsx`
- Linha 123: trocar `grid w-full grid-cols-4` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-4`
- Cada TabsTrigger: adicionar `flex-shrink-0`

### 9. `src/components/dashboard/BirthdayListDialog.tsx`
- Linha 202: trocar `grid w-full grid-cols-3` por `inline-flex w-full overflow-x-auto tabs-scroll lg:grid lg:grid-cols-3`
- Cada TabsTrigger: adicionar `flex-shrink-0`

## Resultado

- Todas as paginas terao scroll horizontal suave em mobile
- Em desktop, mantem o layout em grid
- Zero sobreposicao de texto
- Padrao consistente em todo o sistema
- Classe `tabs-scroll` ja existente no CSS global sera reutilizada
