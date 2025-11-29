import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users } from "lucide-react";
import { LancamentoPonto } from "@/components/ponto/LancamentoPonto";
import { LancamentoPontoLote } from "@/components/ponto/LancamentoPontoLote";
import { ConfiguracaoHoras } from "@/components/ponto/ConfiguracaoHoras";
import { RelatoriosPonto } from "@/components/ponto/RelatoriosPonto";

export default function ControlePonto() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              Controle de Ponto
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o registro de horas de trabalho dos funcionários
            </p>
          </div>
        </div>

        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lançamento Individual
            </TabsTrigger>
            <TabsTrigger value="lote" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lançamento em Lote
            </TabsTrigger>
            <TabsTrigger value="configuracao" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Configuração de Horas
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <Card className="p-6">
              <LancamentoPonto />
            </Card>
          </TabsContent>

          <TabsContent value="lote">
            <Card className="p-6">
              <LancamentoPontoLote />
            </Card>
          </TabsContent>

          <TabsContent value="configuracao">
            <Card className="p-6">
              <ConfiguracaoHoras />
            </Card>
          </TabsContent>

          <TabsContent value="relatorios">
            <Card className="p-6">
              <RelatoriosPonto />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
