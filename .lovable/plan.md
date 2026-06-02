## Melhorias no Editor Visual de Crachá

Tornar o `BadgeVisualEditor` profissional, com referências visuais e controles avançados.

### 1. Guias visuais e referências espaciais
- **Réguas** nas bordas (em mm) — topo e lateral esquerda
- **Linhas de centro** (vertical + horizontal) sempre visíveis em tracejado sutil
- **Grid de fundo** (5mm) ativável com botão toggle
- **Smart guides**: quando arrastar um elemento, mostrar linhas magenta indicando alinhamento com:
  - Centro do canvas (vertical/horizontal)
  - Bordas de outros elementos
  - Espaçamento igual entre elementos
- **Snap to grid/center**: elemento "gruda" ao passar perto do centro ou de outro elemento

### 2. Controles de posicionamento precisos
Painel direito ganha campos numéricos para o elemento selecionado:
- **X / Y** (posição em px, editável)
- **Largura / Altura** (editável)
- **Botões de alinhamento**:
  - Centralizar horizontalmente no canvas
  - Centralizar verticalmente no canvas
  - Alinhar ao topo/base/esquerda/direita
- **Distribuir** elementos selecionados (espaçamento igual)

### 3. Camadas (layers)
- Painel lateral mostrando lista de elementos
- Reordenar (trazer para frente / enviar para trás)
- Mostrar/ocultar elemento (ícone olho)
- Travar elemento (cadeado) para não mover acidentalmente
- Renomear elemento

### 4. Atalhos de teclado
- `Setas` — mover 1px (shift+seta = 10px)
- `Ctrl+D` — duplicar
- `Delete` — remover
- `Ctrl+Z / Ctrl+Y` — desfazer/refazer (histórico de 30 ações)
- `Ctrl+A` — selecionar tudo
- `Esc` — desselecionar

### 5. Zoom e visualização
- Botões **+/−/100%/Ajustar tela** no canto
- Roda do mouse com Ctrl = zoom
- Indicador de zoom atual (ex: "150%")
- **Modo preview**: botão que esconde guias/grid e mostra como ficará impresso

### 6. Elementos novos
- **Formas**: linha, retângulo, círculo (com cor de preenchimento e borda)
- **QR Code dinâmico** (placeholder `{{QRCODE}}` — gera com CPF ou ID do funcionário)
- **Código de barras** (opcional)
- **Data atual** (placeholder `{{DATA}}`)
- **Múltiplas linhas de texto** com quebra automática

### 7. Templates e ações rápidas
- Botão **"Duplicar template"** na lista
- Botão **"Pré-visualizar com funcionário real"** — escolhe um colaborador e renderiza
- **Exportar template como JSON** (backup) e **importar JSON**

### 8. UX geral
- **Indicador "MEIO"** com cruzeta sutil sempre visível no centro do canvas
- **Tooltip** ao arrastar mostrando "X: 120mm  Y: 45mm"
- **Barra de status** no rodapé: dimensões do crachá, elemento selecionado, posição
- Painel direito reorganizado em accordions: *Posição*, *Tipo/Fonte*, *Cor*, *Camada*

---

## Detalhes técnicos

**Arquivo principal**: `src/components/crachas/BadgeVisualEditor.tsx` (refatoração grande)

**Biblioteca**: continua **Fabric.js v6** (já instalada). Recursos a usar:
- `canvas.on('object:moving')` — para smart guides
- `aCoords` dos objetos — para detectar alinhamento entre eles
- `canvas.viewportTransform` — para zoom
- Linhas de guia: objetos `Line` com `selectable: false, evented: false`

**Smart guides** (implementação):
```ts
canvas.on('object:moving', (e) => {
  const obj = e.target;
  const cx = canvasWidth / 2;
  // Snap ao centro horizontal
  if (Math.abs(obj.left + obj.width/2 - cx) < 5) {
    obj.set({ left: cx - obj.width/2 });
    drawGuide('vertical-center');
  }
  // ... alinhamento com outros objetos
});
```

**Histórico undo/redo**: array de `canvas.toJSON()` snapshots, máx 30 estados.

**Novo componente**: `src/components/crachas/LayersPanel.tsx` para a lista de camadas.

**Sem mudanças no banco** — `configuracao_json` já é flexível, só armazenamos mais tipos de elemento (`shape`, `qrcode`, `barcode`, `date`).

**Renderização no PDF** (`pdfGeneratorCrachasCustom.ts`):
- Adicionar handlers para os novos tipos: `shape` (retângulo/círculo/linha via jsPDF nativo), `qrcode` (lib `qrcode` já presente? verificar)
- QR code: usar `qrcode` npm package → gerar dataURL → render como imagem

---

## Escopo desta entrega

Posso fazer **tudo de uma vez** (grande) ou **em fases**. Sugiro:

**Fase 1 (essencial — esta entrega):**
- ✅ Guias de centro sempre visíveis + cruzeta no meio
- ✅ Smart guides com snap ao arrastar
- ✅ Réguas em mm
- ✅ Grid toggle
- ✅ Painel de posição precisa (X/Y/W/H + botões centralizar)
- ✅ Atalhos de teclado (setas, delete, duplicar, undo/redo)
- ✅ Zoom

**Fase 2 (se quiser depois):**
- Camadas, QR code, formas, modo preview, import/export JSON

**Confirma a Fase 1?** Ou prefere ir direto no pacote completo?