import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { VariacaoFuncionario } from "./hooks/useFinanceiroData";

interface AnaliseVariacoesProps {
  data: VariacaoFuncionario[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function AnaliseVariacoes({ data }: AnaliseVariacoesProps) {
  const alertas = data.filter(v => Math.abs(v.percentual) > 10);
  const aumentos = data.filter(v => v.percentual > 0).sort((a, b) => b.percentual - a.percentual);
  const reducoes = data.filter(v => v.percentual < 0).sort((a, b) => a.percentual - b.percentual);

  const maiorAumento = aumentos[0];
  const maiorReducao = reducoes[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Análise de Variações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alertas */}
        {alertas.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Variações Significativas Detectadas</AlertTitle>
            <AlertDescription>
              {alertas.length} funcionário(s) com variação superior a 10% no último mês
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de destaque */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Maior Aumento */}
          <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Maior Aumento</span>
            </div>
            {maiorAumento ? (
              <>
                <p className="font-semibold text-lg truncate" title={maiorAumento.nome}>
                  {maiorAumento.nome}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(maiorAumento.valorAnterior)} → {formatCurrency(maiorAumento.valorAtual)}
                  </span>
                  <Badge variant="destructive">
                    +{maiorAumento.percentual.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-destructive mt-1">
                  +{formatCurrency(maiorAumento.diferenca)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum aumento registrado</p>
            )}
          </div>

          {/* Maior Redução */}
          <div className="p-4 rounded-lg border bg-secondary/5 border-secondary/20">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Maior Redução</span>
            </div>
            {maiorReducao ? (
              <>
                <p className="font-semibold text-lg truncate" title={maiorReducao.nome}>
                  {maiorReducao.nome}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(maiorReducao.valorAnterior)} → {formatCurrency(maiorReducao.valorAtual)}
                  </span>
                  <Badge className="bg-secondary text-secondary-foreground">
                    {maiorReducao.percentual.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-secondary mt-1">
                  {formatCurrency(maiorReducao.diferenca)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma redução registrada</p>
            )}
          </div>
        </div>

        {/* Lista de variações */}
        {data.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-auto">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide p-2 bg-muted/50 rounded-lg sticky top-0">
              <span className="col-span-4">Funcionário</span>
              <span className="col-span-2 text-right">Anterior</span>
              <span className="col-span-2 text-right">Atual</span>
              <span className="col-span-2 text-right">Diferença</span>
              <span className="col-span-2 text-right">%</span>
            </div>
            {data.slice(0, 20).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-muted/30 transition-colors text-sm"
              >
                <span className="col-span-4 font-medium truncate" title={item.nome}>
                  {item.nome}
                </span>
                <span className="col-span-2 text-right text-muted-foreground">
                  {formatCurrency(item.valorAnterior)}
                </span>
                <span className="col-span-2 text-right font-medium">
                  {formatCurrency(item.valorAtual)}
                </span>
                <span className={`col-span-2 text-right ${item.diferenca >= 0 ? 'text-destructive' : 'text-secondary'}`}>
                  {item.diferenca >= 0 ? '+' : ''}{formatCurrency(item.diferenca)}
                </span>
                <div className="col-span-2 flex justify-end">
                  {item.percentual > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{item.percentual.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge className="bg-secondary text-secondary-foreground text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {item.percentual.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma variação significativa detectada no período
          </p>
        )}
      </CardContent>
    </Card>
  );
}
