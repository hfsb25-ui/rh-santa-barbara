import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EpiStockList from "@/components/stock/EpiStockList";
import UniformStockList from "@/components/stock/UniformStockList";
import EpiStockForm from "@/components/stock/EpiStockForm";
import UniformStockForm from "@/components/stock/UniformStockForm";
import EpiDistributionHistory from "@/components/stock/EpiDistributionHistory";
import UniformDistributionHistory from "@/components/stock/UniformDistributionHistory";
import EpiStockHistory from "@/components/stock/EpiStockHistory";
import UniformStockHistory from "@/components/stock/UniformStockHistory";

const Stock = () => {
  const navigate = useNavigate();
  const [showEpiDialog, setShowEpiDialog] = useState(false);
  const [showUniformDialog, setShowUniformDialog] = useState(false);
  const [refreshEpi, setRefreshEpi] = useState(0);
  const [refreshUniform, setRefreshUniform] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Gerenciamento de Estoque</h1>
          </div>
        </div>

        <Tabs defaultValue="epis" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="epis">Estoque EPIs</TabsTrigger>
            <TabsTrigger value="uniformes">Estoque Uniformes</TabsTrigger>
            <TabsTrigger value="movimentacao-epis">Movimentações EPIs</TabsTrigger>
            <TabsTrigger value="movimentacao-uniformes">Movimentações Uniformes</TabsTrigger>
            <TabsTrigger value="historico-epis">Distribuições EPIs</TabsTrigger>
            <TabsTrigger value="historico-uniformes">Distribuições Uniformes</TabsTrigger>
          </TabsList>

          <TabsContent value="epis" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showEpiDialog} onOpenChange={setShowEpiDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar EPI
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar EPI no Estoque</DialogTitle>
                  </DialogHeader>
                  <EpiStockForm
                    onSaved={() => {
                      setShowEpiDialog(false);
                      setRefreshEpi(prev => prev + 1);
                    }}
                    onCancel={() => setShowEpiDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <EpiStockList key={refreshEpi} />
          </TabsContent>

          <TabsContent value="uniformes" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showUniformDialog} onOpenChange={setShowUniformDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Uniforme
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Uniforme no Estoque</DialogTitle>
                  </DialogHeader>
                  <UniformStockForm
                    onSaved={() => {
                      setShowUniformDialog(false);
                      setRefreshUniform(prev => prev + 1);
                    }}
                    onCancel={() => setShowUniformDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <UniformStockList key={refreshUniform} />
          </TabsContent>

          <TabsContent value="movimentacao-epis" className="space-y-4">
            <EpiStockHistory />
          </TabsContent>

          <TabsContent value="movimentacao-uniformes" className="space-y-4">
            <UniformStockHistory />
          </TabsContent>

          <TabsContent value="historico-epis" className="space-y-4">
            <EpiDistributionHistory />
          </TabsContent>

          <TabsContent value="historico-uniformes" className="space-y-4">
            <UniformDistributionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Stock;
