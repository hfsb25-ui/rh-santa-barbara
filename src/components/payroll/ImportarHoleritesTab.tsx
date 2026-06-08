import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Sparkles, Save, AlertCircle, CheckCircle2, XCircle, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Empresa { id: string; nome: string }
interface Employee { id: string; nome_completo: string; cpf: string | null }

interface Rubrica {
  codigo?: string | null;
  descricao?: string | null;
  valor: number;
  variavel_id?: string | null;
  variavel_nome?: string | null;
}

interface ExtractedHolerite {
  pagina: number;
  cpf: string | null;
  cpf_raw?: string;
  nome: string;
  mes: number | null;
  ano: number | null;
  tipo_folha: string;
  empresa_nome?: string | null;
  empresa_id: string | null;
  employee_id: string | null;
  employee_nome: string | null;
  valor_bruto: number;
  descontos_total: number;
  valor_liquido: number;
  proventos: Rubrica[];
  descontos: Rubrica[];
  status: "ok" | "sem_cpf" | "cpf_nao_encontrado" | "ja_existe" | "sem_periodo";
  selecionado?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function statusBadge(s: ExtractedHolerite["status"]) {
  switch (s) {
    case "ok":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Reconhecido</Badge>;
    case "cpf_nao_encontrado":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">CPF não cadastrado</Badge>;
    case "sem_cpf":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">CPF não lido</Badge>;
    case "ja_existe":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Já existe</Badge>;
    case "sem_periodo":
      return <Badge variant="outline">Sem mês/ano</Badge>;
  }
}

export function ImportarHoleritesTab() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empresaDefault, setEmpresaDefault] = useState<string>("");
  const [mesDefault, setMesDefault] = useState<number>(new Date().getMonth() + 1);
  const [anoDefault, setAnoDefault] = useState<number>(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultados, setResultados] = useState<ExtractedHolerite[]>([]);
  const [preview, setPreview] = useState<ExtractedHolerite | null>(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [novasVariaveis, setNovasVariaveis] = useState<Array<{
    key: string;
    codigo: string;
    nome: string;
    tipo: "provento" | "desconto";
    selecionado: boolean;
  }>>([]);
  const [salvandoVars, setSalvandoVars] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: emp } = await supabase.from("empresas").select("id, nome").order("nome");
      setEmpresas(emp || []);
      const { data: e } = await supabase
        .from("employees")
        .select("id, nome_completo, cpf")
        .order("nome_completo");
      setEmployees(e || []);
    })();
  }, []);

  async function handleProcessar() {
    if (!file) {
      toast.error("Selecione um PDF primeiro");
      return;
    }
    setProcessing(true);
    setResultados([]);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("holerite-importar-pdf", {
        body: {
          pdf_base64: base64,
          mes_default: mesDefault,
          ano_default: anoDefault,
          empresa_id_default: empresaDefault || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const hols: ExtractedHolerite[] = (data.holerites || []).map((h: ExtractedHolerite) => ({
        ...h,
        selecionado: h.status === "ok",
      }));
      setResultados(hols);
      toast.success(`${hols.length} holerite(s) extraído(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao processar PDF");
    } finally {
      setProcessing(false);
    }
  }

  async function handleImportar() {
    const aImportar = resultados.filter((r) => r.selecionado && r.status === "ok");
    if (aImportar.length === 0) {
      toast.error("Nenhum holerite válido selecionado");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "holerite-importar-pdf-confirmar",
        { body: { holerites: aImportar } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.criados} criados, ${data.pulados} pulados`);
      if (data.erros?.length) console.warn("Erros:", data.erros);
      setResultados([]);
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar");
    } finally {
      setSaving(false);
    }
  }

  function vincularManual(idx: number, employeeId: string) {
    setResultados((arr) => {
      const novo = [...arr];
      const emp = employees.find((e) => e.id === employeeId);
      if (emp) {
        novo[idx] = {
          ...novo[idx],
          employee_id: emp.id,
          employee_nome: emp.nome_completo,
          status: novo[idx].mes && novo[idx].ano ? "ok" : "sem_periodo",
          selecionado: true,
        };
      }
      return novo;
    });
  }

  const totalOk = resultados.filter((r) => r.status === "ok").length;
  const totalSelecionados = resultados.filter((r) => r.selecionado && r.status === "ok").length;

  // Agrupa rubricas não mapeadas (chave = tipo + descrição normalizada)
  function coletarNaoMapeadas() {
    const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const map = new Map<string, { codigo: string; nome: string; tipo: "provento" | "desconto" }>();
    for (const r of resultados) {
      for (const p of r.proventos) {
        if (!p.variavel_id && p.descricao) {
          const k = `provento|${norm(p.descricao)}`;
          if (!map.has(k)) map.set(k, { codigo: p.codigo || "", nome: p.descricao.toUpperCase(), tipo: "provento" });
        }
      }
      for (const d of r.descontos) {
        if (!d.variavel_id && d.descricao) {
          const k = `desconto|${norm(d.descricao)}`;
          if (!map.has(k)) map.set(k, { codigo: d.codigo || "", nome: d.descricao.toUpperCase(), tipo: "desconto" });
        }
      }
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v, selecionado: true }));
  }

  const naoMapeadasCount = coletarNaoMapeadas().length;

  function abrirCadastro() {
    setNovasVariaveis(coletarNaoMapeadas());
    setCadastroOpen(true);
  }

  async function confirmarCadastro() {
    const aCriar = novasVariaveis.filter((v) => v.selecionado && v.nome.trim());
    if (aCriar.length === 0) {
      toast.error("Selecione ao menos uma variável");
      return;
    }
    setSalvandoVars(true);
    try {
      const payload = aCriar.map((v) => ({
        nome: v.nome.trim().toUpperCase(),
        codigo: v.codigo.trim() || null,
        tipo: v.tipo,
        ativo: true,
        empresa_id: empresaDefault || null,
      }));
      const { data: criadas, error } = await supabase
        .from("variaveis_folha")
        .insert(payload)
        .select("id, nome, codigo, tipo");
      if (error) throw error;

      // Re-mapeia rubricas em memória
      const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      function findCriada(tipo: "provento" | "desconto", codigo?: string | null, descricao?: string | null) {
        const pool = (criadas || []).filter((c) => c.tipo === tipo);
        if (codigo) {
          const byCode = pool.find((c) => (c.codigo || "").toLowerCase() === codigo.toLowerCase());
          if (byCode) return byCode;
        }
        if (descricao) {
          const t = norm(descricao);
          return pool.find((c) => norm(c.nome) === t) || null;
        }
        return null;
      }
      setResultados((arr) =>
        arr.map((r) => ({
          ...r,
          proventos: r.proventos.map((p) =>
            p.variavel_id ? p : (() => {
              const v = findCriada("provento", p.codigo, p.descricao);
              return v ? { ...p, variavel_id: v.id, variavel_nome: v.nome } : p;
            })()
          ),
          descontos: r.descontos.map((d) =>
            d.variavel_id ? d : (() => {
              const v = findCriada("desconto", d.codigo, d.descricao);
              return v ? { ...d, variavel_id: v.id, variavel_nome: v.nome } : d;
            })()
          ),
        }))
      );
      toast.success(`${criadas?.length || 0} variável(is) cadastrada(s)`);
      setCadastroOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cadastrar variáveis");
    } finally {
      setSalvandoVars(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Holerites por PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Empresa padrão</Label>
              <Select value={empresaDefault} onValueChange={setEmpresaDefault}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês padrão</Label>
              <Select value={String(mesDefault)} onValueChange={(v) => setMesDefault(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{MESES[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano padrão</Label>
              <Input type="number" value={anoDefault} onChange={(e) => setAnoDefault(Number(e.target.value))} />
            </div>
            <div>
              <Label>Arquivo PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleProcessar} disabled={!file || processing}>
              <Upload className="w-4 h-4 mr-2" />
              {processing ? "Processando com IA..." : "Processar com IA"}
            </Button>
            {resultados.length > 0 && (
              <Button onClick={handleImportar} disabled={saving || totalSelecionados === 0} variant="default">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Importando..." : `Importar ${totalSelecionados} como rascunho`}
              </Button>
            )}
          </div>

          {resultados.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span>Total: <b>{resultados.length}</b></span>
              <span className="text-green-700">Reconhecidos: <b>{totalOk}</b></span>
              <span className="text-yellow-700">Pendentes: <b>{resultados.length - totalOk}</b></span>
            </div>
          )}
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados extraídos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Pág</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Checkbox
                        checked={!!r.selecionado}
                        disabled={r.status !== "ok"}
                        onCheckedChange={(v) =>
                          setResultados((arr) => {
                            const n = [...arr];
                            n[idx] = { ...n[idx], selecionado: !!v };
                            return n;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{r.pagina}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cpf || r.cpf_raw || "—"}</TableCell>
                    <TableCell>
                      {r.employee_nome ? (
                        <span className="font-medium">{r.employee_nome}</span>
                      ) : (
                        <Select onValueChange={(v) => vincularManual(idx, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={r.nome || "Vincular..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome_completo} {e.cpf ? `(${e.cpf})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{r.mes && r.ano ? `${MESES[r.mes]}/${r.ano}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      R$ {r.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {r.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => setPreview(r)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados extraídos — Página {preview?.pagina}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><b>CPF:</b> {preview.cpf || preview.cpf_raw || "—"}</div>
                <div><b>Nome:</b> {preview.nome}</div>
                <div><b>Empresa:</b> {preview.empresa_nome || "—"}</div>
                <div><b>Período:</b> {preview.mes && preview.ano ? `${MESES[preview.mes]}/${preview.ano}` : "—"}</div>
                <div><b>Tipo:</b> {preview.tipo_folha}</div>
              </div>

              <div>
                <h4 className="font-semibold text-green-700 mb-1">Proventos</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Variável</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.proventos.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.codigo || "—"}</TableCell>
                        <TableCell>{p.descricao}</TableCell>
                        <TableCell className={p.variavel_id ? "text-green-700" : "text-yellow-700"}>
                          {p.variavel_nome || "Não mapeada"}
                        </TableCell>
                        <TableCell className="text-right">R$ {p.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-semibold text-red-700 mb-1">Descontos</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Variável</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.descontos.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.codigo || "—"}</TableCell>
                        <TableCell>{d.descricao}</TableCell>
                        <TableCell className={d.variavel_id ? "text-green-700" : "text-yellow-700"}>
                          {d.variavel_nome || "Não mapeada"}
                        </TableCell>
                        <TableCell className="text-right">R$ {d.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Bruto: R$ {preview.valor_bruto.toFixed(2)}</span>
                <span>Descontos: R$ {preview.descontos_total.toFixed(2)}</span>
                <span>Líquido: R$ {preview.valor_liquido.toFixed(2)}</span>
              </div>

              {(preview.proventos.some((p) => !p.variavel_id) || preview.descontos.some((d) => !d.variavel_id)) && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-xs">
                    Algumas rubricas não foram mapeadas para variáveis cadastradas. Elas serão ignoradas na importação dos itens. Cadastre as variáveis em "Variáveis" e reprocesse, ou importe os totais mesmo assim.
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
