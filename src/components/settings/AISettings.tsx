import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Brain, Eye, EyeOff, Save } from "lucide-react";

export function AISettings() {
  const [apiKey, setApiKey] = useState("");
  const [modelo, setModelo] = useState("gemini-2.0-flash");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("configuracoes_ia")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfigId(data.id);
      setApiKey(data.google_gemini_api_key || "");
      setModelo(data.modelo || "gemini-2.0-flash");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from("configuracoes_ia")
          .update({
            google_gemini_api_key: apiKey,
            modelo,
          })
          .eq("id", configId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("configuracoes_ia")
          .insert({
            google_gemini_api_key: apiKey,
            modelo,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
      }

      toast.success("Configurações de IA salvas com sucesso!");
    } catch (error) {
      console.error("Error saving AI config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const maskedKey = apiKey
    ? apiKey.substring(0, 6) + "•".repeat(Math.max(0, apiKey.length - 10)) + apiKey.substring(apiKey.length - 4)
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Configurações de IA (Google Gemini)
        </CardTitle>
        <CardDescription>
          Configure a chave de API do Google Gemini para as funcionalidades de inteligência artificial.
          Obtenha sua chave gratuita em{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            aistudio.google.com/apikey
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Chave de API do Google Gemini</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={showKey ? apiKey : maskedKey}
              onChange={(e) => {
                setShowKey(true);
                setApiKey(e.target.value);
              }}
              placeholder="AIzaSy..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="gemini-2.0-flash"
          />
          <p className="text-xs text-muted-foreground">
            Modelo padrão: gemini-2.0-flash (gratuito, rápido e capaz)
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
