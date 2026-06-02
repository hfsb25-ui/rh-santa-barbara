import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, IText, FabricImage, Line, Circle } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Save, Trash2, RotateCcw, Type, User, Building2, Briefcase, MapPin,
  CreditCard, Image, Grid3x3, Crosshair, ZoomIn, ZoomOut, Maximize2,
  AlignCenterHorizontal, AlignCenterVertical, AlignStartHorizontal,
  AlignEndHorizontal, AlignStartVertical, AlignEndVertical, Undo2, Redo2,
  Copy, Square, Circle as CircleIcon, Minus, ChevronUp, ChevronDown,
  ChevronsUp, ChevronsDown
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface BadgeElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'shape' | 'customImage';
  imageUrl?: string;
  placeholder?: string;
  shapeType?: 'rect' | 'circle' | 'line';
  left: number;
  top: number;
  width?: number;
  height?: number;
  radius?: number;
  rx?: number;
  x2?: number;
  y2?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: string;
}

interface BadgeTemplateConfig {
  elements: BadgeElement[];
  backgroundColor?: string;
}

interface BadgeVisualEditorProps {
  templateId?: string;
  onSave: (template: any) => void;
  onCancel: () => void;
}

const PLACEHOLDERS = [
  { id: 'nome', label: 'Nome', icon: User, placeholder: '{{NOME}}' },
  { id: 'cargo', label: 'Cargo', icon: Briefcase, placeholder: '{{CARGO}}' },
  { id: 'setor', label: 'Setor', icon: MapPin, placeholder: '{{SETOR}}' },
  { id: 'cpf', label: 'CPF', icon: CreditCard, placeholder: '{{CPF}}' },
  { id: 'empresa', label: 'Empresa', icon: Building2, placeholder: '{{EMPRESA}}' },
  { id: 'foto', label: 'Foto', icon: User, placeholder: '{{FOTO}}' },
  { id: 'logo', label: 'Logo', icon: Image, placeholder: '{{LOGO}}' },
];

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Verdana', 'Courier New', 'Impact',
];

const SNAP_THRESHOLD = 5; // px
const GUIDE_COLOR = '#ec4899'; // pink/magenta
const CENTER_GUIDE_COLOR = 'rgba(99,102,241,0.35)'; // indigo translucent
const GRID_COLOR = 'rgba(148,163,184,0.25)';
const GRID_STEP_MM = 5;
const MM_TO_PX = 3.7795; // 1mm ≈ 3.78px at 96dpi (canvas display)

