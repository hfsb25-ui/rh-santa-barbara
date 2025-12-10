import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileWarning, Plus, History } from "lucide-react";
import TacForm from "@/components/tac/TacForm";
import TacList from "@/components/tac/TacList";

const Tacs = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("novo");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileWarning className="h-6 w-6 text-warning" />
              <h1 className="text-2xl font-bold">Termos de Ajustamento de Conduta (TAC)</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="novo" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo TAC
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="mt-6">
            <TacForm onSuccess={() => setActiveTab("historico")} />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <TacList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Tacs;
