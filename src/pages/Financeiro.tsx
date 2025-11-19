import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetorGasto {
  setor: string;
  totalSalarios: number;
  quantidadeFuncionarios: number;
}

interface Empresa {
  id: string;
  nome: string;
}

const Financeiro = () => {
  const navigate = useNavigate();
  const [gastoPorSetor, setGastoPorSetor] = useState<SetorGasto[]>([]);
  const [gastoTotal, setGastoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    fetchFinancialData();
  }, [selectedEmpresa]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      toast.error("Erro ao carregar empresas");
    }
  };

  const fetchFinancialData = async () => {
    try {
      let query = supabase
        .from("employees")
        .select("setor, salario, status, empresa_id")
        .eq("status", "ativo");

      if (selectedEmpresa !== "all") {
        query = query.eq("empresa_id", selectedEmpresa);
      }

      const { data: employees, error } = await query;

      if (error) throw error;

      // Agrupar por setor
      const setorMap = new Map<string, { total: number; count: number }>();
      let total = 0;

      employees?.forEach((emp) => {
        const setor = emp.setor || "Sem Setor";
        const salario = emp.salario || 0;
        
        if (!setorMap.has(setor)) {
          setorMap.set(setor, { total: 0, count: 0 });
        }
        
        const current = setorMap.get(setor)!;
        current.total += salario;
        current.count += 1;
        total += salario;
      });

      // Converter para array
      const setores: SetorGasto[] = Array.from(setorMap.entries()).map(([setor, data]) => ({
        setor,
        totalSalarios: data.total,
        quantidadeFuncionarios: data.count,
      }));

      setGastoPorSetor(setores.sort((a, b) => b.totalSalarios - a.totalSalarios));
      setGastoTotal(total);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const empresaNome = selectedEmpresa === "all" 
      ? "TODAS AS EMPRESAS" 
      : empresas.find(e => e.id === selectedEmpresa)?.nome || "";
    
    // Título
    doc.setFontSize(18);
    doc.text("RELATÓRIO FINANCEIRO - GASTOS COM PESSOAL", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 30, { align: "center" });
    doc.text(`Empresa: ${empresaNome}`, pageWidth / 2, 36, { align: "center" });
    
    // Gasto Total
    doc.setFontSize(14);
    doc.text("GASTO TOTAL COM PESSOAL", 20, 50);
    doc.setFontSize(16);
    doc.text(`R$ ${gastoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 60);
    
    // Gastos por Setor
    doc.setFontSize(14);
    doc.text("GASTOS POR SETOR", 20, 75);
    
    let yPosition = 85;
    doc.setFontSize(10);
    
    gastoPorSetor.forEach((setor) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`Setor: ${setor.setor}`, 20, yPosition);
      doc.text(`Funcionários: ${setor.quantidadeFuncionarios}`, 20, yPosition + 5);
      doc.text(
        `Total: R$ ${setor.totalSalarios.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        20,
        yPosition + 10
      );
      doc.line(20, yPosition + 12, pageWidth - 20, yPosition + 12);
      yPosition += 20;
    });
    
    doc.save(`relatorio-financeiro-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Relatório exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Relatório Financeiro</h1>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Gasto Total com Pessoal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              R$ {gastoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Funcionários ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gastoPorSetor.length === 0 ? (
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              ) : (
                gastoPorSetor.map((setor) => (
                  <div
                    key={setor.setor}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{setor.setor}</h3>
                      <p className="text-sm text-muted-foreground">
                        {setor.quantidadeFuncionarios} funcionário{setor.quantidadeFuncionarios !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        R$ {setor.totalSalarios.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Média: R${" "}
                        {(setor.totalSalarios / setor.quantidadeFuncionarios).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Financeiro;
