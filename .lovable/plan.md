## Auditoria e Exportação de Holerites Assinados (Admin)

Criar uma área administrativa dedicada para fiscalização, onde o admin pode filtrar, auditar e exportar em lote todos os holerites assinados de um período — com comprovantes de assinatura e trilha de auditoria completa.

### 1. Nova aba no módulo Folha de Pagamento
Adicionar aba **"Auditoria & Fiscalização"** dentro de `src/pages/Payroll.tsx`, visível apenas para `admin`/`gestor`.

### 2. Tela de Auditoria (`AuditoriaHoleritesTab.tsx`)
Filtros no topo:
- **Mês / Ano** (obrigatórios)
- **Empresa** (multi-select)
- **Tipo de Contrato** (CLT, PJ, Estágio, Temporário, etc.)
- **Setor** (opcional)
- **Status da assinatura**: Todos / Assinados / Pendentes / Visualizados / Não enviados
- **Funcionário** (busca por nome/CPF)

Tabela de resultados com colunas:
| Funcionário | Empresa | Contrato | Mês/Ano | Status | Protocolo | Data Assinatura | IP | Ações |

Indicadores no topo:
- Total de holerites do período
- % assinados / pendentes / não enviados
- Total de funcionários com pendência

Ações por linha:
- Ver Auditoria (reusa `AuditoriaHoleriteDialog`)
- Baixar Holerite Original
- Baixar Certificado de Assinatura
- Baixar Pacote Completo (zip individual)

### 3. Exportação em Lote (Pacote de Fiscalização)
Botão **"Exportar Pacote de Fiscalização"** que gera um arquivo `.zip` contendo:

```
fiscalizacao_AAAAMM_empresa/
├── _INDICE.pdf                      → relatório executivo
├── _AUDITORIA.xlsx                  → planilha completa
├── holerites/
│   ├── FUNCIONARIO_CPF_holerite.pdf
│   └── ...
├── certificados/
│   ├── FUNCIONARIO_CPF_certificado.pdf
│   └── ...
└── evidencias/
    ├── FUNCIONARIO_CPF_selfie.jpg
    └── FUNCIONARIO_CPF_assinatura.png
```

**_INDICE.pdf** (gerado com jsPDF):
- Cabeçalho com empresa(s), período, data de geração, responsável (admin logado)
- Resumo: total, assinados, pendentes, % cobertura
- Base legal: Lei nº 14.063/2020, CLT art. 464
- Lista de holerites com protocolo, hash, data/hora, IP
- Hash SHA-256 do próprio pacote (rodapé de integridade)

**_AUDITORIA.xlsx** (gerado com XLSX já instalado):
Colunas: Funcionário | CPF | Empresa | Contrato | Setor | Cargo | Mês/Ano | Bruto | Líquido | Status | Protocolo | Data Assinatura | IP | Navegador | SO | Geolocalização | Hash Documento | Hash Assinatura | URL Validação Pública

### 4. Edge Function `holerite-export-fiscalizacao`
Por causa do volume (centenas de PDFs) e do bypass de RLS para baixar do bucket privado:

- Recebe filtros do frontend
- Valida que o caller é `admin`/`gestor` (via JWT + `has_role`)
- Consulta `holerite_assinaturas` + `folha_pagamento` + `employees` + `empresas`
- Baixa cada PDF/imagem do bucket `holerites-assinados` com service_role
- Monta o zip em memória (JSZip)
- Calcula SHA-256 do zip final
- Registra **evento de auditoria** (`tipo_evento: 'exportou_fiscalizacao'`) em `holerite_eventos_auditoria` com filtros aplicados, IP, user-agent e quantidade de arquivos
- Retorna o zip como `application/zip`

### 5. Trilha de Auditoria das Exportações
Nova tabela `holerite_exportacoes_fiscalizacao` (registro imutável de quem exportou o quê):
- `exportado_por` (uuid)
- `nome_exportador`, `email_exportador`
- `filtros_aplicados` (jsonb: mês, ano, empresa_id, tipo_contrato, etc.)
- `quantidade_holerites`
- `hash_pacote` (SHA-256)
- `ip`, `user_agent`
- Trigger bloqueia UPDATE/DELETE
- RLS: SELECT apenas admin/gestor; INSERT só pela edge function (service_role)

Nova sub-aba **"Histórico de Exportações"** lista esses registros (quem exportou, quando, filtros, hash) — prova de cadeia de custódia para o próprio fiscal.

### 6. Arquivos novos / alterados

**Novos:**
- `src/components/payroll/AuditoriaHoleritesTab.tsx` — tela de auditoria + filtros + tabela
- `src/components/payroll/HistoricoExportacoesTab.tsx` — log de exportações
- `src/lib/pdfGeneratorIndiceFiscalizacao.ts` — gera o `_INDICE.pdf`
- `src/lib/xlsxGeneratorAuditoriaHolerites.ts` — gera o `_AUDITORIA.xlsx`
- `supabase/functions/holerite-export-fiscalizacao/index.ts` — empacotamento server-side
- Migração: tabela `holerite_exportacoes_fiscalizacao` + RLS + grants + trigger imutável

**Alterados:**
- `src/pages/Payroll.tsx` — adiciona as duas novas abas
- `src/lib/modules.ts` — entrada de menu (se aplicável)

### 7. Segurança
- Acesso restrito a `admin` e `gestor` (via `useUserPermissions` + revalidação na edge function com `has_role`)
- URLs assinadas de curta duração para previews; downloads em lote vão direto pela edge function (não expõe paths do bucket)
- Toda exportação é registrada e imutável
- Hash do pacote permite ao fiscal verificar integridade depois

### Reutilização
- `AuditoriaHoleriteDialog` já existe — reaproveitado direto
- `pdfGeneratorHolerite` / `pdfGeneratorCertificadoHolerite` — não precisam mudar
- `XLSX` já está no `package.json`
- Adicionar `jszip` como dependência (apenas na edge function via `npm:jszip`)
