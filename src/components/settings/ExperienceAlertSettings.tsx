import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Config {
  id: string;
  ativo: boolean;
  dias_antecedencia: number;
  marcos_dias: number[];
}

export const ExperienceAlertSettings = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMarco, setNewMarco] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracao_alertas_experiencia")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching config:", error);
        return;
      }

      setConfig(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracao_alertas_experiencia")
        .update({
          ativo: config.ativo,
          dias_antecedencia: config.dias_antecedencia,
          marcos_dias: config.marcos_dias,
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const addMarco = () => {
    const dias = parseInt(newMarco);
    if (isNaN(dias) || dias <= 0) {
      toast.error("Digite um número válido de dias");
      return;
    }

    if (config?.marcos_dias.includes(dias)) {
      toast.error("Este marco já existe");
      return;
    }

    setConfig(prev => prev ? {
      ...prev,
      marcos_dias: [...prev.marcos_dias, dias].sort((a, b) => a - b)
    } : null);
    setNewMarco("");
  };

  const removeMarco = (dias: number) => {
    setConfig(prev => prev ? {
      ...prev,
      marcos_dias: prev.marcos_dias.filter(m => m !== dias)
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Erro ao carregar configurações
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Período de Experiência</CardTitle>
          <CardDescription>
            Configure os alertas de vencimento do período de experiência dos funcionários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas ativos</Label>
              <p className="text-sm text-muted-foreground">
                Exibir alertas de período de experiência no dashboard
              </p>
            </div>
            <Switch
              checked={config.ativo}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, ativo: checked } : null)}
            />
          </div>

          {/* Dias de antecedência */}
          <div className="space-y-2">
            <Label htmlFor="dias_antecedencia">Dias de antecedência para alerta</Label>
            <div className="flex items-center gap-2">
              <Input
                id="dias_antecedencia"
                type="number"
                min={1}
                max={30}
                value={config.dias_antecedencia}
                onChange={(e) => setConfig(prev => prev ? { 
                  ...prev, 
                  dias_antecedencia: parseInt(e.target.value) || 7 
                } : null)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                dias antes do vencimento
              </span>
            </div>
          </div>

          {/* Marcos de experiência */}
          <div className="space-y-3">
            <Label>Marcos de experiência (dias)</Label>
            <p className="text-sm text-muted-foreground">
              Defina em quais dias de experiência o sistema deve alertar
            </p>
            
            <div className="flex flex-wrap gap-2">
              {config.marcos_dias.map((dias) => (
                <Badge
                  key={dias}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 gap-1"
                >
                  {dias} dias
                  <button
                    onClick={() => removeMarco(dias)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                placeholder="Ex: 60"
                value={newMarco}
                onChange={(e) => setNewMarco(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMarco()}
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMarco}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
