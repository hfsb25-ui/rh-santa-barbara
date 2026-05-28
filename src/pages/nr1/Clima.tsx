import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERGUNTAS_PADRAO } from "@/lib/nr1/perguntasPadrao";
import { Smile, Plus, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NR1Clima() {
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokensDialog, setTokensDialog] = useState<{ pesquisa: any; tokens: string[] } | null>(null);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("nr1_pesquisas_clima").select("*").order("created_at", { ascending: false }),
      supabase.from("nr1_clima_respostas").select("*"),
    ]);
    setPesquisas(p.data || []);
    setRespostas(r.data || []);
  };
  useEffect(() => { load(); }, []);

  const criar = async () => {
    if (!titulo.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("nr1_pesquisas_clima").insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      perguntas: PERGUNTAS_PADRAO,
      status: "ativa",
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Pesquisa criada"); setOpen(false); setTitulo(""); setDescricao(""); load(); }
    setLoading(false);
  };

  const gerarTokens = async (pesquisa: any, qtd: number) => {
    const rows = Array.from({ length: qtd }, () => ({ pesquisa_id: pesquisa.id }));
    const { data, error } = await supabase.from("nr1_pesquisa_tokens").insert(rows).select("token");
    if (error) { toast.error(error.message); return; }
    setTokensDialog({ pesquisa, tokens: (data || []).map((t: any) => t.token) });
  };

  const toggleStatus = async (p: any) => {
    const novo = p.status === "ativa" ? "encerrada" : "ativa";
    await supabase.from("nr1_pesquisas_clima").update({ status: novo }).eq("id", p.id);
    load();
  };

  // Resultados
  const calcNota = (pesquisaId: string) => {
    const rs = respostas.filter((r) => r.pesquisa_id === pesquisaId);
    const notas: number[] = [];
    rs.forEach((r) => (r.respostas || []).forEach((x: any) => typeof x.valor === "number" && notas.push(x.valor)));
    return notas.length ? +(notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Smile className="w-7 h-7 text-primary" />
          Pesquisa de Clima Organizacional
        </h1>
        <p className="text-muted-foreground mt-2">Pesquisas anônimas com perguntas padrão NR-1</p>
      </div>

      <Tabs defaultValue="pesquisas">
        <TabsList>
          <TabsTrigger value="pesquisas">Pesquisas</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="pesquisas" className="mt-6 space-y-4">
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova pesquisa</Button>

          <Card className="shadow-elegant">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead>Nota média</TableHead>
                  <TableHead>Criada</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pesquisas.map((p) => {
                  const qtd = respostas.filter((r) => r.pesquisa_id === p.id).length;
                  const nota = calcNota(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.titulo}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "ativa" ? "default" : "secondary"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>{qtd}</TableCell>
                      <TableCell>{nota ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => gerarTokens(p, 50)}>
                          <Link2 className="w-3 h-3 mr-1" />Gerar 50 links
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(p)}>
                          {p.status === "ativa" ? "Encerrar" : "Ativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pesquisas.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pesquisa criada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="resultados" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pesquisas.map((p) => {
              const nota = calcNota(p.id);
              const qtd = respostas.filter((r) => r.pesquisa_id === p.id).length;
              return (
                <Card key={p.id} className="p-5 shadow-elegant">
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{qtd} respostas</p>
                  <div className="text-4xl font-bold mt-3" style={{ color: nota && nota >= 4 ? "rgb(34 197 94)" : nota && nota >= 3 ? "rgb(234 179 8)" : "rgb(239 68 68)" }}>
                    {nota ?? "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Nota média (1-5)</p>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova pesquisa de clima</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Serão incluídas {PERGUNTAS_PADRAO.length} perguntas padrão NR-1.</p>
            <Button onClick={criar} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar pesquisa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tokensDialog} onOpenChange={(o) => !o && setTokensDialog(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Links anônimos gerados</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Distribua estes links aos funcionários. Cada link só pode ser usado uma vez e não identifica o autor.
          </p>
          <div className="space-y-1 font-mono text-xs">
            {tokensDialog?.tokens.map((t) => (
              <div key={t} className="bg-muted p-2 rounded break-all">
                {window.location.origin}/clima/{t}
              </div>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              const text = tokensDialog?.tokens.map((t) => `${window.location.origin}/clima/${t}`).join("\n");
              navigator.clipboard.writeText(text || "");
              toast.success("Links copiados");
            }}
          >Copiar todos</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
