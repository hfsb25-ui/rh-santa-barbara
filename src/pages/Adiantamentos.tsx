import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Employee {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  empresa_id: string | null;
  tipo_contrato: string | null;
}

interface AdiantamentoEntry {
  employee_id: string;
  nome_completo: string;
  valor: string;
  forma_pagamento: "em_conta" | "em_maos";
}

interface Company {
  id: string;
  nome: string;
}

const Adiantamentos = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filtros
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
  const [selectedSetor, setSelectedSetor] = useState<string>("all");
  const [selectedTipoContrato, setSelectedTipoContrato] = useState<string>("all");
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  
  // Adiantamentos
  const [adiantamentos, setAdiantamentos] = useState<AdiantamentoEntry[]>([]);
  
  const setores = Array.from(new Set(employees.map(e => e.setor).filter(Boolean))) as string[];
  const tiposContrato = ["fixo", "intermitente", "Prestador de Serviço"];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Atualizar lista de adiantamentos quando filtros mudarem
    const filtered = employees.filter(emp => {
      if (selectedEmpresa !== "all" && emp.empresa_id !== selectedEmpresa) return false;
      if (selectedSetor !== "all" && emp.setor !== selectedSetor) return false;
      if (selectedTipoContrato !== "all" && emp.tipo_contrato !== selectedTipoContrato) return false;
      return true;
    });

    setAdiantamentos(filtered.map(emp => ({
      employee_id: emp.id,
      nome_completo: emp.nome_completo,
      valor: "",
      forma_pagamento: "em_conta" as const
    })));
  }, [selectedEmpresa, selectedSetor, selectedTipoContrato, employees]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [employeesResult, companiesResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, nome_completo, cargo, setor, empresa_id, tipo_contrato")
          .eq("status", "ativo")
          .order("nome_completo"),
        supabase
          .from("empresas")
          .select("id, nome")
          .order("nome")
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (companiesResult.error) throw companiesResult.error;

      setEmployees(employeesResult.data || []);
      setCompanies(companiesResult.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = (employeeId: string, valor: string) => {
    setAdiantamentos(prev => 
      prev.map(adiant => 
        adiant.employee_id === employeeId 
          ? { ...adiant, valor } 
          : adiant
      )
    );
  };

  const handleFormaPagamentoChange = (employeeId: string, forma: "em_conta" | "em_maos") => {
    setAdiantamentos(prev => 
      prev.map(adiant => 
        adiant.employee_id === employeeId 
          ? { ...adiant, forma_pagamento: forma } 
          : adiant
      )
    );
  };

  const handleSaveAdiantamentos = async () => {
    try {
      setSaving(true);

      // Filtrar apenas adiantamentos com valor preenchido
      const adiantamentosComValor = adiantamentos.filter(a => a.valor && parseFloat(a.valor) > 0);

      if (adiantamentosComValor.length === 0) {
        toast.error("Preencha pelo menos um valor de adiantamento");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Preparar dados para inserção
      const inserts = adiantamentosComValor.map(a => {
        const employee = employees.find(e => e.id === a.employee_id);
        return {
          employee_id: a.employee_id,
          empresa_id: employee?.empresa_id,
          valor: parseFloat(a.valor),
          forma_pagamento: a.forma_pagamento,
          mes,
          ano,
          created_by: user.id
        };
      });

      const { error } = await supabase
        .from("adiantamentos")
        .insert(inserts);

      if (error) throw error;

      toast.success(`${adiantamentosComValor.length} adiantamento(s) lançado(s) com sucesso!`);
      
      // Limpar valores
      setAdiantamentos(prev => prev.map(a => ({ ...a, valor: "" })));
    } catch (error: any) {
      console.error("Erro ao salvar adiantamentos:", error);
      toast.error("Erro ao salvar adiantamentos");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const adiantamentosComValor = adiantamentos.filter(a => a.valor && parseFloat(a.valor) > 0);

      if (adiantamentosComValor.length === 0) {
        toast.error("Não há adiantamentos para exportar");
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Relatório de Adiantamentos", 14, 20);
      
      doc.setFontSize(11);
      doc.text(`Mês/Ano: ${mes.toString().padStart(2, '0')}/${ano}`, 14, 30);
      
      const tableData = adiantamentosComValor.map(a => [
        a.nome_completo,
        `R$ ${parseFloat(a.valor).toFixed(2)}`,
        a.forma_pagamento === "em_conta" ? "Em conta" : "Em mãos"
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["Funcionário", "Valor", "Forma de Pagamento"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] }
      });

      const total = adiantamentosComValor.reduce((sum, a) => sum + parseFloat(a.valor), 0);
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Total: R$ ${total.toFixed(2)}`, 14, finalY + 10);

      doc.save(`adiantamentos_${mes}_${ano}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Adiantamentos Mensais</h1>
        <Button onClick={handleExportPDF} variant="outline">
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Label>Mês</Label>
            <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2024, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ano</Label>
            <Input
              type="number"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
            />
          </div>

          <div>
            <Label>Empresa</Label>
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Setor</Label>
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Contrato</Label>
            <Select value={selectedTipoContrato} onValueChange={setSelectedTipoContrato}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tiposContrato.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adiantamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum funcionário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                adiantamentos.map(adiant => {
                  const employee = employees.find(e => e.id === adiant.employee_id);
                  return (
                    <TableRow key={adiant.employee_id}>
                      <TableCell className="font-medium">{adiant.nome_completo}</TableCell>
                      <TableCell>{employee?.cargo}</TableCell>
                      <TableCell>{employee?.setor || "-"}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={adiant.valor}
                          onChange={(e) => handleValorChange(adiant.employee_id, e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={adiant.forma_pagamento}
                          onValueChange={(v) => handleFormaPagamentoChange(adiant.employee_id, v as "em_conta" | "em_maos")}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_conta">Em conta</SelectItem>
                            <SelectItem value="em_maos">Em mãos</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSaveAdiantamentos} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lançar Adiantamentos
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Adiantamentos;