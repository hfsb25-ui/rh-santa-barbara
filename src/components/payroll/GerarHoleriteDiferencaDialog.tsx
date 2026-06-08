import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  calcularHoleriteDiferenca,
  carregarConfigDiferenca,
  existeHoleriteDiferenca,
  persistirHoleriteDiferenca,
  type CalculoDiferenca,
} from "@/lib/holeriteDiferencaCalc";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeId: string;
  employeeNome: string;
  empresaId: string;
  mes: number;
  ano: number;
  onSuccess?: () => void;
}

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GerarHoleriteDiferencaDialog({
  open,
  onOpenChange,
  employeeId,
  employeeNome,
  empresaId,
  mes,
  ano,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculo, setCalculo] = useState<CalculoDiferenca | null>(null);
  const [jaExiste, setJaExiste] = useState(false);
  const [configVazia, setConfigVazia] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const cfg = await carregarConfigDiferenca();
        if (!cfg.variaveis_desconto_ids.length && !cfg.incluir_liquido_holerite) {
          setConfigVazia(true);
          setCalculo(null);
          return;
        }
        setConfigVazia(false);
        const [calc, exists] = await Promise.all([
          calcularHoleriteDiferenca(employeeId, mes, ano, cfg),
          existeHoleriteDiferenca(employeeId, mes, ano),
        ]);
        setCalculo(calc);
        setJaExiste(exists);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, employeeId, mes, ano]);

  const handleGerar = async () => {
    if (!calculo) return;
    if (calculo.diferenca <= 0) {
      toast.error("Diferença é zero ou negativa — não há valor a pagar.");
      return;
    }
    setSaving(true);
    try {
      await persistirHoleriteDiferenca({
        employeeId,
        empresaId,
        mes,
        ano,
        calculo,
        observacoes: observacoes.trim() || null,
      });
      toast.success("Holerite diferença gerado!");
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Holerite Diferença — {MESES[mes]}/{ano}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Funcionário: </span>
            <strong>{employeeNome.toUpperCase()}</strong>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Calculando...</p>
          ) : configVazia ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <span>
                A configuração do Holerite Diferença está vazia. Vá em{" "}
                <strong>Folha → Holerite Diferença → Configuração</strong> e selecione as variáveis
                de desconto.
              </span>
            </div>
          ) : !calculo ? (
            <p className="text-sm text-destructive">
              Funcionário sem salário cadastrado.
            </p>
          ) : (
            <>
              {jaExiste && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <span>Já existe um holerite diferença neste mês. Confirmar substituirá o registro anterior.</span>
                </div>
              )}

              <div className="rounded-md border divide-y">
                <div className="flex justify-between p-3 bg-muted/30">
                  <span className="font-medium">Salário base</span>
                  <span className="font-semibold">R$ {fmt(calculo.base)}</span>
                </div>
                {calculo.descontos.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Nenhuma variável configurada foi encontrada no holerite normal deste mês.
                  </div>
                ) : (
                  calculo.descontos.map((d) => (
                    <div
                      key={d.variavel_id}
                      className="flex justify-between p-3 text-sm"
                    >
                      <span>
                        {d.codigo && <span className="text-muted-foreground mr-2">{d.codigo}</span>}
                        {d.nome}
                      </span>
                      <span className="text-red-600 font-medium">
                        − R$ {fmt(d.valor)}
                      </span>
                    </div>
                  ))
                )}
                <div className="flex justify-between p-3 bg-muted/30 text-sm">
                  <span>Total descontos</span>
                  <span className="font-semibold text-red-600">
                    R$ {fmt(calculo.total_descontos)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10">
                  <span className="font-semibold">Diferença a pagar</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {fmt(calculo.diferenca)}
                  </span>
                </div>
              </div>

              {calculo.diferenca <= 0 && (
                <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>
                    Diferença é zero ou negativa — não há valor a pagar e o holerite não pode ser gerado.
                  </span>
                </div>
              )}

              <div>
                <Label htmlFor="obs">Observações (opcional)</Label>
                <Textarea
                  id="obs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Pagamento referente à diferença salarial..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={saving || loading || configVazia || !calculo || calculo.diferenca <= 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {saving ? "Gerando..." : jaExiste ? "Substituir" : "Gerar Holerite Diferença"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
