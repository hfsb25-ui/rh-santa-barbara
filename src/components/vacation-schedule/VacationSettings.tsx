import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertTriangle, Users, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface VacationConfig {
  maxEmployeesPerSector: number;
  alertDaysBeforeExpiry: number;
  minAdvanceDays: number;
  enableConflictAlerts: boolean;
  enableExpiryAlerts: boolean;
  blockedPeriods: string[];
}

export function VacationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<VacationConfig>({
    maxEmployeesPerSector: 2,
    alertDaysBeforeExpiry: 90,
    minAdvanceDays: 30,
    enableConflictAlerts: true,
    enableExpiryAlerts: true,
    blockedPeriods: [],
  });
  const [newBlockedStart, setNewBlockedStart] = useState("");
  const [newBlockedEnd, setNewBlockedEnd] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("configuracoes_ferias")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setConfig({
        maxEmployeesPerSector: data.percentual_maximo_ausencia || 2,
        alertDaysBeforeExpiry: 90,
        minAdvanceDays: data.cobertura_minima || 30,
        enableConflictAlerts: true,
        enableExpiryAlerts: true,
        blockedPeriods: [],
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("configuracoes_ferias")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("configuracoes_ferias")
          .update({
            percentual_maximo_ausencia: config.maxEmployeesPerSector,
            cobertura_minima: config.minAdvanceDays,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("configuracoes_ferias")
          .insert({
            percentual_maximo_ausencia: config.maxEmployeesPerSector,
            cobertura_minima: config.minAdvanceDays,
          });
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações de férias foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const addBlockedPeriod = () => {
    if (newBlockedStart && newBlockedEnd) {
      setConfig({
        ...config,
        blockedPeriods: [...config.blockedPeriods, `${newBlockedStart} a ${newBlockedEnd}`],
      });
      setNewBlockedStart("");
      setNewBlockedEnd("");
    }
  };

  const removeBlockedPeriod = (index: number) => {
    const newPeriods = [...config.blockedPeriods];
    newPeriods.splice(index, 1);
    setConfig({ ...config, blockedPeriods: newPeriods });
  };

  return (
    <div className="space-y-6">
      {/* Configurações de Conflitos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configurações de Conflitos</CardTitle>
              <CardDescription>
                Defina as regras para detecção de conflitos entre férias
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de Conflito</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando houver conflitos de férias
                </p>
              </div>
              <Switch
                checked={config.enableConflictAlerts}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enableConflictAlerts: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Máximo de funcionários por setor em férias simultâneas</Label>
                <span className="text-2xl font-bold text-primary">{config.maxEmployeesPerSector}</span>
              </div>
              <Slider
                value={[config.maxEmployeesPerSector]}
                onValueChange={(value) =>
                  setConfig({ ...config, maxEmployeesPerSector: value[0] })
                }
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Um alerta será exibido quando mais de {config.maxEmployeesPerSector} funcionários 
                do mesmo setor estiverem de férias ao mesmo tempo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Alertas de Vencimento</CardTitle>
              <CardDescription>
                Configure os alertas para férias próximas a vencer
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Vencimento</Label>
              <p className="text-sm text-muted-foreground">
                Notificar sobre férias próximas ao vencimento
              </p>
            </div>
            <Switch
              checked={config.enableExpiryAlerts}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableExpiryAlerts: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Dias de antecedência para alertas</Label>
              <span className="text-2xl font-bold text-amber-500">{config.alertDaysBeforeExpiry}</span>
            </div>
            <Slider
              value={[config.alertDaysBeforeExpiry]}
              onValueChange={(value) =>
                setConfig({ ...config, alertDaysBeforeExpiry: value[0] })
              }
              min={30}
              max={180}
              step={15}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Alertar quando faltar {config.alertDaysBeforeExpiry} dias para o vencimento do período aquisitivo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regras de Solicitação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle>Regras de Solicitação</CardTitle>
              <CardDescription>
                Defina as regras para solicitação de férias
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAdvance">Antecedência mínima (dias)</Label>
              <Input
                id="minAdvance"
                type="number"
                value={config.minAdvanceDays}
                onChange={(e) =>
                  setConfig({ ...config, minAdvanceDays: parseInt(e.target.value) || 0 })
                }
                min={0}
                max={90}
              />
              <p className="text-xs text-muted-foreground">
                Dias mínimos de antecedência para solicitar férias
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Períodos Bloqueados</Label>
            <p className="text-sm text-muted-foreground">
              Períodos em que não é permitido solicitar férias
            </p>

            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={newBlockedStart}
                  onChange={(e) => setNewBlockedStart(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={newBlockedEnd}
                  onChange={(e) => setNewBlockedEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addBlockedPeriod} variant="outline" size="sm">
                  Adicionar
                </Button>
              </div>
            </div>

            {config.blockedPeriods.length > 0 && (
              <div className="space-y-2">
                {config.blockedPeriods.map((period, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{period}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlockedPeriod(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
