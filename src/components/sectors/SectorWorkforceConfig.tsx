import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";

interface SectorConfig {
  setor_id: string;
  setor_nome: string;
  quantidade_media: number;
  quantidade_atual: number;
}

export function SectorWorkforceConfig() {
  const [sectors, setSectors] = useState<SectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSectorsConfig();
  }, []);

  const fetchSectorsConfig = async () => {
    setLoading(true);

    // Fetch all sectors
    const { data: setoresData } = await supabase
      .from("setores")
      .select("id, nome")
      .order("nome");

    if (!setoresData) {
      setLoading(false);
      return;
    }

    // Fetch configurations
    const { data: configData } = await supabase
      .from("configuracao_setor")
      .select("setor_id, quantidade_media");

    // Fetch current employee count per sector
    const { data: employeesData } = await supabase
      .from("employees")
      .select("setor")
      .eq("status", "ativo");

    // Count employees per sector
    const employeeCount: Record<string, number> = {};
    employeesData?.forEach((emp) => {
      if (emp.setor) {
        employeeCount[emp.setor] = (employeeCount[emp.setor] || 0) + 1;
      }
    });

    // Build configuration map
    const configMap: Record<string, number> = {};
    configData?.forEach((config) => {
      configMap[config.setor_id] = config.quantidade_media;
    });

    // Merge data
    const sectorsConfig: SectorConfig[] = setoresData.map((setor) => ({
      setor_id: setor.id,
      setor_nome: setor.nome,
      quantidade_media: configMap[setor.id] || 0,
      quantidade_atual: employeeCount[setor.nome] || 0,
    }));

    setSectors(sectorsConfig);
    setLoading(false);
  };

  const handleQuantityChange = (setorId: string, value: string) => {
    const quantidade = parseInt(value) || 0;
    setSectors((prev) =>
      prev.map((s) =>
        s.setor_id === setorId ? { ...s, quantidade_media: quantidade } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);

    for (const sector of sectors) {
      const { error } = await supabase
        .from("configuracao_setor")
        .upsert(
          {
            setor_id: sector.setor_id,
            quantidade_media: sector.quantidade_media,
          },
          { onConflict: 'setor_id' }
        );

      if (error) {
        toast.error(`Erro ao salvar configuração: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    toast.success("Configurações salvas com sucesso!");
    setSaving(false);
    fetchSectorsConfig();
  };

  const getStatus = (atual: number, media: number) => {
    if (media === 0) return { text: "-", color: "text-muted-foreground" };
    if (atual < media) return { text: "Abaixo", color: "text-destructive" };
    if (atual > media) return { text: "Acima", color: "text-warning" };
    return { text: "Adequado", color: "text-success" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Quantidade Média de Funcionários</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina a quantidade média esperada de funcionários por setor. O sistema
          emitirá alertas quando a quantidade estiver acima ou abaixo da média.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-center">Qtd. Atual</TableHead>
                  <TableHead className="text-center">Qtd. Média Esperada</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((sector) => {
                  const status = getStatus(
                    sector.quantidade_atual,
                    sector.quantidade_media
                  );
                  return (
                    <TableRow key={sector.setor_id}>
                      <TableCell className="font-medium">
                        {sector.setor_nome}
                      </TableCell>
                      <TableCell className="text-center">
                        {sector.quantidade_atual}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={sector.quantidade_media}
                          onChange={(e) =>
                            handleQuantityChange(sector.setor_id, e.target.value)
                          }
                          className="w-24 mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
