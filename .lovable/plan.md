
# Módulo NR-1 | Gestão Psicossocial

Entrega faseada, mantendo identidade visual atual (Indigo/Slate, shadow-elegant, rounded-xl) e padrões do sistema (RLS por `gestor`/`admin_parcial`, módulos opcionais para admin_parcial, sidebar agrupada).

---

## Estrutura comum (criada na Fase 1)

- **Sidebar**: novo grupo `NR-1 | Gestão Psicossocial` em `AppSidebar.tsx` com 9 submenus.
- **Rotas**: 9 rotas em `App.tsx` sob `/nr1/...` envolvidas por `AppLayout`.
- **Permissões**: 9 novas chaves em `src/lib/modules.ts` (`nr1-dashboard`, `nr1-clima`, `nr1-denuncias`, `nr1-riscos`, `nr1-treinamentos`, `nr1-acoes`, `nr1-lideranca`, `nr1-relatorios`, `nr1-config`) + mapeamento em `urlToModuleKey`.
- **Anonimato total**: nenhuma tabela de denúncia/clima/avaliação de liderança grava `user_id`. Inserts feitos por edge function com `service_role` que **não** registra autor. RLS bloqueia leitura para qualquer não-gestor.

---

## FASE 1 — Base + Dashboard + Denúncias + Clima  *(esta entrega)*

### 1. Banco de dados (migration única)

**Denúncias (100% anônimas)**
- `nr1_denuncias`: protocolo (gerado), categoria (enum: assedio_moral, assedio_sexual, discriminacao, abuso_autoridade, conflito_interno, pressao_excessiva, outro), descricao, setor (opcional), status (recebida, em_apuracao, concluida, arquivada), classificacao_gravidade, created_at.
- `nr1_denuncias_anexos`: denuncia_id, file_path, file_type (imagem/audio/documento), file_size.
- `nr1_denuncias_apuracao`: denuncia_id, registrado_por (gestor que apurou), nota, evidencia_url, created_at.
- Bucket privado `nr1-denuncias` (RLS storage: insert público anônimo via edge function, leitura só gestor/admin_parcial).

**Clima organizacional**
- `nr1_pesquisas_clima`: titulo, descricao, status (rascunho, ativa, encerrada), setor_id (opcional), data_inicio, data_fim, perguntas (jsonb — perguntas padrão pré-carregadas), created_by.
- `nr1_clima_respostas`: pesquisa_id, setor (texto, opcional para anonimato setorial), respostas (jsonb — array de {pergunta_id, valor 1-5}), created_at. **Sem user_id, sem employee_id.**

**Token único por funcionário**
- `nr1_pesquisa_tokens`: pesquisa_id, token (uuid), usado (bool). Para garantir uma resposta por pessoa sem identificar — gerados em lote pelo gestor e distribuídos.

**RLS / GRANTs**
- Gestor + admin_parcial: ALL nas tabelas.
- Anônimo (anon role): INSERT permitido apenas em `nr1_denuncias`, `nr1_denuncias_anexos`, `nr1_clima_respostas` (com validação de token).
- Nenhuma policy de SELECT para anon/authenticated comum.

### 2. Edge functions

- `submit-denuncia` (verify_jwt=false): recebe payload + anexos (base64), gera protocolo `NR1-AAAAMMDD-XXXX`, salva no bucket, insere sem qualquer rastro de autor. Retorna protocolo.
- `submit-clima-resposta` (verify_jwt=false): valida token, marca usado, insere resposta anônima.

### 3. Páginas (Fase 1)

- `src/pages/nr1/Dashboard.tsx` — KPIs (denúncias abertas, índice clima, hora extra mês, turnover 90d, absenteísmo, setores críticos, treinamentos vencidos, afastados ativos) + gráficos Recharts (evolução clima, denúncias por setor, horas extras mensais, afastamentos) + cards de alerta automáticos.
- `src/pages/nr1/Denuncias.tsx` — Tabs: "Nova denúncia" (form anônimo sem login, copiável para link público posterior) e "Apuração" (lista para gestor: filtros por status/categoria, dialog de detalhes com anexos, registro de apuração, mudança de status).
- `src/pages/nr1/Clima.tsx` — Tabs: "Pesquisas" (CRUD + gerar tokens + link público) e "Resultados" (nota geral, nota por setor, mapa de risco emocional, ranking).

### 4. Componentes auxiliares

- `src/components/nr1/KpiCard.tsx`, `AlertaCard.tsx`, `GraficoEvolucao.tsx`
- `src/components/nr1/denuncias/NovaDenunciaForm.tsx`, `DenunciaDetailsDialog.tsx`
- `src/components/nr1/clima/PesquisaForm.tsx`, `ResultadosClima.tsx`

### 5. Lógica de risco/alertas (motor inicial — usado pelo Dashboard)

Função utilitária `src/lib/nr1/risco.ts` que computa por setor:
- denúncias últimos 90d, % horas extras, turnover 90d, % absenteísmo, nota clima.
- Score 0–100 → faixa (baixo/moderado/alto/crítico). Reutilizada na Fase 2 (Gestão de Riscos).

---

## FASE 2 — Gestão de Riscos + Avaliação de Liderança *(próxima entrega)*

- Página `/nr1/riscos`: mapa de calor por setor, ranking, histórico (tabela `nr1_historico_risco` com snapshot mensal automatizado por pg_cron).
- Página `/nr1/lideranca`: avaliação 360º anônima de líderes (tabela `nr1_avaliacoes_lideranca` sem user_id, com token), ranking, alerta de "liderança tóxica" quando média < 2.5/5 em ≥3 critérios.

## FASE 3 — Treinamentos NR-1 + Ações Preventivas + Relatórios + Config *(última entrega)*

- Treinamentos NR-1 separados (tabelas `nr1_treinamentos`, `nr1_treinamento_participantes`) com certificado, assinatura digital, reciclagem, validade.
- Ações preventivas (`nr1_acoes`) com responsável, anexos, assinatura, evidências.
- Relatórios (PDF via jsPDF, Excel via xlsx) — adequação NR-1, indicadores psicossociais, denúncias, evidências.
- Configurações: thresholds de alerta, perguntas-padrão de clima editáveis, gestão de tokens.

---

## Detalhes técnicos

- **Stack**: Tailwind tokens existentes (`bg-card`, `text-muted-foreground`, `shadow-elegant`), shadcn (Card, Tabs, Dialog, Table, Select, Badge), Recharts.
- **Anonimato verificável**: nenhuma coluna `user_id`/`employee_id`/`ip` nas tabelas de denúncia/clima/liderança. Edge function não loga payload. Bucket de anexos com nome de arquivo aleatório (uuid).
- **Acesso**: páginas só visíveis para `gestor` ou `admin_parcial` com módulo `nr1-*` liberado. Formulários públicos (denúncia + responder clima) ficarão em rotas sem `AppLayout` (Fase 1).
- **Não toco** em `/treinamentos`, `/avaliacoes`, `/saude-ocupacional` existentes — tudo NR-1 fica isolado em `/nr1/*`.

Confirma para começar pela Fase 1?
