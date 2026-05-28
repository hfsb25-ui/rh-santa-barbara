## Objetivo

Permitir a exportação de um **Pacote de Auditoria NR-1** completo, formatado conforme exigências do Ministério do Trabalho, com evidências documentais e estatísticas consolidadas para fiscalização.

## Escopo

Criar uma nova seção dentro do **Painel Gerencial NR-1** (ou nova página `/nr1/auditoria`) que gere um pacote completo com filtros por período (mês, trimestre, ano, customizado) e exportação em múltiplos formatos.

## Conteúdo do Pacote de Auditoria

**1. Capa institucional** — Empresa, CNPJ, período auditado, responsável SST, data de emissão.

**2. Sumário executivo** — KPIs consolidados (denúncias, clima, riscos, ações, treinamentos, liderança).

**3. Inventário de riscos psicossociais** — Lista completa com categoria, probabilidade × severidade, status, controles, data de identificação.

**4. Plano de ação (evidência preventiva)** — Todas as ações com responsável, prazo, status, evidências, data de conclusão. Destaque para ações vinculadas a riscos altos.

**5. Registro de treinamentos NR-1** — Catálogo + lista de colaboradores concluintes, datas, carga horária, certificados emitidos.

**6. Canal de denúncias** — Estatísticas agregadas por categoria/setor/status, tempo médio de resolução, taxa de conclusão. **Sem dados identificadores** (mantém anonimato exigido).

**7. Pesquisa de clima** — Notas médias por dimensão, evolução histórica, total de respondentes, sem identificação individual.

**8. Avaliação de liderança** — Médias agregadas por categoria, total de respostas anônimas.

**9. Indicadores de saúde organizacional** — Afastamentos no período, vínculo com riscos identificados.

**10. Trilha de evidências** — Lista de documentos, datas-chave e protocolos para comprovação.

## Formatos de Exportação

- **PDF de Auditoria** (oficial) — documento único, paginado, com cabeçalho/rodapé institucional, numeração, sumário, capa. Pronto para impressão e arquivamento.
- **Excel Multi-aba** — uma aba por seção (Riscos, Ações, Treinamentos, Denúncias, Clima, Liderança, Resumo).
- **Pacote ZIP completo** (opcional, fase 2) — PDF + Excel + CSVs brutos + JSON de metadados, para entrega em mídia digital ao auditor.

## Funcionalidades

- **Filtro por período** customizado (data início / data fim) além dos presets já existentes.
- **Filtro por empresa** (para grupos com múltiplos CNPJs).
- **Assinatura digital simples** — campo para nome/cargo do responsável SST, incluído no PDF.
- **Hash de integridade** (SHA-256) gravado no rodapé do PDF para comprovar não-alteração.
- **Registro de exportação** — toda geração fica salva em tabela `nr1_auditoria_exports` (período, usuário, data, hash) como evidência de governança.

## Onde fica na UI

```text
NR-1 → Painel Gerencial
         ├── Aba "Visão Geral"
         ├── Aba "Denúncias"
         ├── Aba "Clima"
         ├── Aba "Riscos"
         ├── Aba "Ações"
         └── Aba "Auditoria MT"  ← NOVA
                ├── Filtros (período / empresa / responsável)
                ├── Pré-visualização das seções
                ├── Botão: Gerar PDF de Auditoria
                ├── Botão: Gerar Excel Multi-aba
                └── Histórico de exportações
```

## Detalhes Técnicos

- **Frontend**: novo componente `AuditoriaMT.tsx` na pasta `src/pages/nr1/` (ou aba dentro de `PainelGerencial.tsx`).
- **PDF**: `jsPDF` + `jspdf-autotable` (já no projeto) com layout A4, cabeçalho institucional, sumário, paginação "Página X de Y".
- **Excel**: `xlsx` (já no projeto), uma aba por seção com cabeçalhos formatados.
- **Hash**: `crypto.subtle.digest('SHA-256', ...)` nativo do browser.
- **Banco**: nova tabela `nr1_auditoria_exports` (período_inicio, período_fim, empresa_id, responsavel, hash, formato, gerado_por, created_at) com RLS para gestores.
- **Anonimato preservado**: queries de denúncias/clima/liderança só retornam agregados ou removem campos identificadores antes da exportação.

## Fora do escopo (sugestões futuras)

- Envio automático por e-mail ao responsável SST.
- Agendamento mensal automático via cron.
- Assinatura digital com certificado ICP-Brasil.

---

**Aprovar este plano** para implementar a aba "Auditoria MT" no Painel Gerencial com PDF oficial, Excel multi-aba, hash de integridade e registro de exportações.
