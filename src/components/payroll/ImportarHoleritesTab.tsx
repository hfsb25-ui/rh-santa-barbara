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
import { Upload, Sparkles, Save, AlertCircle, CheckCircle2, XCircle, Eye, Plus, Clock, Loader2, ScanText } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { processarHoleritesOCR } from "@/lib/holeriteOcrParser";
import { processarHoleritesTexto } from "@/lib/holeriteTextParser";

type JobStatus = "idle" | "enfileirado" | "processando" | "concluido" | "erro";

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
  const [sobrescrever, setSobrescrever] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [novasVariaveis, setNovasVariaveis] = useState<Array<{
    key: string;
    codigo: string;
    nome: string;
    tipo: "provento" | "desconto";
    selecionado: boolean;
  }>>([]);
  const [salvandoVars, setSalvandoVars] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [jobElapsed, setJobElapsed] = useState(0);
  const [jobMessage, setJobMessage] = useState<string>("");
  const [jobError, setJobError] = useState<string>("");

  // Tick do tempo decorrido + barra de progresso estimada (assintótica até 95%)
  useEffect(() => {
    if (jobStatus !== "enfileirado" && jobStatus !== "processando") return;
    const start = Date.now();
    const itv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setJobElapsed(elapsed);
      // Curva assintótica: chega rápido a ~60% e desacelera até 95%
      const estimated = Math.min(95, 100 * (1 - Math.exp(-elapsed / 60)));
      setJobProgress((p) => Math.max(p, estimated));
    }, 500);
    return () => clearInterval(itv);
  }, [jobStatus]);

  const isSelecionavel = (s: ExtractedHolerite["status"]) =>
    s === "ok" || (s === "ja_existe" && sobrescrever);

  // Quando alterna sobrescrever, marca/desmarca automaticamente os "ja_existe"
  useEffect(() => {
    setResultados((arr) =>
      arr.map((r) =>
        r.status === "ja_existe" ? { ...r, selecionado: sobrescrever } : r
      )
    );
  }, [sobrescrever]);

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
    setJobStatus("enfileirado");
    setJobProgress(2);
    setJobElapsed(0);
    setJobError("");
    setJobMessage("Enviando PDF para o servidor...");
    try {
      const base64 = await fileToBase64(file);
      setJobMessage("Aguardando início do processamento...");
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
      const jobId: string | undefined = data?.job_id;
      if (!jobId) throw new Error("Resposta inválida do servidor");

      setJobStatus("processando");
      setJobMessage("IA extraindo dados do PDF...");

      // Polling do job (até 10 minutos)
      const inicio = Date.now();
      const TIMEOUT_MS = 10 * 60 * 1000;
      let resultado: any = null;
      while (Date.now() - inicio < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 4000));
        const { data: job, error: errJob } = await supabase
          .from("holerite_import_jobs" as any)
          .select("status, resultado, erro")
          .eq("id", jobId)
          .maybeSingle();
        if (errJob) throw errJob;
        const j: any = job;
        const parcial = j?.resultado || {};
        if (j?.status === "processando" && parcial.total_lotes) {
          const pct = Math.min(98, Math.round((Number(parcial.lotes_processados || 0) / Number(parcial.total_lotes)) * 100));
          setJobProgress(Math.max(8, pct));
          setJobMessage(
            `Processando lote ${parcial.lotes_processados || 0}/${parcial.total_lotes} — ${parcial.holerites_parciais || 0} holerite(s) encontrado(s)`
          );
        }
        if (j?.status === "concluido") {
          resultado = j.resultado;
          break;
        }
        if (j?.status === "erro") {
          throw new Error(j.erro || "Erro ao processar PDF");
        }
      }
      if (!resultado) throw new Error("Tempo esgotado ao processar o PDF. Tente um arquivo menor.");

      const hols: ExtractedHolerite[] = (resultado.holerites || []).map((h: ExtractedHolerite) => ({
        ...h,
        selecionado: h.status === "ok",
      }));
      setResultados(hols);
      setJobStatus("concluido");
      setJobProgress(100);
      setJobMessage(`${hols.length} holerite(s) extraído(s)`);
      if (resultado.avisos?.length) {
        toast.warning(`${resultado.avisos.length} lote(s) tiveram falha, mas ${hols.length} holerite(s) foram extraídos.`);
      }
      toast.success(`${hols.length} holerite(s) extraído(s)`);
    } catch (e: any) {
      console.error(e);
      setJobStatus("erro");
      setJobError(e?.message || "Erro ao processar PDF");
      toast.error(e?.message || "Erro ao processar PDF");
    } finally {
      setProcessing(false);
    }
  }



  async function handleProcessarOCR() {
    if (!file) {
      toast.error("Selecione um PDF primeiro");
      return;
    }
    setProcessing(true);
    setResultados([]);
    setJobStatus("processando");
    setJobProgress(2);
    setJobElapsed(0);
    setJobError("");
    setJobMessage("Iniciando OCR no navegador...");
    try {
      const hols = await processarHoleritesOCR(
        file,
        { mes: mesDefault, ano: anoDefault, empresa_id: empresaDefault || null },
        (p) => {
          // Cada página gera 3 etapas: render, ocr, parse → cada uma vale 1/3 de página
          const passos = p.fase === "render" ? 0 : p.fase === "ocr" ? 0.33 : p.fase === "parse" ? 0.66 : 1;
          const base = p.total > 0 ? ((p.pagina - 1 + passos) / p.total) * 95 : 0;
          setJobProgress(Math.max(2, Math.min(98, Math.round(base))));
          setJobMessage(p.msg);
        }
      );
      const enriched = hols.map((h: any) => ({ ...h, selecionado: h.status === "ok" }));
      setResultados(enriched as any);
      setJobStatus("concluido");
      setJobProgress(100);
      setJobMessage(`${enriched.length} holerite(s) extraído(s) via OCR`);
      toast.success(`${enriched.length} holerite(s) extraído(s) via OCR`);
    } catch (e: any) {
      console.error(e);
      setJobStatus("erro");
      setJobError(e?.message || "Erro no OCR");
      toast.error(e?.message || "Erro no OCR");
    } finally {
      setProcessing(false);
  }

  async function handleProcessarTexto() {
    if (!file) {
      toast.error("Selecione um PDF primeiro");
      return;
    }
    setProcessing(true);
    setResultados([]);
    setJobStatus("processando");
    setJobProgress(2);
    setJobElapsed(0);
    setJobError("");
    setJobMessage("Lendo texto do PDF...");
    try {
      const hols = await processarHoleritesTexto(
        file,
        { mes: mesDefault, ano: anoDefault, empresa_id: empresaDefault || null },
        (p) => {
          const base = p.total > 0 ? (p.pagina / p.total) * 95 : 0;
          setJobProgress(Math.max(2, Math.min(98, Math.round(base))));
          setJobMessage(p.msg);
        }
      );
      const enriched = hols.map((h: any) => ({ ...h, selecionado: h.status === "ok" }));
      setResultados(enriched as any);
      setJobStatus("concluido");
      setJobProgress(100);
      setJobMessage(`${enriched.length} holerite(s) extraído(s) do texto`);
      toast.success(`${enriched.length} holerite(s) extraído(s) do texto do PDF`);
    } catch (e: any) {
      console.error(e);
      setJobStatus("erro");
      setJobError(e?.message || "Erro ao ler texto");
      toast.error(e?.message || "Erro ao ler texto do PDF");
    } finally {
      setProcessing(false);
    }
  }



  async function handleImportar() {
    const aImportar = resultados.filter((r) => r.selecionado && isSelecionavel(r.status));
    if (aImportar.length === 0) {
      toast.error("Nenhum holerite válido selecionado");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "holerite-importar-pdf-confirmar",
        { body: { holerites: aImportar, sobrescrever } }
      );
      if (error) {
        // Tenta extrair mensagem real do body de erro da edge function
        let realMsg = error.message || "Erro ao importar";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) realMsg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            if (txt) realMsg = txt;
          }
        } catch {}
        console.error("[importar] erro detalhado:", error, realMsg);
        throw new Error(realMsg);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(
        `${data.criados} criado(s), ${data.sobrescritos || 0} sobrescrito(s), ${data.pulados} pulado(s)`
      );
      if (data.erros?.length) {
        console.warn("Erros:", data.erros);
        toast.warning(`Avisos: ${data.erros.slice(0, 3).join(" | ")}`);
      }
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
  const totalJaExiste = resultados.filter((r) => r.status === "ja_existe").length;
  const totalSelecionados = resultados.filter((r) => r.selecionado && isSelecionavel(r.status)).length;

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
      // Monta payload normalizado
      const rawPayload = aCriar.map((v) => ({
        nome: v.nome.trim().toUpperCase(),
        codigo: v.codigo.trim() || null,
        tipo: v.tipo,
        ativo: true,
        empresa_id: empresaDefault || null,
      }));

      // Dedupe interno: por (codigo+tipo) quando há código, senão por (nome+tipo)
      const seen = new Set<string>();
      const payload: typeof rawPayload = [];
      for (const p of rawPayload) {
        const key = p.codigo
          ? `c:${p.tipo}:${p.codigo.toLowerCase()}`
          : `n:${p.tipo}:${p.nome.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        payload.push(p);
      }

      // Busca códigos já existentes no banco para atualizar (não inserir duplicado)
      const codigosNovos = payload.map((p) => p.codigo).filter((c): c is string => !!c);
      let existentes: any[] = [];
      if (codigosNovos.length > 0) {
        const { data: jaExistem } = await supabase
          .from("variaveis_folha")
          .select("id, nome, codigo, tipo")
          .in("codigo", codigosNovos);
        existentes = jaExistem || [];
      }
      const mapaExistentes = new Map(
        existentes.map((e) => [(e.codigo || "").toLowerCase(), e])
      );

      // Atualiza variáveis já existentes com os novos dados
      let atualizadas = 0;
      const atualizadasInfo: any[] = [];
      for (const p of payload) {
        if (!p.codigo) continue;
        const exist = mapaExistentes.get(p.codigo.toLowerCase());
        if (!exist) continue;
        const { error: upErr, data: upData } = await supabase
          .from("variaveis_folha")
          .update({ nome: p.nome, tipo: p.tipo, ativo: true })
          .eq("id", exist.id)
          .select("id, nome, codigo, tipo")
          .maybeSingle();
        if (!upErr && upData) {
          atualizadas++;
          atualizadasInfo.push(upData);
        } else if (upData === null) {
          atualizadasInfo.push({ ...exist, nome: p.nome, tipo: p.tipo });
        }
      }

      const aInserir = payload.filter(
        (p) => !p.codigo || !mapaExistentes.has(p.codigo.toLowerCase())
      );

      let criadas: any[] = [];
      if (aInserir.length > 0) {
        const { data, error } = await supabase
          .from("variaveis_folha")
          .insert(aInserir)
          .select("id, nome, codigo, tipo");
        if (error) throw error;
        criadas = data || [];
      }

      // Pool para mapeamento = criadas + atualizadas
      const pool = [...criadas, ...atualizadasInfo];


      // Re-mapeia rubricas em memória
      const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      function findCriada(tipo: "provento" | "desconto", codigo?: string | null, descricao?: string | null) {
        const filtered = pool.filter((c) => c.tipo === tipo);
        if (codigo) {
          const byCode = filtered.find((c) => (c.codigo || "").toLowerCase() === codigo.toLowerCase());
          if (byCode) return byCode;
        }
        if (descricao) {
          const t = norm(descricao);
          return filtered.find((c) => norm(c.nome) === t) || null;
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
      const msgUp = atualizadas > 0 ? ` · ${atualizadas} atualizada(s)` : "";
      toast.success(`${criadas.length} variável(is) cadastrada(s)${msgUp}`);
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

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleProcessar} disabled={!file || processing}>
              <Upload className="w-4 h-4 mr-2" />
              {processing ? "Processando com IA..." : "Processar com IA"}
            </Button>
            <Button onClick={handleProcessarTexto} disabled={!file || processing} variant="default">
              <Upload className="w-4 h-4 mr-2" />
              {processing ? "Processando..." : "Processar texto do PDF (sem IA, sem OCR)"}
            </Button>
            <Button onClick={handleProcessarOCR} disabled={!file || processing} variant="secondary">
              <ScanText className="w-4 h-4 mr-2" />
              {processing ? "Processando..." : "Processar via OCR (sem IA)"}
            </Button>
            {resultados.length > 0 && (
              <Button onClick={handleImportar} disabled={saving || totalSelecionados === 0} variant="default">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Importando..." : `Importar ${totalSelecionados} como rascunho`}
              </Button>
            )}
            {naoMapeadasCount > 0 && (
              <Button onClick={abrirCadastro} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar {naoMapeadasCount} variável(is) não mapeada(s)
              </Button>
            )}
          </div>


          {jobStatus !== "idle" && (
            <div className="rounded-lg border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {jobStatus === "enfileirado" && (
                    <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 gap-1">
                      <Clock className="w-3 h-3" /> Enfileirado
                    </Badge>
                  )}
                  {jobStatus === "processando" && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processando
                    </Badge>
                  )}
                  {jobStatus === "concluido" && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Concluído
                    </Badge>
                  )}
                  {jobStatus === "erro" && (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                      <XCircle className="w-3 h-3" /> Erro
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {jobStatus === "erro" ? jobError : jobMessage}
                  </span>
                </div>
                {(jobStatus === "enfileirado" || jobStatus === "processando") && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.floor(jobElapsed / 60)}:{String(jobElapsed % 60).padStart(2, "0")} decorridos
                  </span>
                )}
              </div>
              <Progress
                value={jobStatus === "erro" ? 100 : jobProgress}
                className={
                  jobStatus === "erro"
                    ? "[&>div]:bg-destructive"
                    : jobStatus === "concluido"
                    ? "[&>div]:bg-green-600"
                    : ""
                }
              />
              {(jobStatus === "enfileirado" || jobStatus === "processando") && (
                <p className="text-xs text-muted-foreground">
                  O processamento continua em segundo plano. Pode levar alguns minutos para PDFs grandes.
                </p>
              )}
            </div>
          )}

          {resultados.length > 0 && (
            <>
              <div className="flex items-center gap-2 p-3 rounded border bg-muted/30">
                <Checkbox
                  id="sobrescrever-toggle"
                  checked={sobrescrever}
                  onCheckedChange={(v) => setSobrescrever(!!v)}
                />
                <Label htmlFor="sobrescrever-toggle" className="cursor-pointer text-sm">
                  Sobrescrever holerites já existentes
                  {totalJaExiste > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      ({totalJaExiste} já existente{totalJaExiste > 1 ? "s" : ""} no banco)
                    </span>
                  )}
                </Label>
              </div>
              <div className="flex gap-4 text-sm">
                <span>Total: <b>{resultados.length}</b></span>
                <span className="text-green-700">Reconhecidos: <b>{totalOk}</b></span>
                <span className="text-blue-700">Já existem: <b>{totalJaExiste}</b></span>
                <span className="text-yellow-700">Pendentes: <b>{resultados.length - totalOk - totalJaExiste}</b></span>
              </div>
            </>
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
                        disabled={!isSelecionavel(r.status)}
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

      <Dialog open={cadastroOpen} onOpenChange={setCadastroOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar variáveis não mapeadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              As rubricas abaixo foram identificadas no PDF mas não existem em "Variáveis de Folha".
              Revise os dados e autorize o cadastro. Após cadastrar, o sistema re-mapeia automaticamente
              os holerites em memória.
            </p>
            {novasVariaveis.length === 0 ? (
              <p className="text-sm text-center py-6 text-muted-foreground">Nenhuma rubrica pendente.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novasVariaveis.map((v, idx) => (
                    <TableRow key={v.key}>
                      <TableCell>
                        <Checkbox
                          checked={v.selecionado}
                          onCheckedChange={(c) =>
                            setNovasVariaveis((arr) => {
                              const n = [...arr];
                              n[idx] = { ...n[idx], selecionado: !!c };
                              return n;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={v.tipo}
                          onValueChange={(t: "provento" | "desconto") =>
                            setNovasVariaveis((arr) => {
                              const n = [...arr];
                              n[idx] = { ...n[idx], tipo: t };
                              return n;
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="provento">Provento</SelectItem>
                            <SelectItem value="desconto">Desconto</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-24"
                          value={v.codigo}
                          onChange={(e) =>
                            setNovasVariaveis((arr) => {
                              const n = [...arr];
                              n[idx] = { ...n[idx], codigo: e.target.value };
                              return n;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={v.nome}
                          onChange={(e) =>
                            setNovasVariaveis((arr) => {
                              const n = [...arr];
                              n[idx] = { ...n[idx], nome: e.target.value };
                              return n;
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastroOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarCadastro} disabled={salvandoVars || novasVariaveis.length === 0}>
              {salvandoVars ? "Cadastrando..." : "Autorizar cadastro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
