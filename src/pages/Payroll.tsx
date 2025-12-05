import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

interface Empresa {
  id: string;
  nome: string;
}

interface Employee {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  salario: number | null;
  tipo_contrato: string;
}

interface Pagamento {
  id: string;
  employee_id: string;
  valor_bruto: number;
  desconto: number;
  descontos: number;
  valor_liquido: number;
  observacoes: string | null;
  employees: {
    nome_completo: string;
    cargo: string;
    tipo_contrato: string;
  };
}

const Payroll = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [tipoContrato, setTipoContrato] = useState<string>("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<Pagamento | null>(null);
  const [showLancamentoForm, setShowLancamentoForm] = useState(false);
  const [lancamentoValues, setLancamentoValues] = useState<Record<string, { valor_bruto: number; desconto: number; descontos: number }>>({});

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresa) {
      fetchEmployees();
      fetchPagamentos();
    }
  }, [selectedEmpresa, mes, ano, tipoContrato]);

  const fetchEmpresas = async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nome")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar empresas");
      return;
    }
    setEmpresas(data || []);
  };

  const fetchEmployees = async () => {
    let query = supabase
      .from("employees")
      .select("id, nome_completo, cargo, setor, salario, tipo_contrato")
      .eq("empresa_id", selectedEmpresa)
      .eq("status", "ativo");

    if (tipoContrato && tipoContrato !== "all") {
      query = query.eq("tipo_contrato", tipoContrato as any);
    }

    const { data, error } = await query.order("nome_completo");

    if (error) {
      toast.error("Erro ao carregar funcionários");
      return;
    }
    setEmployees(data || []);
  };

  const fetchPagamentos = async () => {
    let query = supabase
      .from("folha_pagamento")
      .select(`
        id,
        employee_id,
        valor_bruto,
        desconto,
        descontos,
        valor_liquido,
        observacoes,
        employees (
          nome_completo,
          cargo,
          tipo_contrato
        )
      `)
      .eq("empresa_id", selectedEmpresa)
      .eq("mes", mes)
      .eq("ano", ano);

    if (tipoContrato && tipoContrato !== "all") {
      query = query.eq("employees.tipo_contrato", tipoContrato as any);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar pagamentos:", error);
      return;
    }
    
    // Filter by tipo_contrato if needed (in case the query filter on relation didn't work)
    let filteredData = data || [];
    if (tipoContrato && tipoContrato !== "all") {
      filteredData = filteredData.filter((p: any) => p.employees?.tipo_contrato === tipoContrato);
    }
    
    setPagamentos(filteredData);
  };

  const handleOpenLancamentoForm = () => {
    if (!selectedEmpresa || employees.length === 0) {
      toast.error("Selecione uma empresa com funcionários ativos");
      return;
    }
    
    const initialValues: Record<string, { valor_bruto: number; desconto: number; descontos: number }> = {};
    employees.forEach((emp) => {
      initialValues[emp.id] = {
        valor_bruto: emp.salario || 0,
        desconto: 0,
        descontos: 0,
      };
    });
    setLancamentoValues(initialValues);
    setShowLancamentoForm(true);
  };

  const handleLancamentoValueChange = (empId: string, field: 'valor_bruto' | 'desconto' | 'descontos', value: number) => {
    setLancamentoValues(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      }
    }));
  };

  const handleConfirmLancamento = async () => {
    setLoading(true);
    try {
      const pagamentosParaInserir = Object.entries(lancamentoValues).map(([empId, values]) => ({
        employee_id: empId,
        empresa_id: selectedEmpresa,
        mes,
        ano,
        valor_bruto: values.valor_bruto,
        desconto: values.desconto,
        descontos: values.descontos,
        valor_liquido: values.valor_bruto - values.desconto - values.descontos,
      }));

      const { error } = await supabase
        .from("folha_pagamento")
        .upsert(pagamentosParaInserir, { onConflict: "employee_id,mes,ano" });

      if (error) throw error;

      toast.success("Pagamentos lançados com sucesso!");
      setShowLancamentoForm(false);
      fetchPagamentos();
    } catch (error: any) {
      console.error("Erro ao lançar pagamentos:", error);
      toast.error("Erro ao lançar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPagamento) return;

    const formData = new FormData(e.currentTarget);
    const valor_bruto = parseFloat(formData.get("valor_bruto") as string);
    const desconto = parseFloat(formData.get("desconto") as string) || 0;
    const descontos = parseFloat(formData.get("descontos") as string) || 0;
    const valor_liquido = valor_bruto - desconto - descontos;

    try {
      const { error } = await supabase
        .from("folha_pagamento")
        .update({
          valor_bruto,
          desconto,
          descontos,
          valor_liquido,
          observacoes: formData.get("observacoes") as string,
        })
        .eq("id", editingPagamento.id);

      if (error) throw error;

      toast.success("Pagamento atualizado!");
      setEditingPagamento(null);
      fetchPagamentos();
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      toast.error("Erro ao atualizar pagamento");
    }
  };

  const handleDeletePagamento = async (id: string) => {
    if (!confirm("Deseja realmente excluir este pagamento?")) return;

    try {
      const { error } = await supabase
        .from("folha_pagamento")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Pagamento excluído!");
      fetchPagamentos();
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      toast.error("Erro ao excluir pagamento");
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const empresaNome = empresas.find(e => e.id === selectedEmpresa)?.nome || "";
    const mesNome = new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" });
    
    doc.setFontSize(18);
    doc.text("FOLHA DE PAGAMENTO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Empresa: ${empresaNome}`, pageWidth / 2, 30, { align: "center" });
    doc.text(`Período: ${mesNome}/${ano}`, pageWidth / 2, 36, { align: "center" });
    
    let yPosition = 50;
    doc.setFontSize(10);
    
    const totalEmConta = pagamentos.reduce((sum, p) => sum + (p.descontos || 0), 0);
    const totalEmMaos = pagamentos.reduce((sum, p) => sum + p.valor_liquido, 0);
    const totalDescontos = pagamentos.reduce((sum, p) => sum + (p.desconto || 0), 0);
    const totalGeral = totalEmConta + totalEmMaos + totalDescontos;
    
    // Calcular totais por tipo de contrato
    const totaisPorTipo = pagamentos.reduce((acc, pag) => {
      const tipo = pag.employees.tipo_contrato;
      if (!acc[tipo]) {
        acc[tipo] = { emConta: 0, emMaos: 0, descontos: 0, count: 0 };
      }
      acc[tipo].emConta += pag.descontos || 0;
      acc[tipo].emMaos += pag.valor_liquido;
      acc[tipo].descontos += pag.desconto || 0;
      acc[tipo].count += 1;
      return acc;
    }, {} as Record<string, { emConta: number; emMaos: number; descontos: number; count: number }>);
    
    pagamentos.forEach((pag) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      const tipoContratoLabel = pag.employees.tipo_contrato === 'fixo' ? 'Fixo' : 
                                pag.employees.tipo_contrato === 'intermitente' ? 'Intermitente' : 
                                'Prestador de Serviço';
      
      doc.text(`Funcionário: ${pag.employees.nome_completo}`, 20, yPosition);
      doc.text(`Cargo: ${pag.employees.cargo}`, 20, yPosition + 6);
      doc.text(`Tipo: ${tipoContratoLabel}`, 20, yPosition + 12);
      doc.text(`Valor em Conta: R$ ${(pag.descontos || 0).toFixed(2)}`, 20, yPosition + 18);
      doc.text(`Valor em Mãos: R$ ${pag.valor_liquido.toFixed(2)}`, 20, yPosition + 24);
      if (pag.observacoes) {
        doc.text(`Obs: ${pag.observacoes}`, 20, yPosition + 30);
        yPosition += 40;
      } else {
        yPosition += 34;
      }
    });
    
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    yPosition += 10;
    doc.text("TOTAIS POR TIPO DE CONTRATO", 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    Object.entries(totaisPorTipo).forEach(([tipo, valores]) => {
      const tipoLabel = tipo === 'fixo' ? 'Fixo' : 
                        tipo === 'intermitente' ? 'Intermitente' : 
                        'Prestador de Serviço';
      
      const totalTipo = valores.emConta + valores.emMaos + valores.descontos;
      doc.text(`${tipoLabel} (${valores.count} funcionário${valores.count > 1 ? 's' : ''}):`, 20, yPosition);
      doc.text(`  Valor em Conta: R$ ${valores.emConta.toFixed(2)}`, 25, yPosition + 6);
      doc.text(`  Valor em Mãos: R$ ${valores.emMaos.toFixed(2)}`, 25, yPosition + 12);
      doc.text(`  Total: R$ ${totalTipo.toFixed(2)}`, 25, yPosition + 18);
      yPosition += 26;
    });
    
    yPosition += 5;
    doc.setFontSize(12);
    doc.text("TOTAL GERAL", 20, yPosition);
    doc.text(`Valor em Conta: R$ ${totalEmConta.toFixed(2)}`, 20, yPosition + 8);
    doc.text(`Valor em Mãos: R$ ${totalEmMaos.toFixed(2)}`, 20, yPosition + 16);
    doc.text(`Total: R$ ${totalGeral.toFixed(2)}`, 20, yPosition + 24);
    
    doc.save(`folha-pagamento-${mesNome}-${ano}.pdf`);
  };

  const valorTotal = pagamentos.reduce((sum, p) => sum + p.valor_liquido, 0);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
          </div>
          {pagamentos.length > 0 && (
            <Button onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Empresa</Label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês</Label>
                <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Contrato</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                    <SelectItem value="intermitente">Intermitente</SelectItem>
                    <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedEmpresa && (
          <>
            <div className="flex justify-between items-center mb-4">
              <Button onClick={handleOpenLancamentoForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Lançar Pagamentos
              </Button>
              <div className="text-lg font-semibold">
                Total: R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <Dialog open={showLancamentoForm} onOpenChange={setShowLancamentoForm}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Lançar Pagamentos - {new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {employees.map((emp) => (
                    <div key={emp.id} className="p-4 border rounded-lg">
                      <p className="font-semibold mb-2">{emp.nome_completo}</p>
                      <p className="text-sm text-muted-foreground mb-3">{emp.cargo} - {emp.setor}</p>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label>Valor Bruto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lancamentoValues[emp.id]?.valor_bruto || 0}
                            onChange={(e) => handleLancamentoValueChange(emp.id, 'valor_bruto', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Desconto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lancamentoValues[emp.id]?.desconto || 0}
                            onChange={(e) => handleLancamentoValueChange(emp.id, 'desconto', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Valor em conta</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lancamentoValues[emp.id]?.descontos || 0}
                            onChange={(e) => handleLancamentoValueChange(emp.id, 'descontos', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Valor em Mãos</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={(lancamentoValues[emp.id]?.valor_bruto || 0) - (lancamentoValues[emp.id]?.desconto || 0)}
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowLancamentoForm(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmLancamento} disabled={loading}>Confirmar Lançamento</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <CardTitle>Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pagamentos.map((pag) => (
                    <div key={pag.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{pag.employees.nome_completo}</p>
                        <p className="text-sm text-muted-foreground">{pag.employees.cargo}</p>
                        <p className="text-xs text-muted-foreground">
                          {pag.employees.tipo_contrato === 'fixo' ? 'Fixo' : 
                           pag.employees.tipo_contrato === 'intermitente' ? 'Intermitente' : 
                           'Prestador de Serviço'}
                        </p>
                        <div className="mt-2 text-sm">
                          <p>Bruto: R$ {pag.valor_bruto.toFixed(2)}</p>
                          <p>Desconto: R$ {(pag.desconto || 0).toFixed(2)}</p>
                          <p>Valor em conta: R$ {(pag.descontos || 0).toFixed(2)}</p>
                          <p className="font-semibold">Valor em Mãos: R$ {pag.valor_liquido.toFixed(2)}</p>
                          {pag.observacoes && <p className="text-muted-foreground mt-1">{pag.observacoes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingPagamento(pag)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Pagamento</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpdatePagamento} className="space-y-4">
                              <div>
                                <Label>Valor Bruto</Label>
                                <Input
                                  name="valor_bruto"
                                  type="number"
                                  step="0.01"
                                  defaultValue={pag.valor_bruto}
                                  required
                                />
                              </div>
                              <div>
                                <Label>Desconto</Label>
                                <Input
                                  name="desconto"
                                  type="number"
                                  step="0.01"
                                  defaultValue={pag.desconto || 0}
                                />
                              </div>
                              <div>
                                <Label>Valor em conta</Label>
                                <Input
                                  name="descontos"
                                  type="number"
                                  step="0.01"
                                  defaultValue={pag.descontos || 0}
                                />
                              </div>
                              <div>
                                <Label>Observações</Label>
                                <Textarea
                                  name="observacoes"
                                  defaultValue={pag.observacoes || ""}
                                  rows={3}
                                />
                              </div>
                              <Button type="submit">Salvar</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePagamento(pag.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pagamentos.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum pagamento lançado para este período
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Payroll;
