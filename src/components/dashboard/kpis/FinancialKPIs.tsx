import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface FinancialKPIsProps {
  totalPayroll: number;
  averageSalary: number;
  monthlyChange: number;
  previousPayroll: number;
}

const FinancialKPIs = ({ totalPayroll, averageSalary, monthlyChange, previousPayroll }: FinancialKPIsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Folha Total</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalPayroll)}
              </h3>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Salário Médio</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(averageSalary)}
              </h3>
            </div>
            <Wallet className="w-8 h-8 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Variação</p>
              <h3 className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </h3>
            </div>
            {monthlyChange >= 0 ? (
              <TrendingUp className="w-8 h-8 text-secondary" />
            ) : (
              <TrendingDown className="w-8 h-8 text-destructive" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mês Anterior</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(previousPayroll)}
              </h3>
            </div>
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialKPIs;
