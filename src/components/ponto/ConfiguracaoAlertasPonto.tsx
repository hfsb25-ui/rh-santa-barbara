import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Config = {
  id: string;
  intervalo_min_minutos: number;
  intervalo_max_minutos: number;
  tolerancia_atraso_minutos: number;
  tolerancia_saida_minutos: number;
  hora_entrada_padrao: string;
  hora_saida_padrao: string;
  banco_horas_min: number;
  banco_horas_max: number;
  ocorrencias_minimas: number;
  janela_dias: number;
  alerta_intervalo_curto_ativo: boolean;

  alerta_intervalo_longo_ativo: boolean;
  alerta_atraso_ativo: boolean;
  alerta_saida_antecipada_ativo: boolean;
  alerta_banco_horas_ativo: boolean;
};

export function ConfiguracaoAlertasPonto() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracao_alertas_ponto")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) toast.error("Erro ao carregar configuração");
      if (data) setConfig(data as Config);
      setLoading(false);
    })();
  }, []);

  const updateField = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("configuracao_alertas_ponto")
      .update({
        intervalo_min_minutos: config.intervalo_min_minutos,
        intervalo_max_minutos: config.intervalo_max_minutos,
        tolerancia_atraso_minutos: config.tolerancia_atraso_minutos,
        tolerancia_saida_minutos: config.tolerancia_saida_minutos,
        banco_horas_min: config.banco_horas_min,
        banco_horas_max: config.banco_horas_max,
        ocorrencias_minimas: config.ocorrencias_minimas,
        janela_dias: config.janela_dias,
        alerta_intervalo_curto_ativo: config.alerta_intervalo_curto_ativo,
        alerta_intervalo_longo_ativo: config.alerta_intervalo_longo_ativo,
        alerta_atraso_ativo: config.alerta_atraso_ativo,
        alerta_saida_antecipada_ativo: config.alerta_saida_antecipada_ativo,
        alerta_banco_horas_ativo: config.alerta_banco_horas_ativo,
        hora_entrada_padrao: config.hora_entrada_padrao,
        hora_saida_padrao: config.hora_saida_padrao,

      })
      .eq("id", config.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração salva!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!config) return <p className="text-muted-foreground">Configuração não encontrada.</p>;

  const Row = ({
    label,
    checked,
    onCheck,
    children,
  }: {
    label: string;
    checked: boolean;
    onCheck: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          <Switch checked={checked} onCheckedChange={onCheck} />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Janela de análise (dias)</Label>
          <Input
            type="number"
            min={1}
            value={config.janela_dias}
            onChange={(e) => updateField("janela_dias", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Mínimo de ocorrências p/ alerta</Label>
          <Input
            type="number"
            min={1}
            value={config.ocorrencias_minimas}
            onChange={(e) => updateField("ocorrencias_minimas", Number(e.target.value))}
          />
        </div>
      </div>

      <Row
        label="Intervalo abaixo do mínimo"
        checked={config.alerta_intervalo_curto_ativo}
        onCheck={(v) => updateField("alerta_intervalo_curto_ativo", v)}
      >
        <div className="space-y-2">
          <Label>Intervalo mínimo (minutos)</Label>
          <Input
            type="number"
            min={0}
            value={config.intervalo_min_minutos}
            onChange={(e) => updateField("intervalo_min_minutos", Number(e.target.value))}
          />
        </div>
      </Row>

      <Row
        label="Intervalo acima do máximo"
        checked={config.alerta_intervalo_longo_ativo}
        onCheck={(v) => updateField("alerta_intervalo_longo_ativo", v)}
      >
        <div className="space-y-2">
          <Label>Intervalo máximo (minutos)</Label>
          <Input
            type="number"
            min={0}
            value={config.intervalo_max_minutos}
            onChange={(e) => updateField("intervalo_max_minutos", Number(e.target.value))}
          />
        </div>
      </Row>

      <Row
        label="Atraso recorrente na entrada"
        checked={config.alerta_atraso_ativo}
        onCheck={(v) => updateField("alerta_atraso_ativo", v)}
      >
        <div className="space-y-2">
          <Label>Tolerância de atraso (minutos)</Label>
          <Input
            type="number"
            min={0}
            value={config.tolerancia_atraso_minutos}
            onChange={(e) => updateField("tolerancia_atraso_minutos", Number(e.target.value))}
          />
        </div>
      </Row>

      <Row
        label="Saída antecipada recorrente"
        checked={config.alerta_saida_antecipada_ativo}
        onCheck={(v) => updateField("alerta_saida_antecipada_ativo", v)}
      >
        <div className="space-y-2">
          <Label>Tolerância de saída (minutos)</Label>
          <Input
            type="number"
            min={0}
            value={config.tolerancia_saida_minutos}
            onChange={(e) => updateField("tolerancia_saida_minutos", Number(e.target.value))}
          />
        </div>
      </Row>

      <Row
        label="Banco de horas fora da faixa"
        checked={config.alerta_banco_horas_ativo}
        onCheck={(v) => updateField("alerta_banco_horas_ativo", v)}
      >
        <div className="space-y-2">
          <Label>Saldo mínimo aceitável (horas)</Label>
          <Input
            type="number"
            step="0.5"
            value={config.banco_horas_min}
            onChange={(e) => updateField("banco_horas_min", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Saldo máximo aceitável (horas)</Label>
          <Input
            type="number"
            step="0.5"
            value={config.banco_horas_max}
            onChange={(e) => updateField("banco_horas_max", Number(e.target.value))}
          />
        </div>
      </Row>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar configuração
        </Button>
      </div>
    </div>
  );
}
