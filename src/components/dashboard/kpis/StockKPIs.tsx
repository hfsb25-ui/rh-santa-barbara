import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertCircle, TrendingUp, BoxIcon } from "lucide-react";

interface StockKPIsProps {
  totalItems: number;
  lowStockItems: number;
  totalDistributed: number;
  stockValue: number;
}

const StockKPIs = ({ totalItems, lowStockItems, totalDistributed, stockValue }: StockKPIsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Itens em Estoque</p>
              <h3 className="text-2xl font-bold">{totalItems}</h3>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
              <h3 className="text-2xl font-bold text-destructive">{lowStockItems}</h3>
            </div>
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Distribuídos</p>
              <h3 className="text-2xl font-bold text-secondary">{totalDistributed}</h3>
            </div>
            <TrendingUp className="w-8 h-8 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(stockValue)}
              </h3>
            </div>
            <BoxIcon className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockKPIs;
