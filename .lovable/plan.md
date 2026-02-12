

# Reestruturar Dashboard: Sidebar + Lista de Funcionarios

## Problema Atual
- O dashboard tem **mais de 30 botoes** em um grid desorganizado, dificultando encontrar funcionalidades
- A lista de funcionarios mostra cards basicos sem informacoes suficientes de relance
- Toda a navegacao esta concentrada dentro do dashboard, sem hierarquia clara

## Solucao Proposta

### 1. Sidebar Lateral Colapsavel
Substituir o grid de botoes por uma sidebar lateral organizada em categorias logicas:

```text
+------------------+-----------------------------------+
| SIDEBAR          | CONTEUDO PRINCIPAL                |
|                  |                                   |
| > Visao Geral    |  (Dashboard / Pagina ativa)      |
|                  |                                   |
| PESSOAS          |                                   |
|   Funcionarios   |                                   |
|   Gestores       |                                   |
|   Funcoes        |                                   |
|   People Manager |                                   |
|                  |                                   |
| OPERACIONAL      |                                   |
|   Ponto          |                                   |
|   Ferias         |                                   |
|   Folgas/Avisos  |                                   |
|   Avaliacoes     |                                   |
|   Treinamentos   |                                   |
|   Checklists     |                                   |
|   Eventos        |                                   |
|                  |                                   |
| RECRUTAMENTO     |                                   |
|   Vagas          |                                   |
|   Candidaturas   |                                   |
|                  |                                   |
| FINANCEIRO       |                                   |
|   Folha Pgto     |                                   |
|   Reajuste       |                                   |
|   Adiantamentos  |                                   |
|   Financeiro     |                                   |
|                  |                                   |
| DOCUMENTOS       |                                   |
|   Contratos      |                                   |
|   TACs           |                                   |
|   Crachas        |                                   |
|                  |                                   |
| ESTOQUE          |                                   |
|   EPIs/Uniformes |                                   |
|                  |                                   |
| SAUDE            |                                   |
|   Saude Ocup.    |                                   |
|                  |                                   |
| ADMIN            |                                   |
|   Empresas       |                                   |
|   Setores        |                                   |
|   Relatorios     |                                   |
|   Configuracoes  |                                   |
|                  |                                   |
| CEREBRUM IA      |                                   |
+------------------+-----------------------------------+
```

- Usa o componente `Sidebar` do shadcn/ui ja disponivel no projeto
- Colapsavel para modo mini (so icones)
- Destaque visual na rota ativa
- Grupos expansiveis/retrativeis

### 2. Lista de Funcionarios Melhorada
Transformar os cards simples em uma **tabela** mais informativa e compacta:

- Foto/avatar do funcionario
- Nome, cargo, setor
- Empresa (quando filtro "Todas")
- Status com badge colorido
- Data de admissao
- Tipo de contrato
- Botao de acao rapida (ver detalhes)
- Paginacao ou scroll infinito para grandes listas

### 3. Layout Global
- Criar um componente `AppLayout` que envolve todas as paginas do gestor com a sidebar
- O header fica simplificado (logo + seletor empresa + logout)
- Remover o grid de botoes do `GestorDashboard`
- O dashboard fica limpo: apenas KPIs, alertas, graficos e a lista

---

## Detalhes Tecnicos

### Arquivos a Criar
- `src/components/layout/AppLayout.tsx` — Layout global com SidebarProvider + Sidebar + header
- `src/components/layout/AppSidebar.tsx` — Sidebar com todas as categorias e links

### Arquivos a Modificar
- `src/App.tsx` — Envolver rotas do gestor com `AppLayout`
- `src/pages/Dashboard.tsx` — Passar layout para o AppLayout
- `src/components/dashboard/GestorDashboard.tsx` — Remover header, grid de botoes, simplificar para apenas conteudo do dashboard
- `src/components/employees/EmployeeList.tsx` — Trocar cards por tabela com mais colunas e avatar

### Dependencias
- Nenhuma nova — usa `Sidebar`, `Table`, `Avatar` ja instalados no projeto

