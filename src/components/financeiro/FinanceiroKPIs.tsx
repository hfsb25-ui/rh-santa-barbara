import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Percent,
  LineChart,
  Wallet,
  Landmark,
  Receipt,
  FileText,
  FileDiff,
} from "lucide-react";
import type { KPIsData } from "./hooks/useFinanceiroData";

interface FinanceiroKPIsProps {
  kpis: KPIsData;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function FinanceiroKPIs({ kpis }: FinanceiroKPIsProps) {
  const financeiros = [
    {
      title: "Valor Bruto",
      value: formatCurrency(kpis.totalBruto),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      subtitle: "Soma dos proventos do período",
    },
    {
      title: "INSS",
      value: formatCurrency(kpis.totalInss),
      icon: Landmark,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      subtitle: "Total descontado",
    },
    {
      title: "FGTS",
      value: formatCurrency(kpis.totalFgts),
      icon: Receipt,
      color: "text-sky-600",
      bgColor: "bg-sky-500/10",
      subtitle: "Encargo da empresa",
    },
    {
      title: "IRRF",
      value: formatCurrency(kpis.totalIrrf),
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      subtitle: "Imposto de renda",
    },
    {
      title: "Valor Líquido",
      value: formatCurrency(kpis.totalLiquido),
      icon: Wallet,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
      subtitle: "Pago aos funcionários",
    },
  ];

  const recibos = [
    {
      title: "Holerite Principal",
      value: formatCurrency(kpis.totalPrincipal),
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      subtitle: `${kpis.quantidadePrincipal} recibo(s)`,
    },
    {
      title: "Holerite Diferença",
      value: formatCurrency(kpis.totalDiferenca),
      icon: FileDiff,
      color: "text-rose-600",
      bgColor: "bg-rose-500/10",
      subtitle: `${kpis.quantidadeDiferenca} recibo(s)`,
    },
  ];

  const operacionais = [
    {
      title: "Variação Mensal",
      value: `${kpis.variacaoMensal >= 0 ? "+" : ""}${kpis.variacaoMensal.toFixed(1)}%`,
      icon: kpis.variacaoMensal >= 0 ? TrendingUp : TrendingDown,
      color: kpis.variacaoMensal >= 0 ? "text-destructive" : "text-secondary",
      bgColor: kpis.variacaoMensal >= 0 ? "bg-destructive/10" : "bg-secondary/10",
      subtitle: "Bruto vs mês anterior",
    },
    {
      title: "Custo Médio/Func.",
      value: formatCurrency(kpis.custoMedioFuncionario),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      subtitle: `${kpis.totalFuncionarios} funcionários`,
    },
    {
      title: "Custo Médio/Setor",
      value: formatCurrency(kpis.custoMedioPorSetor),
      icon: Building2,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      subtitle: `${kpis.totalSetores} setores`,
    },
    {
      title: "Projeção Próx. Mês",
      value: formatCurrency(kpis.projecaoProximoMes),
      icon: LineChart,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      subtitle: "Baseado em tendência",
    },
  ];

  const renderCard = (card: typeof financeiros[number]) => (
    <Card key={card.title} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {card.title}
          </span>
          <div className={`p-2 rounded-full ${card.bgColor}`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
        </div>
        <p className={`text-lg sm:text-xl font-bold ${card.color}`}>{card.value}</p>
        {card.subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Variáveis de Pagamento
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {financeiros.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Recibos Emitidos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recibos.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Indicadores Operacionais
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {operacionais.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
