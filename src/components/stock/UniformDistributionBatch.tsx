import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, Shirt, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignatureCanvas from "@/components/forms/SignatureCanvas";
import { generateUniformReceipt } from "@/lib/pdfGenerator";

interface Employee {
  id: string;
  nome_completo: string;
  cargo: string;
  cpf: string | null;
  setor: string | null;
}

interface StockItem {
  id: string;
  tipo_uniforme: string;
  tamanho: string;
  cor: string | null;
  quantidade_estoque: number;
}

const UniformDistributionBatch = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchUniform, setSearchUniform] = useState("");
  
  // Signature handling
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSignatureEmployee, setCurrentSignatureEmployee] = useState<Employee | null>(null);
  const [pendingDistributions, setPendingDistributions] = useState<any[]>([]);
  const [currentDistributionIndex, setCurrentDistributionIndex] = useState(0);

  useEffect(() => {
    fetchEmployees();
    fetchStockItems();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, nome_completo, cargo, cpf, setor")
      .eq("status", "ativo")
      .order("nome_completo");
    
    setEmployees(data || []);
  };

  const fetchStockItems = async () => {
    const { data } = await supabase
      .from("estoque_uniformes")
      .select("*")
      .gt("quantidade_estoque", 0)
      .order("tipo_uniforme");
    
    setStockItems(data || []);
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    const filteredEmployees = employees.filter(emp => 
      emp.nome_completo.toLowerCase().includes(searchEmployee.toLowerCase())
    );
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleDistribute = async () => {
    if (!selectedItem) {
      toast.error("Selecione um uniforme");
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error("Selecione pelo menos um funcionário");
      return;
    }

    const selectedStock = stockItems.find(item => item.id === selectedItem);
    if (!selectedStock) {
      toast.error("Item não encontrado");
      return;
    }

    if (selectedStock.quantidade_estoque < selectedEmployees.length) {
      toast.error(`Estoque insuficiente. Disponível: ${selectedStock.quantidade_estoque}, Necessário: ${selectedEmployees.length}`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create distribution records
      const distributions = selectedEmployees.map(empId => ({
        employee_id: empId,
        tipo_uniforme: selectedStock.tipo_uniforme,
        tamanho: selectedStock.tamanho,
        quantidade: 1,
        data_entrega: dataEntrega,
        observacoes: observacoes || null,
      }));

      const { data: insertedRecords, error: insertError } = await supabase
        .from("uniformes")
        .insert(distributions)
        .select();

      if (insertError) throw insertError;

      // Update stock
      const newQuantity = selectedStock.quantidade_estoque - selectedEmployees.length;
      const { error: stockError } = await supabase
        .from("estoque_uniformes")
        .update({ quantidade_estoque: newQuantity })
        .eq("id", selectedItem);

      if (stockError) throw stockError;

      // Register stock movement
      await supabase.from("historico_estoque_uniformes").insert({
        estoque_uniforme_id: selectedItem,
        tipo_movimentacao: "saida",
        quantidade: selectedEmployees.length,
        quantidade_anterior: selectedStock.quantidade_estoque,
        quantidade_nova: newQuantity,
        motivo: `Distribuição em lote para ${selectedEmployees.length} funcionário(s)`,
        created_by: user?.id,
      });

      // Prepare for signature collection
      const employeeDetails = employees.filter(emp => selectedEmployees.includes(emp.id));
      const distributionsWithDetails = insertedRecords?.map((record, index) => ({
        ...record,
        employee: employeeDetails[index],
        stockItem: selectedStock,
      })) || [];

      setPendingDistributions(distributionsWithDetails);
      setCurrentDistributionIndex(0);
      
      if (distributionsWithDetails.length > 0) {
        setCurrentSignatureEmployee(distributionsWithDetails[0].employee);
        setShowSignatureDialog(true);
      }

      toast.success(`${selectedEmployees.length} uniforme(s) distribuído(s) com sucesso!`);
      
      // Refresh stock
      fetchStockItems();
      setSelectedEmployees([]);
      setSelectedItem(null);
      setObservacoes("");
    } catch (error) {
      console.error("Erro na distribuição:", error);
      toast.error("Erro ao distribuir uniformes");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSignature = async (signatureData: string) => {
    const currentDistribution = pendingDistributions[currentDistributionIndex];
    
    await supabase
      .from("uniformes")
      .update({
        assinatura_funcionario: signatureData,
        data_assinatura: new Date().toISOString(),
      })
      .eq("id", currentDistribution.id);

    // Generate receipt
    generateUniformReceipt({
      employeeName: currentDistribution.employee.nome_completo,
      employeeCpf: currentDistribution.employee.cpf || "Não informado",
      employeeRole: currentDistribution.employee.cargo,
      tipoUniforme: currentDistribution.tipo_uniforme,
      tamanho: currentDistribution.tamanho,
      quantidade: 1,
      dataEntrega: currentDistribution.data_entrega,
      observacoes: currentDistribution.observacoes,
      assinatura: signatureData,
    });

    moveToNextEmployee();
  };

  const handleSkipSignature = () => {
    moveToNextEmployee();
  };

  const moveToNextEmployee = () => {
    const nextIndex = currentDistributionIndex + 1;
    if (nextIndex < pendingDistributions.length) {
      setCurrentDistributionIndex(nextIndex);
      setCurrentSignatureEmployee(pendingDistributions[nextIndex].employee);
    } else {
      setShowSignatureDialog(false);
      setPendingDistributions([]);
      setCurrentDistributionIndex(0);
      setCurrentSignatureEmployee(null);
      toast.success("Distribuição em lote concluída!");
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.nome_completo.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.setor?.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const filteredStockItems = stockItems.filter(item => 
    item.tipo_uniforme.toLowerCase().includes(searchUniform.toLowerCase()) ||
    item.tamanho.toLowerCase().includes(searchUniform.toLowerCase())
  );

  const selectedStock = stockItems.find(item => item.id === selectedItem);

  return (
    <>
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assinatura - {currentSignatureEmployee?.nome_completo} ({currentDistributionIndex + 1}/{pendingDistributions.length})
            </DialogTitle>
          </DialogHeader>
          <SignatureCanvas
            onSave={handleSaveSignature}
            onCancel={handleSkipSignature}
          />
          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              {pendingDistributions.length - currentDistributionIndex - 1} restante(s)
            </p>
            <Button variant="outline" onClick={handleSkipSignature}>
              Pular (funcionário assinará depois)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Uniforme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="w-5 h-5" />
              Selecionar Uniforme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar uniforme..."
                value={searchUniform}
                onChange={(e) => setSearchUniform(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {filteredStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum uniforme disponível</p>
              ) : (
                filteredStockItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stock-${item.id}`}
                      checked={selectedItem === item.id}
                      onCheckedChange={(checked) => {
                        setSelectedItem(checked ? item.id : null);
                      }}
                    />
                    <label
                      htmlFor={`stock-${item.id}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {item.tipo_uniforme} - {item.tamanho} {item.cor && `(${item.cor})`}
                      <span className="text-muted-foreground ml-2">
                        Estoque: {item.quantidade_estoque}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Data de Entrega</Label>
                <Input
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações para todos os registros..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Funcionários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Funcionários ({selectedEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionário ou setor..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedEmployees.length === filteredEmployees.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-4">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum funcionário encontrado</p>
              ) : (
                filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={() => handleEmployeeToggle(emp.id)}
                    />
                    <label
                      htmlFor={`emp-${emp.id}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {emp.nome_completo}
                      <span className="text-muted-foreground ml-2">
                        {emp.cargo} {emp.setor && `- ${emp.setor}`}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo e Ação */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resumo da Distribuição</p>
              <p className="font-medium">
                {selectedStock 
                  ? `${selectedStock.tipo_uniforme} (${selectedStock.tamanho}) para ${selectedEmployees.length} funcionário(s)`
                  : "Selecione um uniforme e funcionários"}
              </p>
              {selectedStock && selectedEmployees.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Estoque após distribuição: {selectedStock.quantidade_estoque - selectedEmployees.length}
                </p>
              )}
            </div>
            <Button 
              onClick={handleDistribute} 
              disabled={loading || !selectedItem || selectedEmployees.length === 0}
              size="lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Distribuir para {selectedEmployees.length} funcionário(s)
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default UniformDistributionBatch;
