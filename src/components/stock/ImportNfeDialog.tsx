import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NfeItem {
  index: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  ncm: string;
  unidade: string;
  tipo: "epi" | "uniforme" | "ignorar";
  tamanho: string;
  cor: string;
  ca: string;
  marcaModelo: string;
}

interface ImportNfeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const ImportNfeDialog = ({ open, onOpenChange, onImported }: ImportNfeDialogProps) => {
  const [items, setItems] = useState<NfeItem[]>([]);
  const [nfeNumero, setNfeNumero] = useState("");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setItems([]);
    setNfeNumero("");
    setFileName("");
    setStep("upload");
    setImporting(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const parseXml = (xmlText: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      toast.error("Arquivo XML inválido");
      return;
    }

    const nfeProc = doc.getElementsByTagNameNS("*", "nfeProc")[0];
    const nfe = doc.getElementsByTagNameNS("*", "NFe")[0];
    if (!nfeProc && !nfe) {
      toast.error("O arquivo não é uma NF-e válida");
      return;
    }

    const ideTag = doc.getElementsByTagNameNS("*", "ide")[0];
    const nNF = ideTag?.getElementsByTagNameNS("*", "nNF")[0]?.textContent || "";
    setNfeNumero(nNF);

    const detTags = doc.getElementsByTagNameNS("*", "det");
    const parsed: NfeItem[] = [];

    for (let i = 0; i < detTags.length; i++) {
      const det = detTags[i];
      const prod = det.getElementsByTagNameNS("*", "prod")[0];
      if (!prod) continue;

      const getText = (tag: string) => prod.getElementsByTagNameNS("*", tag)[0]?.textContent || "";

      parsed.push({
        index: i,
        descricao: getText("xProd"),
        quantidade: parseFloat(getText("qCom")) || 0,
        valorUnitario: parseFloat(getText("vUnCom")) || 0,
        ncm: getText("NCM"),
        unidade: getText("uCom"),
        tipo: "ignorar",
        tamanho: "",
        cor: "",
        ca: "",
        marcaModelo: "",
      });
    }

    if (parsed.length === 0) {
      toast.error("Nenhum produto encontrado na NF-e");
      return;
    }

    setItems(parsed);
    setStep("preview");
    toast.success(`${parsed.length} produto(s) encontrado(s) na NF-e nº ${nNF}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Selecione um arquivo XML");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseXml(text);
    };
    reader.readAsText(file);
  };

  const updateItem = (index: number, field: keyof NfeItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.index === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImport = async () => {
    const itemsToImport = items.filter((i) => i.tipo !== "ignorar");
    if (itemsToImport.length === 0) {
      toast.error("Nenhum item selecionado para importação");
      return;
    }

    setImporting(true);

    try {
      for (const item of itemsToImport) {
        if (item.tipo === "epi") {
          await importEpi(item);
        } else {
          await importUniforme(item);
        }
      }

      toast.success(`${itemsToImport.length} item(ns) importado(s) com sucesso via NF-e nº ${nfeNumero}`);
      handleClose(false);
      onImported();
    } catch (err: any) {
      toast.error("Erro ao importar: " + (err.message || "erro desconhecido"));
    } finally {
      setImporting(false);
    }
  };

  const importEpi = async (item: NfeItem) => {
    // Try to find existing
    const { data: existing } = await supabase
      .from("estoque_epis")
      .select("*")
      .ilike("tipo_epi", item.descricao)
      .limit(1);

    if (existing && existing.length > 0) {
      const record = existing[0];
      const newQty = record.quantidade_estoque + Math.round(item.quantidade);

      await supabase
        .from("estoque_epis")
        .update({ quantidade_estoque: newQty })
        .eq("id", record.id);

      await supabase.from("historico_estoque_epis").insert({
        estoque_epi_id: record.id,
        quantidade: Math.round(item.quantidade),
        quantidade_anterior: record.quantidade_estoque,
        quantidade_nova: newQty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
    } else {
      const qty = Math.round(item.quantidade);
      const { data: inserted, error } = await supabase
        .from("estoque_epis")
        .insert({
          tipo_epi: item.descricao,
          quantidade_estoque: qty,
          quantidade_minima: 10,
          tamanho: item.tamanho || null,
          ca: item.ca || null,
          marca_modelo: item.marcaModelo || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("historico_estoque_epis").insert({
        estoque_epi_id: inserted.id,
        quantidade: qty,
        quantidade_anterior: 0,
        quantidade_nova: qty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
    }
  };

  const importUniforme = async (item: NfeItem) => {
    const { data: existing } = await supabase
      .from("estoque_uniformes")
      .select("*")
      .ilike("tipo_uniforme", item.descricao)
      .limit(1);

    if (existing && existing.length > 0) {
      const record = existing[0];
      const newQty = record.quantidade_estoque + Math.round(item.quantidade);

      await supabase
        .from("estoque_uniformes")
        .update({ quantidade_estoque: newQty })
        .eq("id", record.id);

      await supabase.from("historico_estoque_uniformes").insert({
        estoque_uniforme_id: record.id,
        quantidade: Math.round(item.quantidade),
        quantidade_anterior: record.quantidade_estoque,
        quantidade_nova: newQty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
    } else {
      const qty = Math.round(item.quantidade);
      const { data: inserted, error } = await supabase
        .from("estoque_uniformes")
        .insert({
          tipo_uniforme: item.descricao,
          quantidade_estoque: qty,
          quantidade_minima: 10,
          tamanho: item.tamanho || "Único",
          cor: item.cor || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("historico_estoque_uniformes").insert({
        estoque_uniforme_id: inserted.id,
        quantidade: qty,
        quantidade_anterior: 0,
        quantidade_nova: qty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
    }
  };

  const selectedCount = items.filter((i) => i.tipo !== "ignorar").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar NF-e para Estoque
          </DialogTitle>
          <DialogDescription>
            Faça upload do XML da Nota Fiscal para dar entrada automática no estoque.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Clique para selecionar o arquivo XML</p>
              <p className="text-sm text-muted-foreground mt-1">
                Arquivo XML da Nota Fiscal Eletrônica (NF-e)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">NF-e nº {nfeNumero}</Badge>
              <Badge variant="outline">{fileName}</Badge>
              <Badge variant="secondary">{items.length} produto(s)</Badge>
              <Badge>{selectedCount} selecionado(s)</Badge>
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="w-24">Valor Un.</TableHead>
                    <TableHead className="w-32">Tipo</TableHead>
                    <TableHead className="w-28">Tamanho</TableHead>
                    <TableHead className="w-28">Cor</TableHead>
                    <TableHead className="w-28">CA</TableHead>
                    <TableHead className="w-32">Marca/Modelo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.index} className={item.tipo === "ignorar" ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-xs">{item.descricao}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>
                        {item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.tipo}
                          onValueChange={(v) => updateItem(item.index, "tipo", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignorar">Ignorar</SelectItem>
                            <SelectItem value="epi">EPI</SelectItem>
                            <SelectItem value="uniforme">Uniforme</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {item.tipo !== "ignorar" && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Tamanho"
                            value={item.tamanho}
                            onChange={(e) => updateItem(item.index, "tamanho", e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.tipo !== "ignorar" && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Cor"
                            value={item.cor}
                            onChange={(e) => updateItem(item.index, "cor", e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.tipo === "epi" && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="CA"
                            value={item.ca}
                            onChange={(e) => updateItem(item.index, "ca", e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.tipo === "epi" && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Marca"
                            value={item.marcaModelo}
                            onChange={(e) => updateItem(item.index, "marcaModelo", e.target.value)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>
                Itens com descrição igual a um já existente no estoque terão a quantidade somada automaticamente.
              </span>
            </div>
          </div>
        )}

        {step === "preview" && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetState(); }}>
              Voltar
            </Button>
            <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
              {importing ? "Importando..." : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Importar {selectedCount} item(ns)
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportNfeDialog;
