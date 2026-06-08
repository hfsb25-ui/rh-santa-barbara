import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, PlayCircle, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcularHoleriteDiferenca,
  carregarConfigDiferenca,
  persistirHoleriteDiferenca,
  type CalculoDiferenca,
  type ConfigDiferenca,
} from "@/lib/holeriteDiferencaCalc";
import { ConfigHoleriteDiferenca } from "./ConfigHoleriteDiferenca";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  empresaId: string;
  mes: number;
  ano: number;
}

interface LinhaPrev {
  employee_id: string;
  nome: string;
  cargo: string;
  calculo: CalculoDiferenca | null;
  jaExiste: boolean;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HoleriteDiferencaLoteTab({ empresaId, mes, ano }: Props) {
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<LinhaPrev[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<ConfigDiferenca>({ variaveis_desconto_ids: [], incluir_liquido_holerite: false });
  const [executando, setExecutando] = useState(false);

  const carregar = async () => {
    if (!empresaId || empresaId === "all") {
      setLinhas([]);
      return;
    }
    setLoading(true);
    try {
      const cfg = await carregarConfigDiferenca();
      setConfig(cfg);
      const ids = cfg.variaveis_desconto_ids;

      // Buscar funcionários da empresa que têm holerite normal no mês
      const { data: folhas } = await supabase
        .from("folha_pagamento")
        .select("employee_id, employees(id, nome_completo, cargo)")
        .eq("empresa_id", empresaId)
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("tipo_folha", "salario");

      const empIds = Array.from(
        new Set((folhas || []).map((f: any) => f.employee_id).filter(Boolean))
      );

      // Verificar quais já têm diferença
      const { data: existentes } = await supabase
        .from("folha_pagamento")
        .select("employee_id")
        .eq("empresa_id", empresaId)
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("tipo_folha", "diferenca");
      const jaTem = new Set((existentes || []).map((e: any) => e.employee_id));

      // Calcular cada um
      const resultados: LinhaPrev[] = [];
      for (const f of folhas || []) {
        const emp: any = (f as any).employees;
        if (!emp) continue;
        const calc = await calcularHoleriteDiferenca(emp.id, mes, ano, cfg);
        resultados.push({
          employee_id: emp.id,
          nome: emp.nome_completo,
          cargo: emp.cargo,
          calculo: calc,
          jaExiste: jaTem.has(emp.id),
        });
      }
      resultados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setLinhas(resultados);

      // Pré-selecionar quem ainda não tem e tem diferença positiva
      const pre = new Set<string>();
      resultados.forEach((r) => {
        if (!r.jaExiste && r.calculo && r.calculo.diferenca > 0) pre.add(r.employee_id);
      });
      setSelected(pre);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, mes, ano]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const elegiveis = linhas
      .filter((l) => l.calculo && l.calculo.diferenca > 0)
      .map((l) => l.employee_id);
    if (selected.size === elegiveis.length) setSelected(new Set());
    else setSelected(new Set(elegiveis));
  };

  const totalSelecionado = useMemo(() => {
    return linhas
      .filter((l) => selected.has(l.employee_id))
      .reduce((s, l) => s + (l.calculo?.diferenca || 0), 0);
  }, [linhas, selected]);

  const executar = async () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um funcionário");
      return;
    }
    setExecutando(true);
    let ok = 0;
    let err = 0;
    for (const linha of linhas) {
      if (!selected.has(linha.employee_id)) continue;
      if (!linha.calculo || linha.calculo.diferenca <= 0) continue;
      try {
        await persistirHoleriteDiferenca({
          employeeId: linha.employee_id,
          empresaId,
          mes,
          ano,
          calculo: linha.calculo,
        });
        ok++;
      } catch (e) {
        console.error(e);
        err++;
      }
    }
    setExecutando(false);
    if (ok > 0) toast.success(`${ok} holerite(s) diferença gerado(s)!`);
    if (err > 0) toast.error(`${err} erro(s) ao gerar`);
    carregar();
  };

  if (!empresaId || empresaId === "all") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Selecione uma empresa específica para gerar holerites diferença.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="gerar" className="space-y-4">
      <TabsList>
        <TabsTrigger value="gerar">
          <PlayCircle className="w-4 h-4 mr-2" /> Gerar em Lote
        </TabsTrigger>
        <TabsTrigger value="config">
          <SettingsIcon className="w-4 h-4 mr-2" /> Configuração
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gerar">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Holerite Diferença — {mes.toString().padStart(2, "0")}/{ano}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Recarregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.variaveis_desconto_ids.length === 0 && !config.incluir_liquido_holerite && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                Nenhuma variável configurada. Vá para a aba <strong>Configuração</strong> e selecione as
                variáveis de desconto (ou ative o uso do valor líquido).
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : linhas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum funcionário com holerite normal lançado neste mês.
              </p>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selected.size > 0 &&
                              selected.size ===
                                linhas.filter((l) => l.calculo && l.calculo.diferenca > 0).length
                            }
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Funcionário</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Descontos</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => {
                        const elegivel = l.calculo && l.calculo.diferenca > 0;
                        return (
                          <TableRow key={l.employee_id}>
                            <TableCell>
                              <Checkbox
                                checked={selected.has(l.employee_id)}
                                disabled={!elegivel}
                                onCheckedChange={() => toggle(l.employee_id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{l.nome.toUpperCase()}</div>
                              <div className="text-xs text-muted-foreground">{l.cargo}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {fmt(l.calculo?.base || 0)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              R$ {fmt(l.calculo?.total_descontos || 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {fmt(l.calculo?.diferenca || 0)}
                            </TableCell>
                            <TableCell>
                              {l.jaExiste ? (
                                <Badge variant="secondary">Já gerado</Badge>
                              ) : !l.calculo ? (
                                <Badge variant="outline">Sem salário</Badge>
                              ) : l.calculo.diferenca <= 0 ? (
                                <Badge variant="outline">Sem saldo</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Pronto
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-muted-foreground">
                    {selected.size} selecionado(s) — Total:{" "}
                    <strong className="text-foreground">R$ {fmt(totalSelecionado)}</strong>
                  </div>
                  <Button onClick={executar} disabled={executando || selected.size === 0}>
                    {executando ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4 mr-2" />
                    )}
                    Gerar {selected.size > 0 ? `(${selected.size})` : ""}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="config">
        <ConfigHoleriteDiferenca />
      </TabsContent>
    </Tabs>
  );
}
