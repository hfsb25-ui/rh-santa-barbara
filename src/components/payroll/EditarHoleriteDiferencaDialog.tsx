import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

interface Variavel {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: "provento" | "desconto";
}

interface Item {
  id?: string; // existente
  variavel_id: string;
  valor: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folhaId: string;
  empresaId: string;
  observacoesIniciais?: string | null;
  onSaved?: () => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function EditarHoleriteDiferencaDialog({
  open,
  onOpenChange,
  folhaId,
  empresaId,
  observacoesIniciais,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open || !folhaId) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: vars }, { data: existing }] = await Promise.all([
          supabase
            .from("variaveis_folha")
            .select("id, nome, codigo, tipo")
            .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
            .eq("ativo", true)
            .order("tipo")
            .order("nome"),
          supabase
            .from("folha_pagamento_itens")
            .select("id, variavel_id, valor")
            .eq("folha_pagamento_id", folhaId),
        ]);
        setVariaveis((vars as Variavel[]) || []);
        setItens(
          (existing || []).map((i: any) => ({
            id: i.id,
            variavel_id: i.variavel_id,
            valor: Number(i.valor || 0),
          }))
        );
        setObservacoes(observacoesIniciais || "");
      } catch (e: any) {
        toast.error(e.message || "Erro ao carregar holerite");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, folhaId, empresaId, observacoesIniciais]);

  const varMap = useMemo(() => {
    const m = new Map<string, Variavel>();
    variaveis.forEach((v) => m.set(v.id, v));
    return m;
  }, [variaveis]);

  const proventos = itens.filter((i) => varMap.get(i.variavel_id)?.tipo === "provento");
  const descontos = itens.filter((i) => varMap.get(i.variavel_id)?.tipo === "desconto");
  const totalProv = proventos.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const totalDesc = descontos.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const liquido = totalProv - totalDesc;

  const atualizar = (idx: number, valor: number) => {
    setItens((p) => p.map((it, i) => (i === idx ? { ...it, valor } : it)));
  };
  const remover = (idx: number) => setItens((p) => p.filter((_, i) => i !== idx));
  const adicionar = (tipo: "provento" | "desconto") => {
    const disponiveis = variaveis.filter((v) => v.tipo === tipo);
    if (disponiveis.length === 0) {
      toast.error(`Nenhuma variável de ${tipo} cadastrada`);
      return;
    }
    setItens((p) => [...p, { variavel_id: disponiveis[0].id, valor: 0 }]);
  };
  const trocarVariavel = (idx: number, variavel_id: string) => {
    setItens((p) => p.map((it, i) => (i === idx ? { ...it, variavel_id } : it)));
  };

  const salvar = async () => {
    setSaving(true);
    try {
      // Validar
      for (const it of itens) {
        if (!it.variavel_id) throw new Error("Selecione a variável de todos os itens");
      }
      // Estratégia: deletar todos os itens e reinserir
      const { error: delErr } = await supabase
        .from("folha_pagamento_itens")
        .delete()
        .eq("folha_pagamento_id", folhaId);
      if (delErr) throw delErr;

      if (itens.length > 0) {
        const payload = itens.map((it) => ({
          folha_pagamento_id: folhaId,
          variavel_id: it.variavel_id,
          valor: Number(it.valor) || 0,
        }));
        const { error: insErr } = await supabase.from("folha_pagamento_itens").insert(payload);
        if (insErr) throw insErr;
      }

      // Atualizar totais na folha
      const { error: updErr } = await supabase
        .from("folha_pagamento")
        .update({
          valor_bruto: totalProv,
          descontos: totalDesc,
          desconto: totalDesc,
          valor_liquido: liquido,
          observacoes: observacoes || null,
        })
        .eq("id", folhaId);
      if (updErr) throw updErr;

      toast.success("Holerite diferença atualizado!");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (it: Item, idxGlobal: number, tipo: "provento" | "desconto") => {
    const opcoes = variaveis.filter((v) => v.tipo === tipo);
    return (
      <TableRow key={`${tipo}-${idxGlobal}`}>
        <TableCell className="w-[60%]">
          <Select value={it.variavel_id} onValueChange={(v) => trocarVariavel(idxGlobal, v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.codigo ? `${v.codigo} — ` : ""}
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={it.valor}
            onChange={(e) => atualizar(idxGlobal, parseFloat(e.target.value) || 0)}
            className="text-right"
          />
        </TableCell>
        <TableCell className="w-10">
          <Button variant="ghost" size="icon" onClick={() => remover(idxGlobal)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Holerite Diferença</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Proventos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-green-700">Proventos</h3>
                <Button size="sm" variant="outline" onClick={() => adicionar("provento")}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar provento
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variável</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((it, idx) =>
                    varMap.get(it.variavel_id)?.tipo === "provento"
                      ? renderRow(it, idx, "provento")
                      : null
                  )}
                  {proventos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Nenhum provento
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Descontos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-red-700">Descontos</h3>
                <Button size="sm" variant="outline" onClick={() => adicionar("desconto")}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar desconto
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variável</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((it, idx) =>
                    varMap.get(it.variavel_id)?.tipo === "desconto"
                      ? renderRow(it, idx, "desconto")
                      : null
                  )}
                  {descontos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Nenhum desconto
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totais */}
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total proventos:</span>
                <strong className="text-green-700">R$ {fmt(totalProv)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total descontos:</span>
                <strong className="text-red-700">R$ {fmt(totalDesc)}</strong>
              </div>
              <div className="flex justify-between text-base pt-2 border-t">
                <span className="font-semibold">Valor líquido:</span>
                <strong>R$ {fmt(liquido)}</strong>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
