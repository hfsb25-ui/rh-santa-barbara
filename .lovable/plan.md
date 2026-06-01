# Backup automático no Google Drive

Integração com **uma conta Google central da empresa** (via connector do Lovable) para enviar automaticamente todos os PDFs gerados pelo sistema para uma pasta organizada no Drive.

## Como vai funcionar

1. Você (admin) conecta **uma vez** a conta Google da empresa em **Configurações → Integrações → Google Drive**.
2. Toda vez que o sistema gerar um PDF (holerite, contrato, TAC, desligamento, EPI, etc.), uma cópia é enviada automaticamente para o Drive, em pastas organizadas.
3. Cada upload fica registrado numa tabela `drive_backups` com link direto para o arquivo no Drive — dá pra auditar tudo.

## Estrutura de pastas no Drive

```
📁 RH Santa Bárbara - Backup
├── 📁 Holerites
│   └── 📁 2026-06
│       └── JOAO_SILVA_2026-06.pdf
├── 📁 Contratos
│   └── JOAO_SILVA_contrato_2026-06-01.pdf
├── 📁 TACs
├── 📁 Desligamentos
├── 📁 EPIs
├── 📁 Atestados
└── 📁 Outros
```

## O que será feito

### 1. Conectar Google Drive (connector nativo)
- Usa o connector `google_drive` do Lovable — você só clica em "Conectar" e autoriza com sua conta Google.
- Sem precisar configurar nada no Google Cloud Console.

### 2. Nova tabela `drive_backup_log`
Registra cada arquivo enviado: tipo, nome, employee_id, drive_file_id, drive_url, status, data, erro (se houver).

### 3. Configuração em Configurações → Backup Drive
- Toggle: ativar/desativar backup automático
- Status da conexão (conectado/desconectado)
- ID da pasta raiz no Drive (opcional — se vazio, cria automaticamente)
- Botão "Testar upload"
- Lista dos últimos 50 backups com status e link

### 4. Edge function `drive-backup-upload`
- Recebe: tipo do documento, nome, employee_id, conteúdo do PDF (base64)
- Cria/encontra a pasta correta no Drive
- Faz upload via gateway do connector
- Registra no `drive_backup_log`
- Retorna sucesso/erro

### 5. Hook `useDriveBackup`
Função simples `backupPdf(tipo, nome, pdfBlob, employeeId?)` para chamar nos pontos de geração.

### 6. Integração nos geradores de PDF existentes
Adicionar chamada de backup (não-bloqueante, em background) em:
- `pdfGenerator.ts` (holerites, recibos genéricos)
- `pdfGeneratorContaSalario.ts`
- `pdfGeneratorTac.ts`
- `pdfGeneratorDesligamento.ts`
- `pdfGeneratorEncaminhamento.ts`
- `pdfGeneratorCrachas.ts` / `pdfGeneratorCrachasCustom.ts`
- `pdfGeneratorEtiquetasPonto.ts`
- `pdfGeneratorPonto.ts`
- Geração de contratos em `GenerateContractButton.tsx`

Se o backup falhar, o PDF continua sendo gerado normalmente — só registra o erro no log (não trava o usuário).

### 7. Tela de auditoria
Em **Configurações → Backup Drive**: tabela com histórico de uploads, filtros por tipo/período/status, link "Abrir no Drive".

## Detalhes técnicos

- **Connector**: `google_drive` via `standard_connectors--connect` (gateway Lovable, sem expor credenciais no código).
- **Upload**: `POST https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files?uploadType=multipart` com `Authorization: Bearer ${LOVABLE_API_KEY}` e `X-Connection-Api-Key: ${GOOGLE_DRIVE_API_KEY}`.
- **Pastas**: criadas on-demand via `files.create` com mimeType `application/vnd.google-apps.folder`. ID das pastas cacheado em `drive_folder_cache` para não recriar.
- **Tabela `drive_backup_log`**: `id, tipo, nome_arquivo, employee_id (nullable), drive_file_id, drive_url, status (sucesso/erro), erro_mensagem, tamanho_bytes, created_at` — RLS apenas para gestores, GRANT padrão.
- **Tabela `drive_backup_config`**: `id, ativo (bool), pasta_raiz_id, pasta_raiz_nome` (singleton).
- **Tabela `drive_folder_cache`**: `caminho (text PK), drive_folder_id`.
- **Edge function**: `verify_jwt = false` + validação manual do JWT do usuário (padrão do projeto).

## O que NÃO está incluído

- Sincronização bidirecional (Drive → Sistema). Apenas upload.
- Backup retroativo dos PDFs já gerados antes da ativação (posso adicionar depois se quiser).
- OAuth por funcionário individual.

Aprove para eu implementar.