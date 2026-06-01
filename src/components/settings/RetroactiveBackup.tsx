import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, AlertTriangle, Square, Play } from "lucide-react";
import { toast } from "sonner";
import { gerarHoleritePdf } from "@/lib/pdfGeneratorHolerite";
import { generateEpiReceipt, generateUniformReceipt } from "@/lib/pdfGenerator";

interface Pending {
  holerites: number;
  epis: number;
  uniformes: number;
}

const BATCH = 5;
const PAUSE_BETWEEN = 800; // ms entre uploads (rate limit do Drive)

export const RetroactiveBackup = () => {
  const [pending, setPending] = useState<Pending>({ holerites: 0, epis: 0, uniformes: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ ok: 0, erro: 0, total: 0, current: "" });
  const stopRef = useRef(false);

  const loadCounts = async () => {
    setLoading(true);
    const [h, e, u] = await Promise.all([
      (supabase as any).from("folha_pagamento").select("id", { count: "exact", head: true }).is("backup_drive_em", null),
      (supabase as any).from("historico_estoque_epis").select("id", { count: "exact", head: true })
        .is("backup_drive_em", null).eq("tipo_movimentacao", "saida").not("employee_id", "is", null),
      (supabase as any).from("historico_estoque_uniformes").select("id", { count: "exact", head: true })
        .is("backup_drive_em", null).eq("tipo_movimentacao", "saida").not("employee_id", "is", null),
    ]);
    setPending({
      holerites: h.count || 0,
      epis: e.count || 0,
      uniformes: u.count || 0,
    });
    setLoading(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // ============ Holerites ============
  async function processHolerites() {
    while (!stopRef.current) {
      const { data: lote, error } = await (supabase as any)
        .from("folha_pagamento")
        .select(`
          id, employee_id, empresa_id, valor_bruto, desconto, descontos, valor_liquido,
          observacoes, mes, ano, tipo_folha,
          folha_pagamento_itens(id, variavel_id, valor, variaveis_folha(id, nome, codigo, tipo))
        `)
        .is("backup_drive_em", null)
        .order("created_at", { ascending: true })
        .limit(BATCH);

      if (error) { console.error(error); break; }
      if (!lote || lote.length === 0) break;

      // Pré-carrega employees e empresas em lote
      const empIds = [...new Set(lote.map((p: any) => p.employee_id))];
      const empresaIds = [...new Set(lote.map((p: any) => p.empresa_id))];
      const [{ data: emps }, { data: empresas }] = await Promise.all([
        supabase.from("employees").select("id, nome_completo, cargo, cpf, data_admissao, setor, salario, tipo_salario").in("id", empIds as string[]),
        supabase.from("empresas").select("id, nome, cnpj, endereco, logo_url").in("id", empresaIds as string[]),
      ]);
      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      const empresaMap = new Map((empresas || []).map((e: any) => [e.id, e]));

      for (const pag of lote) {
        if (stopRef.current) return;
        const employee = empMap.get(pag.employee_id);
        const empresa = empresaMap.get(pag.empresa_id);
        if (!employee || !empresa) {
          await (supabase as any).from("folha_pagamento").update({ backup_drive_em: new Date().toISOString() }).eq("id", pag.id);
          setStats(s => ({ ...s, erro: s.erro + 1, current: `Holerite sem dados (${pag.mes}/${pag.ano})` }));
          continue;
        }
        setStats(s => ({ ...s, current: `Holerite ${(employee as any).nome_completo} ${pag.mes}/${pag.ano}` }));
        try {
          await gerarHoleritePdf(pag as any, empresa as any, employee as any, { silent: true });
          await (supabase as any).from("folha_pagamento").update({ backup_drive_em: new Date().toISOString() }).eq("id", pag.id);
          setStats(s => ({ ...s, ok: s.ok + 1 }));
        } catch (e: any) {
          console.error("Holerite falhou", pag.id, e);
          setStats(s => ({ ...s, erro: s.erro + 1 }));
        }
        await sleep(PAUSE_BETWEEN);
      }
    }
  }

  // ============ EPIs ============
  async function processEpis() {
    while (!stopRef.current) {
      const { data: lote, error } = await (supabase as any)
        .from("historico_estoque_epis")
        .select(`id, employee_id, quantidade, motivo, created_at,
                 estoque_epis(tipo_epi, marca_modelo, ca, tamanho, finalidade)`)
        .is("backup_drive_em", null)
        .eq("tipo_movimentacao", "saida")
        .not("employee_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(BATCH);

      if (error) { console.error(error); break; }
      if (!lote || lote.length === 0) break;

      const empIds = [...new Set(lote.map((r: any) => r.employee_id))];
      const { data: emps } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, cpf, empresa_id, empresas(nome, cnpj)")
        .in("id", empIds as string[]);
      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));

      for (const r of lote) {
        if (stopRef.current) return;
        const emp: any = empMap.get(r.employee_id);
        if (!emp) {
          await (supabase as any).from("historico_estoque_epis").update({ backup_drive_em: new Date().toISOString() }).eq("id", r.id);
          setStats(s => ({ ...s, erro: s.erro + 1 }));
          continue;
        }
        const estoque = r.estoque_epis;
        const empresa = emp.empresas;
        setStats(s => ({ ...s, current: `EPI ${emp.nome_completo}` }));
        try {
          await generateEpiReceipt({
            employeeName: emp.nome_completo,
            employeeCpf: emp.cpf || "",
            employeeRole: emp.cargo || "",
            tipoEpi: estoque?.tipo_epi || "—",
            quantidade: r.quantidade,
            dataEntrega: r.created_at,
            observacoes: r.motivo,
            marcaModelo: estoque?.marca_modelo,
            ca: estoque?.ca,
            tamanho: estoque?.tamanho,
            finalidade: estoque?.finalidade,
            empresaNome: empresa?.nome,
            empresaCnpj: empresa?.cnpj,
          }, { silent: true, employee_id: emp.id });
          await (supabase as any).from("historico_estoque_epis").update({ backup_drive_em: new Date().toISOString() }).eq("id", r.id);
          setStats(s => ({ ...s, ok: s.ok + 1 }));
        } catch (e) {
          console.error("EPI falhou", r.id, e);
          setStats(s => ({ ...s, erro: s.erro + 1 }));
        }
        await sleep(PAUSE_BETWEEN);
      }
    }
  }

  // ============ Uniformes ============
  async function processUniformes() {
    while (!stopRef.current) {
      const { data: lote, error } = await (supabase as any)
        .from("historico_estoque_uniformes")
        .select(`id, employee_id, quantidade, motivo, created_at,
                 estoque_uniformes(tipo_uniforme, tamanho)`)
        .is("backup_drive_em", null)
        .eq("tipo_movimentacao", "saida")
        .not("employee_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(BATCH);

      if (error) { console.error(error); break; }
      if (!lote || lote.length === 0) break;

      const empIds = [...new Set(lote.map((r: any) => r.employee_id))];
      const { data: emps } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, cpf, empresa_id, empresas(nome, cnpj)")
        .in("id", empIds as string[]);
      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));

      for (const r of lote) {
        if (stopRef.current) return;
        const emp: any = empMap.get(r.employee_id);
        if (!emp) {
          await (supabase as any).from("historico_estoque_uniformes").update({ backup_drive_em: new Date().toISOString() }).eq("id", r.id);
          setStats(s => ({ ...s, erro: s.erro + 1 }));
          continue;
        }
        const estoque = r.estoque_uniformes;
        const empresa = emp.empresas;
        setStats(s => ({ ...s, current: `Uniforme ${emp.nome_completo}` }));
        try {
          await generateUniformReceipt({
            employeeName: emp.nome_completo,
            employeeCpf: emp.cpf || "",
            employeeRole: emp.cargo || "",
            tipoUniforme: estoque?.tipo_uniforme || "—",
            tamanho: estoque?.tamanho || "—",
            quantidade: r.quantidade,
            dataEntrega: r.created_at,
            observacoes: r.motivo,
            empresaNome: empresa?.nome,
            empresaCnpj: empresa?.cnpj,
          }, { silent: true, employee_id: emp.id });
          await (supabase as any).from("historico_estoque_uniformes").update({ backup_drive_em: new Date().toISOString() }).eq("id", r.id);
          setStats(s => ({ ...s, ok: s.ok + 1 }));
        } catch (e) {
          console.error("Uniforme falhou", r.id, e);
          setStats(s => ({ ...s, erro: s.erro + 1 }));
        }
        await sleep(PAUSE_BETWEEN);
      }
    }
  }

  const start = async () => {
    const total = pending.holerites + pending.epis + pending.uniformes;
    if (total === 0) { toast.info("Nada para processar — tudo já está no Drive!"); return; }
    if (!confirm(`Vai regerar e enviar ${total} arquivos para o Drive. Mantenha esta aba aberta. Continuar?`)) return;

    stopRef.current = false;
    setRunning(true);
    setStats({ ok: 0, erro: 0, total, current: "Iniciando..." });

    try {
      await processHolerites();
      if (!stopRef.current) await processEpis();
      if (!stopRef.current) await processUniformes();
    } finally {
      setRunning(false);
      setStats(s => ({ ...s, current: stopRef.current ? "Parado pelo usuário" : "Concluído!" }));
      await loadCounts();
      toast.success(`Backup retroativo finalizado. ${stats.ok} ok, ${stats.erro} erros.`);
    }
  };

  const stop = () => {
    stopRef.current = true;
    toast.info("Parando após o item atual...");
  };

  const total = pending.holerites + pending.epis + pending.uniformes;
  const processed = stats.ok + stats.erro;
  const progress = stats.total > 0 ? Math.round((processed / stats.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Backup retroativo</CardTitle>
            <CardDescription>Envia para o Drive os holerites e recibos de EPI/Uniforme já registrados no sistema</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-amber-900 dark:text-amber-200">
            Mantenha esta aba aberta durante o processo. Documentos antigos serão regerados com o layout atual do sistema (não cópia fiel da época). Funcionários desligados também são processados.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground">Holerites pendentes</p>
              <p className="text-2xl font-bold">{pending.holerites}</p>
            </div>
            <div className="border rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground">Recibos EPI pendentes</p>
              <p className="text-2xl font-bold">{pending.epis}</p>
            </div>
            <div className="border rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground">Recibos Uniforme pendentes</p>
              <p className="text-2xl font-bold">{pending.uniformes}</p>
            </div>
          </div>
        )}

        {running && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{processed} de {stats.total} ({progress}%)</span>
              <span><Badge variant="outline" className="mr-1">{stats.ok} OK</Badge>{stats.erro > 0 && <Badge variant="destructive">{stats.erro} erros</Badge>}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">→ {stats.current}</p>
          </div>
        )}

        <div className="flex gap-2">
          {!running ? (
            <Button onClick={start} disabled={loading || total === 0}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar backup retroativo ({total})
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              <Square className="h-4 w-4 mr-2" />
              Parar
            </Button>
          )}
          <Button variant="outline" onClick={loadCounts} disabled={running || loading}>
            Atualizar contagem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
