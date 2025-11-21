import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, AlertTriangle, TrendingUp } from "lucide-react";

interface StockItem {
  name: string;
  current: number;
  minimum: number;
  distributed: number;
}

interface StockAlertsProps {
  lowStockEpis: StockItem[];
  lowStockUniforms: StockItem[];
  topDistributed: Array<{ name: string; quantity: number }>;
}

const StockAlerts = ({ lowStockEpis, lowStockUniforms, topDistributed }: StockAlertsProps) => {
  const hasLowStock = lowStockEpis.length > 0 || lowStockUniforms.length > 0;

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      {hasLowStock && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> {lowStockEpis.length + lowStockUniforms.length} item(ns) com estoque baixo ou abaixo do mínimo
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock EPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4" />
              EPIs - Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockEpis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum EPI com estoque baixo
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockEpis.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {item.minimum} | Atual: {item.current}
                      </p>
                    </div>
                    <Badge variant={item.current === 0 ? "destructive" : "secondary"}>
                      {item.current === 0 ? "ESGOTADO" : "BAIXO"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Uniforms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4" />
              Uniformes - Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockUniforms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum uniforme com estoque baixo
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockUniforms.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {item.minimum} | Atual: {item.current}
                      </p>
                    </div>
                    <Badge variant={item.current === 0 ? "destructive" : "secondary"}>
                      {item.current === 0 ? "ESGOTADO" : "BAIXO"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Most Distributed Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            Itens Mais Distribuídos no Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDistributed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma distribuição registrada este mês
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDistributed} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={150} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(var(--secondary))" radius={[0, 8, 8, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAlerts;
