import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Clock, Coffee, LogOut, Wallet } from "lucide-react";

type Registro = {
  employee_id: string;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  hora_inicio_intervalo: string | null;
  hora_fim_intervalo: string | null;
};
type Config = any;

function timeToMin(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function AlertasPonto() {
  const { data: config, isLoading: lc } = useQuery({
    queryKey: ["alertas-ponto-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_alertas_ponto")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Config;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["alertas-ponto-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor")
        .in("status", ["ativo", "ferias"]);
      if (error) throw error;
      return data;
    },
  });

  const { data: configHoras } = useQuery({
    queryKey: ["alertas-ponto-config-horas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_horas_trabalho")
        .select("employee_id, hora_entrada_prevista, hora_saida_prevista");
      if (error) throw error;
      return data;
    },
  });

  const janela = config?.janela_dias ?? 30;
  const { data: registros, isLoading: lr } = useQuery({
    queryKey: ["alertas-ponto-registros", janela],
    enabled: !!config,
    queryFn: async () => {
      const desde = new Date();
      desde.setDate(desde.getDate() - janela);
      const desdeStr = desde.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("employee_id, data, hora_entrada, hora_saida, hora_inicio_intervalo, hora_fim_intervalo")
        .gte("data", desdeStr);
      if (error) throw error;
      return data as Registro[];
    },
  });

  const { data: bancoHoras } = useQuery({
    queryKey: ["alertas-ponto-banco"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banco_horas").select("employee_id, saldo_horas");
      if (error) throw error;
      return data;
    },
  });

  const alertas = useMemo(() => {
    if (!config || !employees || !registros) return null;

    const empMap = new Map(employees.map((e: any) => [e.id, e]));
    const horasMap = new Map(
      (configHoras || []).map((c: any) => [c.employee_id, c])
    );

    type Item = { employee_id: string; nome: string; cargo: string; setor: string; ocorrencias: number; detalhe?: string };
    const intervaloCurto: Map<string, number> = new Map();
    const intervaloLongo: Map<string, number> = new Map();
    const atrasos: Map<string, number> = new Map();
    const saidasAnt: Map<string, number> = new Map();

    for (const r of registros) {
      const ini = timeToMin(r.hora_inicio_intervalo);
      const fim = timeToMin(r.hora_fim_intervalo);
      if (ini !== null && fim !== null && fim > ini) {
        const dur = fim - ini;
        if (dur < config.intervalo_min_minutos)
          intervaloCurto.set(r.employee_id, (intervaloCurto.get(r.employee_id) || 0) + 1);
        if (dur > config.intervalo_max_minutos)
          intervaloLongo.set(r.employee_id, (intervaloLongo.get(r.employee_id) || 0) + 1);
      }

      const ch: any = horasMap.get(r.employee_id);
      const entradaPrev = timeToMin(ch?.hora_entrada_prevista ?? "08:00:00");
      const saidaPrev = timeToMin(ch?.hora_saida_prevista ?? "17:00:00");
      const entrada = timeToMin(r.hora_entrada);
      const saida = timeToMin(r.hora_saida);

      if (entrada !== null && entradaPrev !== null && entrada > entradaPrev + config.tolerancia_atraso_minutos)
        atrasos.set(r.employee_id, (atrasos.get(r.employee_id) || 0) + 1);

      if (saida !== null && saidaPrev !== null && saida < saidaPrev - config.tolerancia_saida_minutos)
        saidasAnt.set(r.employee_id, (saidasAnt.get(r.employee_id) || 0) + 1);
    }

    const buildList = (m: Map<string, number>): Item[] => {
      const items: Item[] = [];
      m.forEach((n, id) => {
        if (n >= config.ocorrencias_minimas) {
          const e: any = empMap.get(id);
          if (e)
            items.push({
              employee_id: id,
              nome: (e.nome_completo || "").toUpperCase(),
              cargo: e.cargo,
              setor: e.setor,
              ocorrencias: n,
            });
        }
      });
      return items.sort((a, b) => b.ocorrencias - a.ocorrencias);
    };

    const bancoItems: Item[] = [];
    if (config.alerta_banco_horas_ativo && bancoHoras) {
      for (const b of bancoHoras as any[]) {
        const saldo = Number(b.saldo_horas);
        if (saldo < config.banco_horas_min || saldo > config.banco_horas_max) {
          const e: any = empMap.get(b.employee_id);
          if (e)
            bancoItems.push({
              employee_id: b.employee_id,
              nome: (e.nome_completo || "").toUpperCase(),
              cargo: e.cargo,
              setor: e.setor,
              ocorrencias: 1,
              detalhe: `Saldo: ${saldo.toFixed(2)}h`,
            });
        }
      }
      bancoItems.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return {
      intervaloCurto: config.alerta_intervalo_curto_ativo ? buildList(intervaloCurto) : [],
      intervaloLongo: config.alerta_intervalo_longo_ativo ? buildList(intervaloLongo) : [],
      atrasos: config.alerta_atraso_ativo ? buildList(atrasos) : [],
      saidasAnt: config.alerta_saida_antecipada_ativo ? buildList(saidasAnt) : [],
      banco: bancoItems,
    };
  }, [config, employees, registros, configHoras, bancoHoras]);

  if (lc || lr || !alertas) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const total =
    alertas.intervaloCurto.length +
    alertas.intervaloLongo.length +
    alertas.atrasos.length +
    alertas.saidasAnt.length +
    alertas.banco.length;

  const Section = ({
    title,
    icon: Icon,
    items,
    description,
    variant = "default",
  }: {
    title: string;
    icon: any;
    items: any[];
    description: string;
    variant?: "default" | "destructive";
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </span>
          <Badge variant={items.length > 0 ? "destructive" : "secondary"}>{items.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ocorrência.</p>
        ) : (
          items.map((it) => (
            <Alert key={it.employee_id} variant={variant}>
              <AlertTitle className="font-bold">{it.nome}</AlertTitle>
              <AlertDescription className="text-xs">
                {it.cargo} · {it.setor} —{" "}
                {it.detalhe || `${it.ocorrencias} ocorrência(s) nos últimos ${config.janela_dias} dias`}
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>
          {total === 0 ? "Tudo em ordem" : `${total} alerta(s) detectado(s)`}
        </AlertTitle>
        <AlertDescription>
          Análise dos últimos {config.janela_dias} dias · Recorrência ≥ {config.ocorrencias_minimas}{" "}
          ocorrências.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title="Intervalo curto recorrente"
          icon={Coffee}
          items={alertas.intervaloCurto}
          description={`Intervalo abaixo de ${config.intervalo_min_minutos} min`}
          variant="destructive"
        />
        <Section
          title="Intervalo longo recorrente"
          icon={Coffee}
          items={alertas.intervaloLongo}
          description={`Intervalo acima de ${config.intervalo_max_minutos} min`}
        />
        <Section
          title="Atraso recorrente"
          icon={Clock}
          items={alertas.atrasos}
          description={`Entrada após o previsto + ${config.tolerancia_atraso_minutos} min`}
          variant="destructive"
        />
        <Section
          title="Saída antecipada recorrente"
          icon={LogOut}
          items={alertas.saidasAnt}
          description={`Saída antes do previsto − ${config.tolerancia_saida_minutos} min`}
        />
        <Section
          title="Banco de horas fora da faixa"
          icon={Wallet}
          items={alertas.banco}
          description={`Faixa aceitável: ${config.banco_horas_min}h a ${config.banco_horas_max}h`}
          variant="destructive"
        />
      </div>
    </div>
  );
}
