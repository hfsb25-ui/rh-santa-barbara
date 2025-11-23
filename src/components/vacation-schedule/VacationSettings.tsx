import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function VacationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Conflitos</CardTitle>
          <CardDescription>
            Configure as regras para detecção de conflitos e alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            Configurações em desenvolvimento
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
