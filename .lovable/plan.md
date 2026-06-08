
## Importação de Holerites por PDF (com IA)

Novo fluxo onde o admin envia um PDF contendo um ou vários holerites. O sistema usa IA (Gemini) para ler cada página, identifica o colaborador pelo CPF, importa rubricas detalhadas e deixa tudo como rascunho para revisão antes de liberar para assinatura.

### 1. Nova aba "Importar Holerites" em Folha de Pagamento
Em `src/pages/Payroll.tsx`, adicionar aba visível só para admin/gestor.

Tela (`ImportarHoleritesTab.tsx`):
- Upload de PDF (até ~20 MB) com drag-and-drop
- Seleção de **Mês/Ano** e **Empresa** padrão (usados como fallback se a IA não identificar)
- Botão "Processar com IA"
- Barra de progresso por página
- Tabela de resultados:
  | Página | CPF detectado | Funcionário | Mês/Ano | Bruto | Líquido | Status | Ações |
  - Status: ✅ Reconhecido / ⚠️ CPF não encontrado / ❌ Erro de leitura / 🔁 Já existe (mesmo mês/ano)
  - Ações por linha: Ver dados extraídos, Editar mapeamento, Vincular manualmente a um funcionário, Descartar
- Botão final **"Importar como rascunho"** — só importa as linhas marcadas, com `status: 'rascunho'` em `folha_pagamento`

### 2. Edge Function `holerite-importar-pdf`
- Recebe o PDF em base64 + mês/ano/empresa default
- Valida que o caller é admin/gestor (via JWT + `has_role`)
- Envia o PDF para a **Gemini API** (`gemini-2.0-flash` aceita PDF nativamente) com um prompt estruturado pedindo JSON:
  ```json
  {
    "holerites": [
      {
        "pagina": 1,
        "cpf": "12345678900",
        "nome": "FULANO",
        "mes": 5, "ano": 2026,
        "tipo_folha": "mensal",
        "proventos": [{ "codigo": "001", "descricao": "Salário", "valor": 2500.00 }],
        "descontos": [{ "codigo": "INSS", "descricao": "INSS", "valor": 200.00 }],
        "valor_bruto": 2500.00,
        "descontos_total": 200.00,
        "valor_liquido": 2300.00
      }
    ]
  }
  ```
- Para cada holerite extraído:
  - Limpa CPF (só dígitos) → busca `employees.cpf`
  - Se encontrar: tenta casar rubricas com `variaveis_folha` por `codigo` ou `nome` (case-insensitive). Rubricas não reconhecidas vão para uma lista `rubricas_nao_mapeadas` que aparece na revisão.
  - Verifica duplicidade em `folha_pagamento` (employee_id + mes + ano + tipo_folha)
- **Não persiste nada** — devolve um JSON com tudo (extraídos + matches) para a UI revisar.

### 3. Confirmação da importação
Quando o admin clica "Importar como rascunho":
- Frontend chama a edge function `holerite-importar-pdf-confirmar` com a lista revisada
- Para cada item: cria `folha_pagamento` (status=`rascunho`) + `folha_pagamento_itens` para cada rubrica mapeada
- Retorna sumário (X criados, Y pulados, Z erros)

### 4. Pós-importação
- O holerite fica visível na aba normal de Folha de Pagamento marcado como **Rascunho**
- Admin abre, confere, edita se necessário e clica "Liberar" (fluxo já existente) — só então aparece em "Meus Holerites" para o funcionário assinar
- Importações são registradas em `holerite_eventos_auditoria` com `tipo_evento: 'importado_pdf'`

### 5. Arquivos novos / alterados

**Novos:**
- `src/components/payroll/ImportarHoleritesTab.tsx` — UI completa
- `src/components/payroll/ImportPreviewDialog.tsx` — dialog para inspecionar/editar uma linha antes de importar
- `supabase/functions/holerite-importar-pdf/index.ts` — extração via Gemini
- `supabase/functions/holerite-importar-pdf-confirmar/index.ts` — persistência em rascunho

**Alterados:**
- `src/pages/Payroll.tsx` — nova aba

### 6. Detalhes técnicos
- IA: usa `GOOGLE_GEMINI_API_KEY` (já existe). Modelo `gemini-2.0-flash-exp` com `responseMimeType: application/json` e schema estrito para garantir resposta parseable.
- PDFs grandes (>20MB): instruir o usuário a dividir; pode ser adicionado split client-side em iteração futura.
- Multi-empresa: se o nome da empresa aparecer no holerite, tenta casar com `empresas.nome`; senão usa a empresa default selecionada.
- CPFs com pontuação são normalizados antes da busca.
- Toda a extração é stateless até o "Importar como rascunho" — usuário pode descartar tudo sem efeitos colaterais.

### 7. Segurança
- Acesso só admin/gestor (UI + revalidação na edge function)
- PDF não é armazenado — só processado em memória
- RLS de `folha_pagamento` / `folha_pagamento_itens` continua mandando; edge function usa service_role apenas após validar role
