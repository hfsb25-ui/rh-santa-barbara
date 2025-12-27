import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Percent, 
  LineChart 
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
  const cards = [
    {
      title: "Custo Total",
      value: formatCurrency(kpis.custoTotal),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Variação Mensal",
      value: `${kpis.variacaoMensal >= 0 ? "+" : ""}${kpis.variacaoMensal.toFixed(1)}%`,
      icon: kpis.variacaoMensal >= 0 ? TrendingUp : TrendingDown,
      color: kpis.variacaoMensal >= 0 ? "text-destructive" : "text-secondary",
      bgColor: kpis.variacaoMensal >= 0 ? "bg-destructive/10" : "bg-secondary/10",
      subtitle: kpis.variacaoMensal >= 0 ? "Aumento vs mês anterior" : "Redução vs mês anterior",
    },
    {
      title: "Custo Médio/Funcionário",
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
      title: "% Descontos",
      value: `${kpis.percentualDescontos.toFixed(1)}%`,
      icon: Percent,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      subtitle: "Sobre valor bruto",
    },
    {
      title: "Projeção Próximo Mês",
      value: formatCurrency(kpis.projecaoProximoMes),
      icon: LineChart,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      subtitle: "Baseado em tendência",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => (
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
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
