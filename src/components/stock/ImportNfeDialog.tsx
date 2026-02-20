import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check, Link } from "lucide-react";
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
  vinculadoId: string;
  tamanho: string;
  cor: string;
  ca: string;
  marcaModelo: string;
  autoVinculado: boolean;
}

interface ExistingItem {
  id: string;
  nome: string;
  tipo: "epi" | "uniforme";
  detalhes: string;
  quantidade_estoque: number;
}

interface SavedVinculo {
  descricao_nfe: string;
  tipo: string;
  estoque_item_id: string;
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
  const [existingEpis, setExistingEpis] = useState<ExistingItem[]>([]);
  const [existingUniformes, setExistingUniformes] = useState<ExistingItem[]>([]);
  const [savedVinculos, setSavedVinculos] = useState<SavedVinculo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchExistingItems();
    }
  }, [open]);

  const fetchExistingItems = async () => {
    const [episRes, uniformesRes, vinculosRes] = await Promise.all([
      supabase.from("estoque_epis").select("*").order("tipo_epi"),
      supabase.from("estoque_uniformes").select("*").order("tipo_uniforme"),
      supabase.from("nfe_vinculos_estoque").select("*"),
    ]);

    if (episRes.data) {
      setExistingEpis(
        episRes.data.map((e) => ({
          id: e.id,
          nome: e.tipo_epi,
          tipo: "epi" as const,
          detalhes: [e.marca_modelo, e.tamanho, e.ca ? `CA: ${e.ca}` : ""].filter(Boolean).join(" | "),
          quantidade_estoque: e.quantidade_estoque,
        }))
      );
    }

    if (uniformesRes.data) {
      setExistingUniformes(
        uniformesRes.data.map((u) => ({
          id: u.id,
          nome: u.tipo_uniforme,
          tipo: "uniforme" as const,
          detalhes: [u.tamanho, u.cor].filter(Boolean).join(" | "),
          quantidade_estoque: u.quantidade_estoque,
        }))
      );
    }

    if (vinculosRes.data) {
      setSavedVinculos(vinculosRes.data as SavedVinculo[]);
    }
  };

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

  const applyVinculos = (parsed: NfeItem[], vinculos: SavedVinculo[], epis: ExistingItem[], uniformes: ExistingItem[]): NfeItem[] => {
    return parsed.map((item) => {
      const vinculo = vinculos.find(
        (v) => v.descricao_nfe.toLowerCase() === item.descricao.toLowerCase()
      );
      if (!vinculo) return item;

      // Verify the linked item still exists
      const allItems = vinculo.tipo === "epi" ? epis : uniformes;
      const exists = allItems.some((ei) => ei.id === vinculo.estoque_item_id);
      if (!exists) return item;

      return {
        ...item,
        tipo: vinculo.tipo as "epi" | "uniforme",
        vinculadoId: vinculo.estoque_item_id,
        autoVinculado: true,
      };
    });
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
    let parsed: NfeItem[] = [];

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
        vinculadoId: "",
        tamanho: "",
        cor: "",
        ca: "",
        marcaModelo: "",
        autoVinculado: false,
      });
    }

    if (parsed.length === 0) {
      toast.error("Nenhum produto encontrado na NF-e");
      return;
    }

    // Auto-apply saved vinculos
    parsed = applyVinculos(parsed, savedVinculos, existingEpis, existingUniformes);
    const autoCount = parsed.filter((p) => p.autoVinculado).length;

    setItems(parsed);
    setStep("preview");

    const msg = `${parsed.length} produto(s) encontrado(s) na NF-e nº ${nNF}`;
    if (autoCount > 0) {
      toast.success(`${msg} — ${autoCount} vinculado(s) automaticamente`);
    } else {
      toast.success(msg);
    }
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

  const updateItem = (index: number, updates: Partial<NfeItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.index === index ? { ...item, ...updates, autoVinculado: false } : item))
    );
  };

  const handleTipoChange = (index: number, tipo: string) => {
    updateItem(index, { tipo: tipo as NfeItem["tipo"], vinculadoId: "" });
  };

  const handleVinculoChange = (index: number, vinculadoId: string) => {
    updateItem(index, { vinculadoId });
  };

  const getExistingItemsForType = (tipo: "epi" | "uniforme"): ExistingItem[] => {
    return tipo === "epi" ? existingEpis : existingUniformes;
  };

  const saveVinculos = async (importedItems: NfeItem[]) => {
    const vinculosToSave = importedItems.filter(
      (i) => i.tipo !== "ignorar" && i.vinculadoId && i.vinculadoId !== "novo"
    );

    for (const item of vinculosToSave) {
      // Upsert: if descricao already exists, update; otherwise insert
      const existing = savedVinculos.find(
        (v) => v.descricao_nfe.toLowerCase() === item.descricao.toLowerCase()
      );

      if (existing) {
        // Update if different
        if (existing.estoque_item_id !== item.vinculadoId || existing.tipo !== item.tipo) {
          await supabase
            .from("nfe_vinculos_estoque")
            .update({ estoque_item_id: item.vinculadoId, tipo: item.tipo })
            .ilike("descricao_nfe", item.descricao);
        }
      } else {
        await supabase.from("nfe_vinculos_estoque").insert({
          descricao_nfe: item.descricao,
          tipo: item.tipo,
          estoque_item_id: item.vinculadoId,
        });
      }
    }
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

      // Save vinculos for future imports
      await saveVinculos(itemsToImport);

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
    const qty = Math.round(item.quantidade);

    if (item.vinculadoId && item.vinculadoId !== "novo") {
      const { data: record } = await supabase
        .from("estoque_epis")
        .select("*")
        .eq("id", item.vinculadoId)
        .single();

      if (!record) throw new Error("EPI vinculado não encontrado");

      const newQty = record.quantidade_estoque + qty;
      await supabase
        .from("estoque_epis")
        .update({ quantidade_estoque: newQty })
        .eq("id", record.id);

      await supabase.from("historico_estoque_epis").insert({
        estoque_epi_id: record.id,
        quantidade: qty,
        quantidade_anterior: record.quantidade_estoque,
        quantidade_nova: newQty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
      return;
    }

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
  };

  const importUniforme = async (item: NfeItem) => {
    const qty = Math.round(item.quantidade);

    if (item.vinculadoId && item.vinculadoId !== "novo") {
      const { data: record } = await supabase
        .from("estoque_uniformes")
        .select("*")
        .eq("id", item.vinculadoId)
        .single();

      if (!record) throw new Error("Uniforme vinculado não encontrado");

      const newQty = record.quantidade_estoque + qty;
      await supabase
        .from("estoque_uniformes")
        .update({ quantidade_estoque: newQty })
        .eq("id", record.id);

      await supabase.from("historico_estoque_uniformes").insert({
        estoque_uniforme_id: record.id,
        quantidade: qty,
        quantidade_anterior: record.quantidade_estoque,
        quantidade_nova: newQty,
        tipo_movimentacao: "entrada",
        motivo: `Entrada via NF-e nº ${nfeNumero}`,
      });
      return;
    }

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
  };

  const selectedCount = items.filter((i) => i.tipo !== "ignorar").length;
  const autoVinculadoCount = items.filter((i) => i.autoVinculado).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <Badge variant="outline">NF-e nº {nfeNumero}</Badge>
              <Badge variant="outline">{fileName}</Badge>
              <Badge variant="secondary">{items.length} produto(s)</Badge>
              <Badge>{selectedCount} selecionado(s)</Badge>
              {autoVinculadoCount > 0 && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Link className="h-3 w-3 mr-1" />
                  {autoVinculadoCount} vinculado(s) automaticamente
                </Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Descrição NF-e</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="w-24">Valor Un.</TableHead>
                    <TableHead className="w-32">Tipo</TableHead>
                    <TableHead className="min-w-[220px]">Vincular a item existente</TableHead>
                    <TableHead className="w-28">Tamanho</TableHead>
                    <TableHead className="w-28">Cor</TableHead>
                    <TableHead className="w-28">CA</TableHead>
                    <TableHead className="w-32">Marca/Modelo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const existingItems = item.tipo !== "ignorar" ? getExistingItemsForType(item.tipo) : [];
                    const isLinked = item.vinculadoId && item.vinculadoId !== "novo";
                    const isNew = item.tipo !== "ignorar" && (!item.vinculadoId || item.vinculadoId === "novo");

                    return (
                      <TableRow key={item.index} className={item.tipo === "ignorar" ? "opacity-50" : ""}>
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-1">
                            {item.autoVinculado && (
                              <Link className="h-3 w-3 text-primary shrink-0" />
                            )}
                            {item.descricao}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          {item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.tipo}
                            onValueChange={(v) => handleTipoChange(item.index, v)}
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
                            <Select
                              value={item.vinculadoId || "novo"}
                              onValueChange={(v) => handleVinculoChange(item.index, v)}
                            >
                              <SelectTrigger className={`h-8 text-xs ${isLinked ? "border-primary" : ""}`}>
                                <SelectValue placeholder="Criar novo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">
                                  <span className="flex items-center gap-1">
                                    ➕ Criar novo item
                                  </span>
                                </SelectItem>
                                {existingItems.map((ei) => (
                                  <SelectItem key={ei.id} value={ei.id}>
                                    <span className="flex flex-col">
                                      <span className="font-medium">{ei.nome}</span>
                                      {ei.detalhes && (
                                        <span className="text-muted-foreground text-[10px]">{ei.detalhes} • Estoque: {ei.quantidade_estoque}</span>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isNew && (
                            <Input
                              className="h-8 text-xs"
                              placeholder="Tamanho"
                              value={item.tamanho}
                              onChange={(e) => updateItem(item.index, { tamanho: e.target.value })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isNew && (
                            <Input
                              className="h-8 text-xs"
                              placeholder="Cor"
                              value={item.cor}
                              onChange={(e) => updateItem(item.index, { cor: e.target.value })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isNew && item.tipo === "epi" && (
                            <Input
                              className="h-8 text-xs"
                              placeholder="CA"
                              value={item.ca}
                              onChange={(e) => updateItem(item.index, { ca: e.target.value })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isNew && item.tipo === "epi" && (
                            <Input
                              className="h-8 text-xs"
                              placeholder="Marca"
                              value={item.marcaModelo}
                              onChange={(e) => updateItem(item.index, { marcaModelo: e.target.value })}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link className="h-4 w-4" />
              <span>
                Os vínculos são salvos automaticamente. Na próxima importação, itens com a mesma descrição serão vinculados ao mesmo produto.
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