export default function BadgeVisualEditor({ templateId, onSave, onCancel }: BadgeVisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Selected object properties
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontWeight, setFontWeight] = useState("normal");
  const [textColor, setTextColor] = useState("#000000");
  const [textAlign, setTextAlign] = useState("center");

  // Position properties (in px)
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [sizeW, setSizeW] = useState(0);
  const [sizeH, setSizeH] = useState(0);

  // Shape properties
  const [fillColor, setFillColor] = useState("#6366f1");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(0);

  // Editor settings
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [zoom, setZoom] = useState(1);

  // History (undo/redo)
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef(false);
  const [historyTick, setHistoryTick] = useState(0);

  // Smart guide lines (transient, drawn on object:moving)
  const guideLinesRef = useRef<any[]>([]);
  // Static center cross lines
  const centerGuidesRef = useRef<any[]>([]);
  // Grid lines
  const gridLinesRef = useRef<any[]>([]);

  const canvasWidth = orientation === "horizontal" ? 400 : 250;
  const canvasHeight = orientation === "horizontal" ? 250 : 400;

  // Initialize canvas
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Create the <canvas> imperatively so Fabric can wrap it without
    // confusing React's reconciler (which would otherwise try to removeChild
    // a node Fabric has moved into its own .canvas-container wrapper).
    const canvasEl = document.createElement('canvas');
    canvasContainerRef.current.appendChild(canvasEl);
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvasEl;

    const canvas = new FabricCanvas(canvasEl, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    canvas.upperCanvasEl.style.backgroundColor = 'transparent';
    canvas.lowerCanvasEl.style.backgroundColor = 'transparent';

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] || null;
      setSelectedObject(obj);
      updatePropertiesFromObject(obj);
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] || null;
      setSelectedObject(obj);
      updatePropertiesFromObject(obj);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    canvas.on('object:moving', (e) => {
      handleObjectMoving(canvas, e.target);
    });

    canvas.on('object:modified', () => {
      clearGuideLines(canvas);
      pushHistory(canvas);
    });

    canvas.on('object:added', () => {
      if (!isRestoringRef.current) pushHistory(canvas);
    });

    canvas.on('object:removed', () => {
      if (!isRestoringRef.current) pushHistory(canvas);
    });

    setFabricCanvas(canvas);

    const container = canvasContainerRef.current;
    return () => {
      try {
        canvas.dispose();
      } catch (e) {
        // ignore
      }
      // Clear any residual nodes Fabric left in the container
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  // Draw center cross + grid
  useEffect(() => {
    if (!fabricCanvas) return;
    drawCenterGuides(fabricCanvas);
    drawGrid(fabricCanvas);
    fabricCanvas.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas, showGrid, showGuides, canvasWidth, canvasHeight]);

  // Load existing template
  useEffect(() => {
    if (templateId && fabricCanvas) {
      loadTemplate(templateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, fabricCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const active = fabricCanvas.getActiveObject();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((ctrl && e.key.toLowerCase() === 'y') || (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === 'd' && active) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (active) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (e.key === 'Escape') {
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
        return;
      }
      if (active && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') active.set({ top: (active.top || 0) - step });
        if (e.key === 'ArrowDown') active.set({ top: (active.top || 0) + step });
        if (e.key === 'ArrowLeft') active.set({ left: (active.left || 0) - step });
        if (e.key === 'ArrowRight') active.set({ left: (active.left || 0) + step });
        active.setCoords();
        fabricCanvas.requestRenderAll();
        updatePropertiesFromObject(active);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas]);

  // ============== GRID / GUIDES ==============
  const drawCenterGuides = (canvas: FabricCanvas) => {
    centerGuidesRef.current.forEach(l => canvas.remove(l));
    centerGuidesRef.current = [];
    if (!showGuides) return;

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const v = new Line([cx, 0, cx, canvasHeight], {
      stroke: CENTER_GUIDE_COLOR,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    } as any);
    const h = new Line([0, cy, canvasWidth, cy], {
      stroke: CENTER_GUIDE_COLOR,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    } as any);
    (v as any).isHelper = true;
    (h as any).isHelper = true;
    canvas.add(v);
    canvas.add(h);
    canvas.sendObjectToBack(v);
    canvas.sendObjectToBack(h);
    centerGuidesRef.current = [v, h];
  };

  const drawGrid = (canvas: FabricCanvas) => {
    gridLinesRef.current.forEach(l => canvas.remove(l));
    gridLinesRef.current = [];
    if (!showGrid) return;

    const step = GRID_STEP_MM * MM_TO_PX;
    const lines: any[] = [];
    for (let x = step; x < canvasWidth; x += step) {
      const l = new Line([x, 0, x, canvasHeight], {
        stroke: GRID_COLOR, selectable: false, evented: false, excludeFromExport: true,
      } as any);
      (l as any).isHelper = true;
      canvas.add(l);
      canvas.sendObjectToBack(l);
      lines.push(l);
    }
    for (let y = step; y < canvasHeight; y += step) {
      const l = new Line([0, y, canvasWidth, y], {
        stroke: GRID_COLOR, selectable: false, evented: false, excludeFromExport: true,
      } as any);
      (l as any).isHelper = true;
      canvas.add(l);
      canvas.sendObjectToBack(l);
      lines.push(l);
    }
    gridLinesRef.current = lines;
  };

  const clearGuideLines = (canvas: FabricCanvas) => {
    guideLinesRef.current.forEach(l => canvas.remove(l));
    guideLinesRef.current = [];
    canvas.requestRenderAll();
  };

  const addGuideLine = (canvas: FabricCanvas, coords: [number, number, number, number]) => {
    const l = new Line(coords, {
      stroke: GUIDE_COLOR,
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    } as any);
    (l as any).isHelper = true;
    canvas.add(l);
    canvas.bringObjectToFront(l);
    guideLinesRef.current.push(l);
  };

  const handleObjectMoving = (canvas: FabricCanvas, obj: any) => {
    if (!obj) return;
    clearGuideLines(canvas);

    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);

    // Bounds of moving obj (origin top-left for non-text we created with default; iText uses originX center sometimes)
    let left = obj.left as number;
    let top = obj.top as number;
    if (obj.originX === 'center') left = left - w / 2;
    if (obj.originY === 'center') top = top - h / 2;

    const objCenterX = left + w / 2;
    const objCenterY = top + h / 2;
    const objRight = left + w;
    const objBottom = top + h;

    const canvasCx = canvasWidth / 2;
    const canvasCy = canvasHeight / 2;

    // Snap to canvas horizontal center
    if (Math.abs(objCenterX - canvasCx) < SNAP_THRESHOLD) {
      const newCenter = canvasCx;
      const newLeft = newCenter - w / 2;
      if (obj.originX === 'center') obj.set({ left: newCenter });
      else obj.set({ left: newLeft });
      addGuideLine(canvas, [canvasCx, 0, canvasCx, canvasHeight]);
    }
    // Snap to canvas vertical center
    if (Math.abs(objCenterY - canvasCy) < SNAP_THRESHOLD) {
      const newCenter = canvasCy;
      const newTop = newCenter - h / 2;
      if (obj.originY === 'center') obj.set({ top: newCenter });
      else obj.set({ top: newTop });
      addGuideLine(canvas, [0, canvasCy, canvasWidth, canvasCy]);
    }

    // Snap to other objects
    canvas.getObjects().forEach((other: any) => {
      if (other === obj || other.isHelper) return;
      const ow = (other.width || 0) * (other.scaleX || 1);
      const oh = (other.height || 0) * (other.scaleY || 1);
      let oLeft = other.left as number;
      let oTop = other.top as number;
      if (other.originX === 'center') oLeft = oLeft - ow / 2;
      if (other.originY === 'center') oTop = oTop - oh / 2;
      const oCx = oLeft + ow / 2;
      const oCy = oTop + oh / 2;
      const oRight = oLeft + ow;
      const oBottom = oTop + oh;

      // Vertical alignments
      const xTargets = [
        { val: oLeft, label: 'left' },
        { val: oCx, label: 'cx' },
        { val: oRight, label: 'right' },
      ];
      const xCandidates = [
        { val: left, label: 'left' },
        { val: objCenterX, label: 'cx' },
        { val: objRight, label: 'right' },
      ];
      for (const t of xTargets) {
        for (const c of xCandidates) {
          if (Math.abs(c.val - t.val) < SNAP_THRESHOLD) {
            const delta = t.val - c.val;
            obj.set({ left: (obj.left as number) + delta });
            addGuideLine(canvas, [t.val, 0, t.val, canvasHeight]);
          }
        }
      }

      // Horizontal alignments
      const yTargets = [
        { val: oTop, label: 'top' },
        { val: oCy, label: 'cy' },
        { val: oBottom, label: 'bottom' },
      ];
      const yCandidates = [
        { val: top, label: 'top' },
        { val: objCenterY, label: 'cy' },
        { val: objBottom, label: 'bottom' },
      ];
      for (const t of yTargets) {
        for (const c of yCandidates) {
          if (Math.abs(c.val - t.val) < SNAP_THRESHOLD) {
            const delta = t.val - c.val;
            obj.set({ top: (obj.top as number) + delta });
            addGuideLine(canvas, [0, t.val, canvasWidth, t.val]);
          }
        }
      }
    });

    obj.setCoords();
    updatePropertiesFromObject(obj);
  };

  // ============== HISTORY ==============
  const pushHistory = (canvas: FabricCanvas) => {
    const json = JSON.stringify((canvas.toJSON as any)(['customId', 'isPlaceholder', 'placeholderType', 'isHelper', 'isShape', 'shapeType']));
    // Truncate forward history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryTick(t => t + 1);
  };

  const restoreFromHistory = (canvas: FabricCanvas, index: number) => {
    const json = historyRef.current[index];
    if (!json) return;
    isRestoringRef.current = true;
    canvas.loadFromJSON(json, () => {
      canvas.renderAll();
      isRestoringRef.current = false;
      // Redraw helpers
      drawCenterGuides(canvas);
      drawGrid(canvas);
    });
  };

  const undo = () => {
    if (!fabricCanvas) return;
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreFromHistory(fabricCanvas, historyIndexRef.current);
    setHistoryTick(t => t + 1);
  };

  const redo = () => {
    if (!fabricCanvas) return;
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreFromHistory(fabricCanvas, historyIndexRef.current);
    setHistoryTick(t => t + 1);
  };

  // ============== ZOOM ==============
  const applyZoom = (z: number) => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(0.25, Math.min(3, z));
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.setDimensions({
      width: canvasWidth * newZoom,
      height: canvasHeight * newZoom,
    });
    fabricCanvas.requestRenderAll();
  };

  const zoomIn = () => applyZoom(zoom + 0.1);
  const zoomOut = () => applyZoom(zoom - 0.1);
  const zoomReset = () => applyZoom(1);

  // ============== LOAD ==============
  const loadTemplate = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cracha_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setTemplateName(data.nome);
      setBackgroundUrl(data.background_url);

      const incomingOrientation = data.orientacao as "horizontal" | "vertical";
      // If orientation differs, update it and bail — the canvas will be
      // recreated and the effect will re-call loadTemplate on the new canvas.
      if (incomingOrientation !== orientation) {
        setOrientation(incomingOrientation);
        setLoading(false);
        return;
      }

      if (!fabricCanvas) {
        setLoading(false);
        return;
      }

      // Clear any existing non-helper objects to avoid duplicates on reload
      fabricCanvas.getObjects().forEach((o: any) => {
        if (!o.isHelper) fabricCanvas.remove(o);
      });
      fabricCanvas.backgroundImage = undefined;

      if (data.configuracao_json) {
        const config = data.configuracao_json as unknown as BadgeTemplateConfig;

        if (config.backgroundColor) {
          fabricCanvas.backgroundColor = config.backgroundColor;
        }

        for (const element of config.elements || []) {
          if (element.type === 'text' || element.type === 'placeholder') {
            const w = element.width || 0;
            const h = element.height || 0;
            // Saved coordinates are top-left; restore using center origin
            // (matches how new text is created in addPlaceholder/addCustomText).
            const text = new IText(element.placeholder || 'Texto', {
              left: element.left + w / 2,
              top: element.top + h / 2,
              originX: 'center',
              originY: 'center',
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || 'Arial',
              fontWeight: element.fontWeight || 'normal',
              fill: element.fill || '#000000',
              textAlign: element.textAlign || 'left',
            });
            (text as any).customId = element.id;
            (text as any).isPlaceholder = element.type === 'placeholder';
            fabricCanvas.add(text);
          } else if (element.type === 'shape') {
            let shape: any;
            if (element.shapeType === 'circle') {
              shape = new Circle({
                left: element.left, top: element.top,
                radius: element.radius || 30,
                fill: element.fill || '#6366f1',
                stroke: element.stroke || '',
                strokeWidth: element.strokeWidth || 0,
              });
            } else if (element.shapeType === 'line') {
              shape = new Line(
                [element.left, element.top, element.x2 || element.left + 50, element.y2 || element.top],
                { stroke: element.stroke || '#000000', strokeWidth: element.strokeWidth || 2 }
              );
            } else {
              shape = new Rect({
                left: element.left, top: element.top,
                width: element.width || 80, height: element.height || 50,
                fill: element.fill || '#6366f1',
                stroke: element.stroke || '',
                strokeWidth: element.strokeWidth || 0,
                rx: element.rx || 0, ry: element.rx || 0,
              });
            }
            shape.customId = element.id;
            shape.isShape = true;
            shape.shapeType = element.shapeType;
            fabricCanvas.add(shape);
          } else if (element.type === 'customImage' && element.imageUrl) {
            const img = await FabricImage.fromURL(element.imageUrl, { crossOrigin: 'anonymous' });
            const natW = (img as any).width || 1;
            const natH = (img as any).height || 1;
            const sx = (element.width || natW) / natW;
            const sy = (element.height || natH) / natH;
            img.set({
              left: element.left, top: element.top, scaleX: sx, scaleY: sy,
              stroke: element.stroke || '',
              strokeWidth: element.strokeWidth || 0,
              strokeUniform: true,
            });
            (img as any).customId = element.id;
            (img as any).isCustomImage = true;
            (img as any).imageUrl = element.imageUrl;
            fabricCanvas.add(img);
          } else if (element.type === 'image') {
            const w = element.width || 80;
            const h = element.height || 80;
            const rect = new Rect({
              left: element.left,
              top: element.top,
              width: w,
              height: h,
              fill: '#e5e7eb',
              stroke: element.stroke || '#9ca3af',
              strokeWidth: element.strokeWidth ?? 2,
              rx: element.placeholder === 'foto' ? w / 2 : 5,
              ry: element.placeholder === 'foto' ? h / 2 : 5,
            });
            (rect as any).customId = element.id;
            (rect as any).isPlaceholder = true;
            (rect as any).placeholderType = element.placeholder;
            fabricCanvas.add(rect);
          }
        }

        if (data.background_url) {
          FabricImage.fromURL(data.background_url, { crossOrigin: 'anonymous' }).then((img) => {
            const natW = (img as any).width || 1;
            const natH = (img as any).height || 1;
            // Stretch independently to fill the badge canvas
            img.set({
              scaleX: canvasWidth / natW,
              scaleY: canvasHeight / natH,
              originX: 'left',
              originY: 'top',
            });
            fabricCanvas.backgroundImage = img;
            fabricCanvas.renderAll();
          });
        }

        sendHelpersToBack();
        fabricCanvas.renderAll();
        pushHistory(fabricCanvas);
      }
    } catch (error: any) {
      console.error("Error loading template:", error);
      toast.error("Erro ao carregar template");
    } finally {
      setLoading(false);
    }
  };

  const updatePropertiesFromObject = (obj: any) => {
    if (!obj) return;

    if (obj.type === 'i-text' || obj.type === 'text') {
      setFontSize(obj.fontSize || 16);
      setFontFamily(obj.fontFamily || 'Arial');
      setFontWeight(obj.fontWeight || 'normal');
      setTextColor(obj.fill || '#000000');
      setTextAlign(obj.textAlign || 'center');
    }

    if (obj.isShape) {
      setFillColor(obj.fill || 'transparent');
      setStrokeColor(obj.stroke || '#000000');
      setStrokeWidth(obj.strokeWidth || 0);
      if (obj.shapeType === 'rect') setCornerRadius(obj.rx || 0);
    }

    if (obj.isCustomImage || (obj.isPlaceholder && (obj.placeholderType === 'foto' || obj.placeholderType === 'logo'))) {
      setStrokeColor(obj.stroke || '#000000');
      setStrokeWidth(obj.strokeWidth || 0);
    }

    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);
    let left = obj.left || 0;
    let top = obj.top || 0;
    if (obj.originX === 'center') left = left - w / 2;
    if (obj.originY === 'center') top = top - h / 2;
    setPosX(Math.round(left));
    setPosY(Math.round(top));
    setSizeW(Math.round(w));
    setSizeH(Math.round(h));
  };

  const updateSelectedObject = useCallback((property: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;
    selectedObject.set(property, value);
    selectedObject.setCoords();
    fabricCanvas.renderAll();
  }, [selectedObject, fabricCanvas]);

  useEffect(() => { if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedObject('fontSize', fontSize); }, [fontSize]);
  useEffect(() => { if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedObject('fontFamily', fontFamily); }, [fontFamily]);
  useEffect(() => { if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedObject('fontWeight', fontWeight); }, [fontWeight]);
  useEffect(() => { if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedObject('fill', textColor); }, [textColor]);
  useEffect(() => { if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) updateSelectedObject('textAlign', textAlign); }, [textAlign]);

  useEffect(() => { if (selectedObject?.isShape) updateSelectedObject('fill', fillColor); }, [fillColor]);
  useEffect(() => {
    if (selectedObject?.isShape || selectedObject?.isCustomImage || (selectedObject?.isPlaceholder && (selectedObject?.placeholderType === 'foto' || selectedObject?.placeholderType === 'logo'))) {
      updateSelectedObject('stroke', strokeColor);
    }
  }, [strokeColor]);
  useEffect(() => {
    if (selectedObject?.isShape || selectedObject?.isCustomImage || (selectedObject?.isPlaceholder && (selectedObject?.placeholderType === 'foto' || selectedObject?.placeholderType === 'logo'))) {
      updateSelectedObject('strokeWidth', strokeWidth);
    }
  }, [strokeWidth]);
  useEffect(() => {
    if (selectedObject?.isShape && selectedObject.shapeType === 'rect') {
      selectedObject.set({ rx: cornerRadius, ry: cornerRadius });
      fabricCanvas?.renderAll();
    }
  }, [cornerRadius]);

  // Apply numeric position
  const applyPosition = (axis: 'x' | 'y' | 'w' | 'h', value: number) => {
    if (!selectedObject || !fabricCanvas) return;
    const obj = selectedObject;
    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);

    if (axis === 'x') {
      const newLeft = obj.originX === 'center' ? value + w / 2 : value;
      obj.set({ left: newLeft });
    }
    if (axis === 'y') {
      const newTop = obj.originY === 'center' ? value + h / 2 : value;
      obj.set({ top: newTop });
    }
    if (axis === 'w' && obj.width) {
      obj.set({ scaleX: value / obj.width });
    }
    if (axis === 'h' && obj.height) {
      obj.set({ scaleY: value / obj.height });
    }
    obj.setCoords();
    fabricCanvas.requestRenderAll();
    pushHistory(fabricCanvas);
    updatePropertiesFromObject(obj);
  };

  // Alignment buttons
  const alignSelected = (direction: 'left' | 'cx' | 'right' | 'top' | 'cy' | 'bottom') => {
    if (!selectedObject || !fabricCanvas) return;
    const obj = selectedObject;
    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);
    const centerOriginX = obj.originX === 'center';
    const centerOriginY = obj.originY === 'center';

    switch (direction) {
      case 'left':
        obj.set({ left: centerOriginX ? w / 2 : 0 }); break;
      case 'cx':
        obj.set({ left: centerOriginX ? canvasWidth / 2 : (canvasWidth - w) / 2 }); break;
      case 'right':
        obj.set({ left: centerOriginX ? canvasWidth - w / 2 : canvasWidth - w }); break;
      case 'top':
        obj.set({ top: centerOriginY ? h / 2 : 0 }); break;
      case 'cy':
        obj.set({ top: centerOriginY ? canvasHeight / 2 : (canvasHeight - h) / 2 }); break;
      case 'bottom':
        obj.set({ top: centerOriginY ? canvasHeight - h / 2 : canvasHeight - h }); break;
    }
    obj.setCoords();
    fabricCanvas.requestRenderAll();
    pushHistory(fabricCanvas);
    updatePropertiesFromObject(obj);
  };

  const duplicateSelected = async () => {
    if (!selectedObject || !fabricCanvas) return;
    const cloned = await selectedObject.clone();
    cloned.set({
      left: (selectedObject.left || 0) + 15,
      top: (selectedObject.top || 0) + 15,
    });
    (cloned as any).customId = `custom_${Date.now()}`;
    fabricCanvas.add(cloned);
    fabricCanvas.setActiveObject(cloned);
    fabricCanvas.requestRenderAll();
    toast.success("Elemento duplicado!");
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    try {
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${sanitizedName}`;
      const { error } = await supabase.storage
        .from('cracha-templates')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('cracha-templates')
        .getPublicUrl(fileName);

      setBackgroundUrl(urlData.publicUrl);

      FabricImage.fromURL(urlData.publicUrl).then((img) => {
        img.scaleToWidth(canvasWidth);
        img.scaleToHeight(canvasHeight);
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      });

      toast.success("Imagem de fundo carregada!");
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error("Erro ao carregar imagem");
    }
  };

  const addPlaceholder = (placeholder: typeof PLACEHOLDERS[0]) => {
    if (!fabricCanvas) return;
    let createdObject: any;

    if (placeholder.id === 'foto' || placeholder.id === 'logo') {
      const rect = new Rect({
        left: canvasWidth / 2 - 40,
        top: canvasHeight / 2 - 40,
        width: 80,
        height: 80,
        fill: '#e5e7eb',
        stroke: '#9ca3af',
        strokeWidth: 2,
        rx: placeholder.id === 'foto' ? 40 : 5,
        ry: placeholder.id === 'foto' ? 40 : 5,
      });
      (rect as any).customId = placeholder.id;
      (rect as any).isPlaceholder = true;
      (rect as any).placeholderType = placeholder.id;
      createdObject = rect;
    } else {
      const text = new IText(placeholder.placeholder, {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      (text as any).customId = placeholder.id;
      (text as any).isPlaceholder = true;
      createdObject = text;
    }

    fabricCanvas.add(createdObject);
    fabricCanvas.bringObjectToFront(createdObject);
    fabricCanvas.setActiveObject(createdObject);
    sendHelpersToBack();
    updatePropertiesFromObject(createdObject);
    fabricCanvas.requestRenderAll();
    toast.success(`${placeholder.label} adicionado!`);
  };

  const addCustomText = () => {
    if (!fabricCanvas) return;
    const text = new IText('Texto personalizado', {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
    });
    (text as any).customId = `custom_${Date.now()}`;
    (text as any).isPlaceholder = false;
    fabricCanvas.add(text);
    fabricCanvas.bringObjectToFront(text);
    fabricCanvas.setActiveObject(text);
    sendHelpersToBack();
    updatePropertiesFromObject(text);
    fabricCanvas.requestRenderAll();
  };

  const addShape = (shapeType: 'rect' | 'circle' | 'line') => {
    if (!fabricCanvas) return;
    let obj: any;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    if (shapeType === 'rect') {
      obj = new Rect({
        left: cx - 40, top: cy - 25, width: 80, height: 50,
        fill: '#6366f1', stroke: '', strokeWidth: 0, rx: 0, ry: 0,
      });
    } else if (shapeType === 'circle') {
      obj = new Circle({
        left: cx - 30, top: cy - 30, radius: 30,
        fill: '#6366f1', stroke: '', strokeWidth: 0,
      });
    } else {
      obj = new Line([cx - 50, cy, cx + 50, cy], {
        stroke: '#000000', strokeWidth: 2,
      });
    }
    obj.customId = `shape_${Date.now()}`;
    obj.isShape = true;
    obj.shapeType = shapeType;
    fabricCanvas.add(obj);
    fabricCanvas.bringObjectToFront(obj);
    fabricCanvas.setActiveObject(obj);
    sendHelpersToBack();
    updatePropertiesFromObject(obj);
    fabricCanvas.requestRenderAll();
    toast.success("Forma adicionada!");
  };

  // Keep helpers (grid/center guides) always at the very back
  const sendHelpersToBack = () => {
    if (!fabricCanvas) return;
    [...gridLinesRef.current, ...centerGuidesRef.current].forEach(l => {
      try { fabricCanvas.sendObjectToBack(l); } catch {}
    });
    fabricCanvas.requestRenderAll();
  };

  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;
    try {
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `img_${Date.now()}_${sanitizedName}`;
      const { error } = await supabase.storage
        .from('cracha-templates')
        .upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('cracha-templates')
        .getPublicUrl(fileName);

      const img = await FabricImage.fromURL(urlData.publicUrl, { crossOrigin: 'anonymous' });
      const maxSide = Math.min(canvasWidth, canvasHeight) * 0.5;
      const scale = Math.min(maxSide / (img.width || maxSide), maxSide / (img.height || maxSide));
      img.scale(scale);
      img.set({
        left: canvasWidth / 2 - ((img.width || 0) * scale) / 2,
        top: canvasHeight / 2 - ((img.height || 0) * scale) / 2,
      });
      (img as any).customId = `img_${Date.now()}`;
      (img as any).isCustomImage = true;
      (img as any).imageUrl = urlData.publicUrl;
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      sendHelpersToBack();
      toast.success("Imagem adicionada!");
      // Clear input so the same file can be re-uploaded
      e.target.value = '';
    } catch (err: any) {
      console.error('Error uploading image:', err);
      toast.error(err.message || 'Erro ao fazer upload da imagem');
    }
  };

  const changeLayer = (action: 'front' | 'back' | 'forward' | 'backward') => {
    if (!fabricCanvas || !selectedObject) return;
    if (action === 'front') fabricCanvas.bringObjectToFront(selectedObject);
    if (action === 'back') {
      fabricCanvas.sendObjectToBack(selectedObject);
      // Keep helper guides truly at back
      [...centerGuidesRef.current, ...gridLinesRef.current].forEach(l => fabricCanvas.sendObjectToBack(l));
    }
    if (action === 'forward') fabricCanvas.bringObjectForward(selectedObject);
    if (action === 'backward') fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.requestRenderAll();
    pushHistory(fabricCanvas);
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Elemento removido!");
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach((o: any) => {
      if (!o.isHelper) fabricCanvas.remove(o);
    });
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.backgroundImage = undefined;
    fabricCanvas.renderAll();
    setBackgroundUrl(null);
    toast.success("Canvas limpo!");
  };

  const handleSave = async () => {
    if (!fabricCanvas || !templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    setSaving(true);
    try {
      const elements: BadgeElement[] = [];

      fabricCanvas.getObjects().forEach((obj: any) => {
        if (obj.isHelper) return;

        if (obj.type === 'i-text' || obj.type === 'text') {
          const actualWidth = obj.width * (obj.scaleX || 1);
          let actualLeft = obj.left;
          if (obj.originX === 'center') actualLeft = obj.left - actualWidth / 2;
          else if (obj.originX === 'right') actualLeft = obj.left - actualWidth;
          let actualTop = obj.top;
          if (obj.originY === 'center') actualTop = obj.top - (obj.height * (obj.scaleY || 1)) / 2;
          else if (obj.originY === 'bottom') actualTop = obj.top - (obj.height * (obj.scaleY || 1));

          elements.push({
            id: obj.customId || `element_${Date.now()}`,
            type: obj.isPlaceholder ? 'placeholder' : 'text',
            placeholder: obj.text,
            left: actualLeft,
            top: actualTop,
            width: actualWidth,
            height: obj.height * (obj.scaleY || 1),
            fontSize: obj.fontSize,
            fontFamily: obj.fontFamily,
            fontWeight: obj.fontWeight,
            fill: obj.fill,
            textAlign: obj.textAlign || 'left',
          });
        } else if (obj.isShape) {
          if (obj.shapeType === 'circle') {
            elements.push({
              id: obj.customId || `element_${Date.now()}`,
              type: 'shape',
              shapeType: 'circle',
              left: obj.left,
              top: obj.top,
              radius: (obj.radius || 0) * (obj.scaleX || 1),
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
            });
          } else if (obj.shapeType === 'line') {
            elements.push({
              id: obj.customId || `element_${Date.now()}`,
              type: 'shape',
              shapeType: 'line',
              left: obj.x1,
              top: obj.y1,
              x2: obj.x2,
              y2: obj.y2,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
            });
          } else {
            elements.push({
              id: obj.customId || `element_${Date.now()}`,
              type: 'shape',
              shapeType: 'rect',
              left: obj.left,
              top: obj.top,
              width: obj.width * (obj.scaleX || 1),
              height: obj.height * (obj.scaleY || 1),
              rx: obj.rx || 0,
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
            });
          }
        } else if (obj.isCustomImage) {
          elements.push({
            id: obj.customId || `element_${Date.now()}`,
            type: 'customImage',
            imageUrl: obj.imageUrl,
            left: obj.left,
            top: obj.top,
            width: (obj.width || 0) * (obj.scaleX || 1),
            height: (obj.height || 0) * (obj.scaleY || 1),
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
          });
        } else if (obj.type === 'rect') {
          elements.push({
            id: obj.customId || `element_${Date.now()}`,
            type: 'image',
            placeholder: obj.placeholderType,
            left: obj.left,
            top: obj.top,
            width: obj.width * obj.scaleX,
            height: obj.height * obj.scaleY,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
          });
        }
      });

      const config: BadgeTemplateConfig = {
        elements,
        backgroundColor: fabricCanvas.backgroundColor as string,
      };

      const templateData = {
        nome: templateName,
        background_url: backgroundUrl,
        configuracao_json: JSON.parse(JSON.stringify(config)) as Json,
        orientacao: orientation,
        largura: orientation === 'horizontal' ? 85 : 54,
        altura: orientation === 'horizontal' ? 54 : 85,
      };

      if (templateId) {
        const { error } = await supabase
          .from('cracha_templates')
          .update(templateData)
          .eq('id', templateId);
        if (error) throw error;
        toast.success("Template atualizado!");
      } else {
        const { error } = await supabase
          .from('cracha_templates')
          .insert([templateData]);
        if (error) throw error;
        toast.success("Template salvo!");
      }

      onSave(templateData);
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // mm dimensions
  const widthMm = orientation === 'horizontal' ? 85 : 54;
  const heightMm = orientation === 'horizontal' ? 54 : 85;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Elements */}
      <Card className="w-full lg:w-60 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Elementos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Clique para adicionar:</p>
          {PLACEHOLDERS.map((placeholder) => (
            <Button
              key={placeholder.id}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addPlaceholder(placeholder)}
            >
              <placeholder.icon className="w-4 h-4 mr-2" />
              {placeholder.label}
            </Button>
          ))}
          <Separator className="my-2" />
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={addCustomText}>
            <Type className="w-4 h-4 mr-2" />
            Texto Livre
          </Button>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground mb-1">Formas:</p>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addShape('rect')}>
            <Square className="w-4 h-4 mr-2" />
            Retângulo
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addShape('circle')}>
            <CircleIcon className="w-4 h-4 mr-2" />
            Círculo
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addShape('line')}>
            <Minus className="w-4 h-4 mr-2" />
            Linha
          </Button>
          <Separator className="my-2" />
          <Button variant="outline" size="sm" className="w-full justify-start" asChild>
            <label className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
              Upload Imagem
              <input type="file" accept="image/*" className="hidden" onChange={handleAddImageUpload} />
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1">
            <Label>Nome do Template</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Meu template personalizado"
            />
          </div>
          <div>
            <Label>Orientação</Label>
            <Select value={orientation} onValueChange={(v: "horizontal" | "vertical") => setOrientation(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 w-full flex-wrap bg-muted/30 rounded-md p-1.5 border">
          <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndexRef.current <= 0} title="Desfazer (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1} title="Refazer (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Toggle size="sm" pressed={showGuides} onPressedChange={setShowGuides} title="Linhas de centro">
            <Crosshair className="w-4 h-4" />
          </Toggle>
          <Toggle size="sm" pressed={showGrid} onPressedChange={setShowGrid} title="Grade (5mm)">
            <Grid3x3 className="w-4 h-4" />
          </Toggle>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button size="sm" variant="ghost" onClick={zoomOut} title="Diminuir zoom">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={zoomReset} className="font-mono text-xs px-2" title="100%">
            {Math.round(zoom * 100)}%
          </Button>
          <Button size="sm" variant="ghost" onClick={zoomIn} title="Aumentar zoom">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          {selectedObject && (
            <>
              <Button size="sm" variant="ghost" onClick={duplicateSelected} title="Duplicar (Ctrl+D)">
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={deleteSelected} title="Remover (Delete)">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          )}
          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {widthMm} × {heightMm} mm
          </div>
        </div>

        {/* Canvas wrapper with rulers */}
        <div className="relative bg-muted/20 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 pl-8 pt-8">
          {/* Top ruler */}
          <div className="absolute top-1 left-8 right-6 h-5 flex items-end overflow-hidden pointer-events-none">
            <div
              className="relative flex"
              style={{ width: canvasWidth * zoom }}
            >
              {Array.from({ length: Math.floor(widthMm / 5) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute border-l border-muted-foreground/40 text-[8px] text-muted-foreground/70 leading-none"
                  style={{ left: i * 5 * MM_TO_PX * zoom, height: i % 2 === 0 ? 8 : 4, top: i % 2 === 0 ? 0 : 4 }}
                >
                  {i % 2 === 0 && <span className="absolute -top-0.5 left-0.5">{i * 5}</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Left ruler */}
          <div className="absolute left-1 top-8 bottom-6 w-5 flex justify-end overflow-hidden pointer-events-none">
            <div className="relative" style={{ height: canvasHeight * zoom }}>
              {Array.from({ length: Math.floor(heightMm / 5) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute border-t border-muted-foreground/40 text-[8px] text-muted-foreground/70 leading-none"
                  style={{ top: i * 5 * MM_TO_PX * zoom, width: i % 2 === 0 ? 8 : 4, right: i % 2 === 0 ? 0 : 0 }}
                >
                  {i % 2 === 0 && <span className="absolute top-0 right-2.5">{i * 5}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border rounded shadow-sm bg-background overflow-hidden">
            <div ref={canvasContainerRef} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Upload Fundo
              <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>

        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>

        {/* Status bar */}
        <div className="w-full text-xs text-muted-foreground font-mono flex items-center justify-between border-t pt-2">
          <span>
            {selectedObject ? `Selecionado: ${selectedObject.type}` : 'Nenhum elemento selecionado'}
          </span>
          <span>
            {selectedObject && `X: ${posX}px  Y: ${posY}px  W: ${sizeW}px  H: ${sizeH}px`}
          </span>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <Card className="w-full lg:w-64 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Propriedades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedObject ? (
            <>
              {/* Position */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Posição</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">X (px)</Label>
                    <Input
                      type="number"
                      value={posX}
                      onChange={(e) => setPosX(Number(e.target.value))}
                      onBlur={(e) => applyPosition('x', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Y (px)</Label>
                    <Input
                      type="number"
                      value={posY}
                      onChange={(e) => setPosY(Number(e.target.value))}
                      onBlur={(e) => applyPosition('y', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Largura</Label>
                    <Input
                      type="number"
                      value={sizeW}
                      onChange={(e) => setSizeW(Number(e.target.value))}
                      onBlur={(e) => applyPosition('w', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Altura</Label>
                    <Input
                      type="number"
                      value={sizeH}
                      onChange={(e) => setSizeH(Number(e.target.value))}
                      onBlur={(e) => applyPosition('h', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alinhar no crachá</Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button size="sm" variant="outline" onClick={() => alignSelected('left')} title="Esquerda" className="h-8 p-0">
                    <AlignStartVertical className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alignSelected('cx')} title="Centro horizontal" className="h-8 p-0">
                    <AlignCenterVertical className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alignSelected('right')} title="Direita" className="h-8 p-0">
                    <AlignEndVertical className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alignSelected('top')} title="Topo" className="h-8 p-0">
                    <AlignStartHorizontal className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alignSelected('cy')} title="Centro vertical" className="h-8 p-0">
                    <AlignCenterHorizontal className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alignSelected('bottom')} title="Base" className="h-8 p-0">
                    <AlignEndHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Layer controls */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Camadas</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button size="sm" variant="outline" onClick={() => changeLayer('back')} title="Enviar para o fundo" className="h-8 p-0">
                    <ChevronsDown className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeLayer('backward')} title="Enviar para trás" className="h-8 p-0">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeLayer('forward')} title="Trazer para frente" className="h-8 p-0">
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeLayer('front')} title="Trazer para o topo" className="h-8 p-0">
                    <ChevronsUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Shape properties */}
              {selectedObject.isShape && (
                <>
                  <Separator />
                  {selectedObject.shapeType !== 'line' && (
                    <div>
                      <Label className="text-xs">Cor de preenchimento</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-12 h-8 p-1" />
                        <Input value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="flex-1 h-8" />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Cor da borda</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-12 h-8 p-1" />
                      <Input value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="flex-1 h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Espessura da borda</Label>
                    <Input type="number" min={0} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="h-8" />
                  </div>
                  {selectedObject.shapeType === 'rect' && (
                    <div>
                      <Label className="text-xs">Cantos arredondados</Label>
                      <Input type="number" min={0} max={100} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} className="h-8" />
                    </div>
                  )}
                </>
              )}

              {/* Image border properties (custom image + foto/logo placeholders) */}
              {(selectedObject.isCustomImage || (selectedObject.isPlaceholder && (selectedObject.placeholderType === 'foto' || selectedObject.placeholderType === 'logo'))) && (
                <>
                  <Separator />
                  <Label className="text-xs font-semibold">Borda da imagem</Label>
                  <div>
                    <Label className="text-xs">Cor da borda</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-12 h-8 p-1" />
                      <Input value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="flex-1 h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Espessura da borda</Label>
                    <Input type="number" min={0} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="h-8" />
                  </div>
                </>
              )}

              {(selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
                <>

                  <Separator />
                  <div>
                    <Label className="text-xs">Tamanho da Fonte</Label>
                    <Input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min={8}
                      max={72}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Família da Fonte</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Peso</Label>
                    <Select value={fontWeight} onValueChange={setFontWeight}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Negrito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cor</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-12 h-8 p-1" />
                      <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Alinhamento do texto</Label>
                    <Select value={textAlign} onValueChange={setTextAlign}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Separator />
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold">Atalhos:</p>
                <p>↑↓←→ mover (Shift = 10px)</p>
                <p>Ctrl+D duplicar · Del remover</p>
                <p>Ctrl+Z desfazer · Ctrl+Y refazer</p>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8 space-y-3">
              <p>Selecione um elemento no canvas para editar suas propriedades</p>
              <div className="text-[10px] text-left space-y-1 border-t pt-3">
                <p className="font-semibold">Dicas:</p>
                <p>• Arraste elementos perto do centro — eles "grudam"</p>
                <p>• Linhas rosa indicam alinhamento</p>
                <p>• Use a grade (5mm) para precisão</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
