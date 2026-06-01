
# Backup retroativo no Google Drive

Migrar para o Drive todos os **Holerites** e **Recibos de EPI/Uniforme** já registrados no sistema, em execução única automática (sem tela nova).

## Como vai funcionar

1. Crio uma edge function nova `drive-backup-retroativo`.
2. Ela percorre o banco em lotes, regenera cada PDF no servidor e reaproveita o `drive-backup-upload` para subir nas pastas certas (`HOLERITE/AAAA-MM/...`, `EPI/...`, `UNIFORME/...`).
3. Para evitar duplicar, cada registro processado é marcado numa coluna nova `backup_drive_em` (timestamp). Se rodar de novo, ignora os já enviados.
4. Você dispara 1x clicando em **Configurações → Google Drive → "Rodar backup retroativo agora"** (botão discreto, só pra você acionar). Mostra progresso simples (X de Y processados) e um log final. Não precisa ficar com a aba aberta — a função continua no servidor.

## O que será processado

- **Holerites**: todos os registros de `lancamentos_folha` (todos os meses, todos os funcionários).
- **Recibos EPI**: todos os registros de distribuição de EPI.
- **Recibos Uniforme**: todos os registros de distribuição de uniforme.

Funcionários demitidos **entram** (a documentação deles precisa estar no Drive também).

## O que NÃO entra

- TACs, desligamentos, encaminhamentos, crachás, etiquetas, contratos — você não pediu nesta rodada. Posso adicionar depois se quiser.
- PDFs que dependiam de assinatura manual feita em papel: o reenvio terá o PDF "limpo" (sem assinatura digitalizada), porque não temos a imagem da assinatura salva.

## Detalhes técnicos

**Edge function `drive-backup-retroativo`**
- Recebe `{ tipos: ["holerite","epi","uniforme"], lote_size: 20 }`.
- Para cada tipo, busca os registros com `backup_drive_em IS NULL` em lotes de 20.
- Regenera o PDF **no servidor** usando `jsPDF` (compatível com Deno via `npm:jspdf`). Reuso a lógica dos geradores atuais portando o essencial para Deno — mesmo layout dos PDFs que o sistema produz hoje.
- Faz upload via `drive-backup-upload` (action `upload`), passando `tipo`, `nome_arquivo`, `employee_id`, `subpasta` (ex.: `2025-11` para holerite).
- Atualiza `backup_drive_em = now()` no registro.
- Continua até esgotar; retorna `{ processados, erros, restantes }`.

**Migração SQL**
- `ALTER TABLE lancamentos_folha ADD COLUMN backup_drive_em timestamptz;`
- `ALTER TABLE epi_distribuicoes ADD COLUMN backup_drive_em timestamptz;` (nome exato confirmado ao implementar)
- `ALTER TABLE uniforme_distribuicoes ADD COLUMN backup_drive_em timestamptz;` (idem)
- Index parcial em cada uma: `WHERE backup_drive_em IS NULL` para o cursor de lotes ficar rápido.

**Botão na UI** (`DriveBackupSettings.tsx`)
- Card novo "Backup retroativo" com:
  - Texto explicando que vai regerar e enviar todos os holerites e recibos antigos.
  - Botão **"Iniciar backup retroativo"** (confirma antes de rodar).
  - Contador de progresso (pull a cada 5s via `drive_backup_log` filtrado por hoje).
  - Botão **"Parar"** (seta uma flag que a função consulta entre lotes).

**Auto-execução**
- Após a migração rodar e a função estar implantada, o botão na UI permite a primeira execução. Se preferir 100% sem clique, posso criar um cron `pg_cron` que dispara 1x e se auto-desativa — me avise se quer assim.

**Custo / tempo**
- Cada upload demora ~1-2s. Mil holerites = ~25min de processamento em background. Não trava nada no sistema.

## Riscos

- Se o layout do PDF regerado divergir um pouco do original (fontes, espaçamento), os holerites antigos no Drive serão "versão atual" e não cópia fiel do que o funcionário recebeu. Aceitável para backup, não para auditoria fiscal estrita.
- Se um lançamento de folha estiver com dados incompletos (rubrica zerada, funcionário sem CPF na época), o PDF gerado pode sair com campos vazios. Vou logar esses casos em `drive_backup_log` com `status='erro'` em vez de quebrar.

Aprove para eu implementar.
