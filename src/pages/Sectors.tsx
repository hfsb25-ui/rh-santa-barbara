import { SectorForm } from "@/components/sectors/SectorForm";
import { SectorList } from "@/components/sectors/SectorList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Sectors() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Gerenciamento de Setores</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Setor</CardTitle>
            <CardDescription>
              Adicione um novo setor para organizar seus funcionários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SectorForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setores Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os setores disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SectorList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}