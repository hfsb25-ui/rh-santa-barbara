import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Bell, Clock, Wallet, Calendar, GraduationCap, Shield, Shirt } from "lucide-react";

import { Plane } from "lucide-react";

interface VisibilitySettings {
  id: string;
  avisos_visivel: boolean;
  saldo_horas_visivel: boolean;
  banco_horas_visivel: boolean;
  folgas_visivel: boolean;
  treinamentos_visivel: boolean;
  epis_visivel: boolean;
  uniformes_visivel: boolean;
  ferias_visivel: boolean;
}

const settingsConfig = [
  { key: "avisos_visivel", label: "Avisos", description: "Exibir avisos/comunicados da empresa", icon: Bell },
  { key: "saldo_horas_visivel", label: "Saldo de Horas", description: "Exibir saldo de horas do mês anterior", icon: Clock },
  { key: "banco_horas_visivel", label: "Banco de Horas", description: "Exibir banco de horas acumulado", icon: Wallet },
  { key: "folgas_visivel", label: "Folgas Disponíveis", description: "Exibir quantidade de folgas na casa", icon: Calendar },
  { key: "ferias_visivel", label: "Progresso de Férias", description: "Exibir barra de progresso das férias", icon: Plane },
  { key: "treinamentos_visivel", label: "Treinamentos", description: "Exibir cursos e progresso de treinamento", icon: GraduationCap },
  { key: "epis_visivel", label: "EPIs Recebidos", description: "Exibir lista de EPIs entregues", icon: Shield },
  { key: "uniformes_visivel", label: "Uniformes Recebidos", description: "Exibir lista de uniformes entregues", icon: Shirt },
] as const;

export function DashboardVisibilitySettings() {
  const [settings, setSettings] = useState<VisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_dashboard_funcionario")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof VisibilitySettings, value: boolean) => {
    if (!settings) return;

    setSaving(key);
    try {
      const { error } = await supabase
        .from("configuracoes_dashboard_funcionario")
        .update({ [key]: value })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, [key]: value });
      toast.success("Configuração atualizada");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar configurações
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibilidade do Dashboard do Funcionário</CardTitle>
        <CardDescription>
          Ative ou desative as seções que os funcionários podem ver no dashboard deles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settingsConfig.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor={key} className="text-base font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving === key && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                id={key}
                checked={settings[key as keyof VisibilitySettings] as boolean}
                onCheckedChange={(checked) => handleToggle(key as keyof VisibilitySettings, checked)}
                disabled={saving !== null}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
