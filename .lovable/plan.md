

# Consulta Judicial de Colaboradores por CPF

## Objetivo
Criar uma página que permite buscar automaticamente se colaboradores estão envolvidos em processos judiciais, usando o CPF para consulta em fontes externas via busca inteligente com IA.

## Abordagem Técnica

A API pública do DATAJUD (CNJ) **não permite busca por CPF** diretamente (apenas por número de processo). Para contornar isso, usaremos o **Perplexity** (disponível como conector) para fazer buscas web inteligentes por processos judiciais associados ao nome + CPF do colaborador em fontes públicas (JusBrasil, Escavador, tribunais estaduais, etc.).

## Componentes

### 1. Edge Function: `consulta-judicial`
- Recebe `employee_id` ou `cpf` + `nome`
- Usa Perplexity (modelo `sonar`) para buscar: `"processos judiciais CPF {cpf} {nome_completo}"`
- Retorna resultados estruturados (processos encontrados, tribunal, tipo, status)
- Salva o resultado da consulta no banco para histórico

### 2. Tabela: `consultas_judiciais`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador |
| employee_id | uuid (FK) | Colaborador consultado |
| data_consulta | timestamp | Quando foi feita |
| resultado | jsonb | Resultado bruto da busca |
| processos_encontrados | integer | Quantidade |
| resumo | text | Resumo gerado pela IA |
| consultado_por | uuid | Quem solicitou |

RLS restrito ao papel `gestor`.

### 3. Página: `src/pages/ConsultaJudicial.tsx`
- Header com título "Consulta Judicial"
- Lista de colaboradores com botão "Consultar" ao lado de cada um
- Campo de busca para filtrar por nome/CPF
- Botão "Consultar Todos" para varredura em lote
- Resultados exibidos em cards com badges: "Sem processos" (verde), "Processos encontrados" (vermelho)
- Histórico de consultas anteriores
- Coluna mostrando última consulta e resultado

### 4. Navegação
- Adicionar "Consulta Judicial" no sidebar, grupo **Documentos**, ícone `Scale`
- Rota `/consulta-judicial` no App.tsx

## Fluxo do Usuário
1. Acessa a página "Consulta Judicial"
2. Vê a lista de colaboradores ativos com CPF
3. Clica "Consultar" em um colaborador específico (ou "Consultar Todos")
4. O sistema envia o CPF + nome para a edge function
5. A edge function usa Perplexity para buscar processos judiciais
6. O resultado é salvo no banco e exibido na tela
7. Consultas anteriores ficam no histórico

## Pré-requisito
- Conectar o **Perplexity** ao projeto (conector disponível)

## Detalhes Técnicos
- Busca individual: ~3s por colaborador
- Busca em lote: processamento sequencial com feedback de progresso
- Cache de resultados: não refaz busca se já foi feita nos últimos 30 dias (configurável)
- Resultados salvos como JSONB para flexibilidade

