import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, IText, FabricImage, Circle } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Save, Trash2, RotateCcw, Type, User, Building2, Briefcase, MapPin, CreditCard, Image } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface BadgeElement {
  id: string;
  type: 'text' | 'image' | 'placeholder';
  placeholder?: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
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
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Impact',
];

export default function BadgeVisualEditor({ templateId, onSave, onCancel }: BadgeVisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const canvasWidth = orientation === "horizontal" ? 400 : 250;
  const canvasHeight = orientation === "horizontal" ? 250 : 400;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: true,
    });

    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
      updatePropertiesFromObject(e.selected?.[0]);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
      updatePropertiesFromObject(e.selected?.[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [canvasWidth, canvasHeight]);

  // Load existing template
  useEffect(() => {
    if (templateId && fabricCanvas) {
      loadTemplate(templateId);
    }
  }, [templateId, fabricCanvas]);

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
      setOrientation(data.orientacao as "horizontal" | "vertical");
      setBackgroundUrl(data.background_url);

      if (data.configuracao_json && fabricCanvas) {
        const config = data.configuracao_json as unknown as BadgeTemplateConfig;
        
        if (config.backgroundColor) {
          fabricCanvas.backgroundColor = config.backgroundColor;
        }

        // Reconstruct elements
        for (const element of config.elements || []) {
          if (element.type === 'text' || element.type === 'placeholder') {
            const text = new IText(element.placeholder || 'Texto', {
              left: element.left,
              top: element.top,
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || 'Arial',
              fontWeight: element.fontWeight || 'normal',
              fill: element.fill || '#000000',
              textAlign: element.textAlign || 'center',
            });
            (text as any).customId = element.id;
            (text as any).isPlaceholder = element.type === 'placeholder';
            fabricCanvas.add(text);
          }
        }

        fabricCanvas.renderAll();
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
  };

  const updateSelectedObject = useCallback((property: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;

    selectedObject.set(property, value);
    fabricCanvas.renderAll();
  }, [selectedObject, fabricCanvas]);

  useEffect(() => {
    if (selectedObject) {
      updateSelectedObject('fontSize', fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (selectedObject) {
      updateSelectedObject('fontFamily', fontFamily);
    }
  }, [fontFamily]);

  useEffect(() => {
    if (selectedObject) {
      updateSelectedObject('fontWeight', fontWeight);
    }
  }, [fontWeight]);

  useEffect(() => {
    if (selectedObject) {
      updateSelectedObject('fill', textColor);
    }
  }, [textColor]);

  useEffect(() => {
    if (selectedObject) {
      updateSelectedObject('textAlign', textAlign);
    }
  }, [textAlign]);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('cracha-templates')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('cracha-templates')
        .getPublicUrl(fileName);

      setBackgroundUrl(urlData.publicUrl);

      // Set as canvas background
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

    if (placeholder.id === 'foto' || placeholder.id === 'logo') {
      // Add image placeholder as a rectangle
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
      fabricCanvas.add(rect);
    } else {
      // Add text placeholder
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
      fabricCanvas.add(text);
    }

    fabricCanvas.renderAll();
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
    fabricCanvas.renderAll();
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
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
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
        if (obj.type === 'i-text' || obj.type === 'text') {
          elements.push({
            id: obj.customId || `element_${Date.now()}`,
            type: obj.isPlaceholder ? 'placeholder' : 'text',
            placeholder: obj.text,
            left: obj.left,
            top: obj.top,
            fontSize: obj.fontSize,
            fontFamily: obj.fontFamily,
            fontWeight: obj.fontWeight,
            fill: obj.fill,
            textAlign: obj.textAlign,
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

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Elements */}
      <Card className="w-full lg:w-64 flex-shrink-0">
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
          <div className="border-t pt-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={addCustomText}
            >
              <Type className="w-4 h-4 mr-2" />
              Texto Livre
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col items-center gap-4">
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
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/20">
          <canvas ref={canvasRef} className="border border-border rounded shadow-sm" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Upload Fundo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          {selectedObject && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
        </div>

        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
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
              {(selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
                <>
                  <div>
                    <Label className="text-xs">Tamanho da Fonte</Label>
                    <Input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min={8}
                      max={72}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Família da Fonte</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Peso da Fonte</Label>
                    <Select value={fontWeight} onValueChange={setFontWeight}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Negrito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={textAlign} onValueChange={setTextAlign}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Selecione um elemento no canvas para editar suas propriedades
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
