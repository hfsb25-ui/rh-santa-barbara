import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CursosList } from "@/components/treinamentos/CursosList";
import { RelatoriosTreinamento } from "@/components/treinamentos/RelatoriosTreinamento";
import { EstatisticasTreinamento } from "@/components/treinamentos/EstatisticasTreinamento";

export default function Treinamentos() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sistema de Treinamentos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie cursos, módulos, aulas e acompanhe o progresso dos funcionários
        </p>
      </div>

      <Tabs defaultValue="cursos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-6">
          <CursosList />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <RelatoriosTreinamento />
        </TabsContent>

        <TabsContent value="estatisticas" className="mt-6">
          <EstatisticasTreinamento />
        </TabsContent>
      </Tabs>
    </div>
  );
}
