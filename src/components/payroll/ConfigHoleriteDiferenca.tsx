import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";

interface Variavel {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: "desconto" | "provento";
}

export function ConfigHoleriteDiferenca() {
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [ativo, setAtivo] = useState(true);
  const [incluirLiquido, setIncluirLiquido] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: vars }, { data: cfg }] = await Promise.all([
        supabase
          .from("variaveis_folha")
          .select("id, nome, codigo, tipo")
          .eq("tipo", "desconto")
          .order("nome"),
        (supabase as any)
          .from("configuracao_holerite_diferenca")
          .select("id, variaveis_desconto_ids, ativo, incluir_liquido_holerite")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setVariaveis((vars || []) as Variavel[]);
      if (cfg) {
        setConfigId(cfg.id);
        setAtivo(cfg.ativo);
        setIncluirLiquido(!!cfg.incluir_liquido_holerite);
        setSelecionadas(new Set((cfg.variaveis_desconto_ids || []) as string[]));
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    setSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const salvar = async () => {
    setSaving(true);
    const payload = {
      variaveis_desconto_ids: Array.from(selecionadas),
      ativo,
    };
    try {
      if (configId) {
        const { error } = await (supabase as any)
          .from("configuracao_holerite_diferenca")
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("configuracao_holerite_diferenca")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }
      toast.success("Configuração salva!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuração — Holerite Diferença</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm flex gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Como funciona</p>
            <p className="text-muted-foreground">
              O Holerite Diferença usa como base o <strong>salário cadastrado do funcionário</strong>.
              Em seguida, desconta as variáveis selecionadas abaixo (puxadas do holerite normal do
              mesmo mês). O valor restante é a diferença a pagar.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fórmula: <code>diferença = salário base − soma das variáveis selecionadas</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo" />
          <Label htmlFor="ativo">Configuração ativa</Label>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando variáveis...</p>
        ) : variaveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma variável do tipo desconto cadastrada. Cadastre na aba "Variáveis".
          </p>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm">Variáveis de desconto consideradas:</Label>
            <div className="grid md:grid-cols-2 gap-2">
              {variaveis.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selecionadas.has(v.id)}
                    onCheckedChange={() => toggle(v.id)}
                  />
                  <span className="text-sm">
                    {v.codigo && <span className="text-muted-foreground mr-2">{v.codigo}</span>}
                    {v.nome}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selecionadas.size} variável(is) selecionada(s)
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={saving || loading}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
