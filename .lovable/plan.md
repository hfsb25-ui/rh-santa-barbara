## Objetivo
Adicionar uma aba **"Alertas"** na página **Controle de Ponto** que calcula automaticamente, a partir dos registros já existentes (`registros_ponto`, `banco_horas`, `configuracao_horas_trabalho`), funcionários com comportamento recorrente fora do padrão — tudo configurável pelo admin.

## Tipos de alertas

1. **Intervalo abaixo do mínimo** — funcionário tirou intervalo menor que X minutos em pelo menos N dias no período.
2. **Intervalo acima do máximo** — intervalo maior que X minutos em pelo menos N dias.
3. **Atraso recorrente** — hora de entrada após `hora_entrada_prevista + tolerância` em pelo menos N dias.
4. **Saída antecipada recorrente** — hora de saída antes de `hora_saida_prevista - tolerância` em N dias (extra útil).
5. **Banco de horas negativo / fora da faixa** — `saldo_horas` abaixo de um limite configurado (ex.: −10h) ou acima de um teto (ex.: +40h).

Cada regra tem: **ativa/inativa**, **valor limite** (minutos/horas), **mínimo de ocorrências (N)**, **janela em dias** (ex.: últimos 30/60/90 dias) e **tolerância** quando aplicável.

## Mudanças no banco

Nova tabela `configuracao_alertas_ponto` (single-row, gerida pelo admin):
- `intervalo_min_minutos`, `intervalo_max_minutos`
- `tolerancia_atraso_minutos`, `tolerancia_saida_minutos`
- `banco_horas_min`, `banco_horas_max`
- `ocorrencias_minimas` (default 3), `janela_dias` (default 30)
- flags `alerta_intervalo_curto_ativo`, `alerta_intervalo_longo_ativo`, `alerta_atraso_ativo`, `alerta_saida_antecipada_ativo`, `alerta_banco_horas_ativo`

RLS: leitura para `authenticated`, escrita só para `gestor`/`admin_parcial`. GRANTs explícitos.

## Mudanças no frontend

- **Novo componente** `src/components/ponto/AlertasPonto.tsx`:
  - Busca configuração + `registros_ponto` da janela + `banco_horas` + `configuracao_horas_trabalho`.
  - Calcula em memória os funcionários que disparam cada regra (contando ocorrências por employee).
  - Renderiza cards/seções por tipo de alerta com nome do funcionário (UPPERCASE), nº de ocorrências, detalhes e link para o histórico de ponto.
  - Filtros por empresa/setor reutilizando padrão existente.

- **Novo componente** `src/components/ponto/ConfiguracaoAlertasPonto.tsx`:
  - Formulário com todos os limites e toggles, salvando em `configuracao_alertas_ponto`.

- **`src/pages/ControlePonto.tsx`**: adicionar duas abas — **"Alertas"** (com badge mostrando total de alertas) e **"Config. Alertas"** dentro da tab existente de configuração ou como aba separada.

- **`AppSidebar`/Dashboard**: opcional — badge no menu Controle de Ponto se houver alertas ativos (decisão pequena, posso incluir).

## Detalhes técnicos

- Cálculo client-side via React Query (já é o padrão do módulo) — sem edge function necessária, dado o volume típico.
- Intervalo em minutos = `EXTRACT(EPOCH FROM (hora_fim_intervalo - hora_inicio_intervalo))/60`, ignorando registros sem intervalo.
- Atraso = `hora_entrada > hora_entrada_prevista + tolerancia`.
- "Recorrência" = contagem de dias-evento por `employee_id` ≥ `ocorrencias_minimas` dentro de `janela_dias`.
- Banco de horas: leitura direta de `banco_horas.saldo_horas`.

## Arquivos
- `supabase/migrations/<novo>.sql` (tabela + RLS + GRANTs + seed da linha única)
- `src/components/ponto/AlertasPonto.tsx` (novo)
- `src/components/ponto/ConfiguracaoAlertasPonto.tsx` (novo)
- `src/pages/ControlePonto.tsx` (nova aba)

Confirma para eu implementar?
