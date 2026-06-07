
# Sistema de Assinatura Digital de Holerites

Módulo completo para que cada colaborador visualize, assine digitalmente e baixe seus holerites, com trilha de auditoria imutável e valor probatório conforme Lei 14.063/2020.

## 1. Backend (Lovable Cloud)

### 1.1 Novo bucket de storage (privado)
- `holerites-assinados` — PDFs originais, certificados e selfies (privado, RLS por colaborador).

### 1.2 Novas tabelas

**`holerite_assinaturas`** (registro imutável da assinatura)
- `folha_pagamento_id`, `employee_id`, `protocolo` (único, formato `HOL-AAAAMM-XXXXXX`)
- `hash_documento` (SHA-256 do PDF original)
- `hash_assinatura` (SHA-256 do conjunto evidências)
- `nome_completo`, `cpf`, `matricula`
- `assinatura_imagem_url` (canvas da assinatura manuscrita)
- `selfie_url`
- `ip_publico`, `user_agent`, `navegador`, `sistema_operacional`
- `geo_latitude`, `geo_longitude`, `geo_consentimento` (bool)
- `data_visualizacao`, `data_assinatura`
- `pdf_original_url`, `pdf_certificado_url`
- `status` (`pendente`, `visualizado`, `assinado`)
- Trigger que **bloqueia UPDATE/DELETE** após `status='assinado'` (imutabilidade)

**`holerite_eventos_auditoria`** (append-only)
- `assinatura_id`, `tipo_evento` (`visualizou`, `iniciou_assinatura`, `capturou_selfie`, `assinou`, `baixou_certificado`)
- `ip`, `user_agent`, `geo`, `metadata jsonb`, `created_at`
- Sem UPDATE/DELETE (revogados via RLS + trigger)

### 1.3 RLS
- Colaborador (`funcionario`): SELECT/INSERT apenas onde `employee_id` casa com seu próprio (via join com `employees.user_id = auth.uid()`)
- Gestor/admin: SELECT em tudo
- Nenhuma role pode UPDATE/DELETE registros assinados

### 1.4 Edge Functions
- **`gerar-holerite-assinavel`**: cria PDF do holerite (reaproveita `pdfGeneratorHolerite`), calcula SHA-256, gera protocolo + QRCode (URL pública de validação), salva no storage, cria linha em `holerite_assinaturas` com `status='pendente'`.
- **`assinar-holerite`**: recebe assinatura manuscrita (base64), selfie (base64), geo, consentimento. Valida que `employee_id` pertence ao usuário logado. Captura IP via header. Gera certificado PDF, hash final, marca `status='assinado'`, registra evento.
- **`validar-holerite`** (público): consulta por protocolo/hash e retorna dados básicos para QR Code.

## 2. Frontend

### 2.1 Acesso (ambos os pontos)
- **Card "Holerites Pendentes"** no `FuncionarioDashboard` mostrando contador + CTA.
- **Página dedicada** `/meus-holerites` listando todos (pendentes, assinados), com filtros por ano.

### 2.2 Fluxo de assinatura (dialog/wizard de 4 passos)
1. **Visualizar PDF** (react-pdf inline) — registra evento `visualizou`
2. **Aceite explícito** — checkbox "Li e concordo com o conteúdo deste holerite"
3. **Captura de selfie** — `getUserMedia`, preview, confirmar (obrigatório a cada assinatura)
4. **Assinatura manuscrita** — reaproveita `SignatureCanvas` existente; pede geo (opcional, com toast explicando consentimento); confirma e envia

Após sucesso: mostra protocolo, hash, botões "Baixar Holerite" e "Baixar Certificado".

### 2.3 Painel admin
- Em `HoleritesTab` (visão admin do funcionário) e no módulo Payroll: badge de status (Pendente/Assinado), botão "Ver Auditoria" abrindo dialog com:
  - Linha do tempo de eventos
  - Selfie capturada
  - IP, navegador, SO, geo
  - Hashes
  - Botão "Baixar Certificado"

### 2.4 Página pública de validação
- `/validar-holerite/:protocolo` — mostra: empresa, colaborador (parcial), data, hashes, status "VÁLIDO". Para terceiros que escaneiam o QR.

## 3. Certificado PDF
Novo gerador `pdfGeneratorCertificadoHolerite.ts`:
- Cabeçalho oficial + logo empresa
- Protocolo único, hash SHA-256
- Dados do signatário (nome, CPF, matrícula)
- Data/hora oficial (UTC + Brasília)
- Evidências: IP, navegador, SO, geo (se houver)
- Selfie embutida
- Imagem da assinatura manuscrita
- Timeline de eventos da auditoria
- Rodapé: "Assinatura eletrônica conforme Lei nº 14.063/2020"

## 4. Segurança
- Toda query no front filtra por `employee_id` derivado do `auth.uid()` (via hook existente `useUserPermissions`)
- Edge functions revalidam ownership server-side
- IP capturado do header (`x-forwarded-for`) — nunca do cliente
- Selfie e assinatura nunca expostas em buckets públicos (URLs assinadas com expiração)
- 2FA dispensado: senha + selfie biométrica + IP/geo formam o segundo fator combinado

## 5. Dependências novas
- `qrcode` (gerar QR no PDF)
- `react-pdf` ou `@react-pdf/renderer` para visualização inline (já temos jsPDF para geração)

## Arquivos principais a criar/editar
- **Migration**: 2 tabelas + RLS + triggers de imutabilidade + bucket
- **Edge functions**: `gerar-holerite-assinavel`, `assinar-holerite`, `validar-holerite`
- **Novo**: `src/lib/pdfGeneratorCertificadoHolerite.ts`
- **Novo**: `src/pages/MeusHolerites.tsx`
- **Novo**: `src/pages/ValidarHolerite.tsx` (pública)
- **Novo**: `src/components/holerites-assinatura/` (Wizard, SelfieCapture, PdfViewer, AuditoriaDialog)
- **Editar**: `src/components/dashboard/FuncionarioDashboard.tsx` (card pendentes)
- **Editar**: `src/components/employees/tabs/HoleritesTab.tsx` (status + auditoria admin)
- **Editar**: `src/App.tsx` (rotas), `src/lib/modules.ts` (novo módulo)
- **Reuso**: `SignatureCanvas`, `pdfGeneratorHolerite`
