import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, TrendingUp, TrendingDown, Plus, X, Loader2, Users, Search } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string | null;
  salario: number | null;
}

interface Variavel {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: "desconto" | "provento";
  ativo: boolean;
}

interface LancamentoData {
  salario_base: number;
  observacoes: string;
  itens: Record<string, number>;
}

interface LancamentoFolhaFormProps {
  employees: Employee[];
  empresaId: string;
  mes: number;
  ano: number;
  tipoFolha: string;
  onSuccess: (mes: number, ano: number) => void;
  onCancel: () => void;
}

const LancamentoFolhaForm = ({ employees, empresaId, mes, ano, tipoFolha, onSuccess, onCancel }: LancamentoFolhaFormProps) => {
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [lancamentos, setLancamentos] = useState<Record<string, LancamentoData>>({});
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [codigoBusca, setCodigoBusca] = useState<Record<string, string>>({});
  const [valorBusca, setValorBusca] = useState<Record<string, number>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchVariaveis();
    initializeLancamentos();
  }, [employees]);

  const fetchVariaveis = async () => {
    const { data, error } = await supabase
      .from("variaveis_folha")
      .select("*")
      .eq("ativo", true)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order("tipo")
      .order("nome");

    if (error) {
      console.error("Erro ao carregar variáveis:", error);
      return;
    }
    setVariaveis(data || []);
  };

  const initializeLancamentos = () => {
    const initial: Record<string, LancamentoData> = {};
    employees.forEach(emp => {
      initial[emp.id] = {
        salario_base: emp.salario || 0,
        observacoes: "",
        itens: {},
      };
    });
    setLancamentos(initial);
  };

  const handleCopiarMesAnterior = async () => {
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;

    try {
      const { data: pagamentosAnteriores, error: pagError } = await supabase
        .from("folha_pagamento")
        .select("*, folha_pagamento_itens(*)")
        .eq("empresa_id", empresaId)
        .eq("mes", mesAnterior)
        .eq("ano", anoAnterior);

      if (pagError) throw pagError;

      if (!pagamentosAnteriores || pagamentosAnteriores.length === 0) {
        toast.info("Nenhum lançamento encontrado no mês anterior");
        return;
      }

      const newLancamentos = { ...lancamentos };
      pagamentosAnteriores.forEach((pag: any) => {
        if (newLancamentos[pag.employee_id]) {
          newLancamentos[pag.employee_id] = {
            salario_base: pag.valor_bruto - (pag.folha_pagamento_itens?.filter((i: any) => {
              const v = variaveis.find(v => v.id === i.variavel_id);
              return v?.tipo === "provento";
            }).reduce((sum: number, i: any) => sum + i.valor, 0) || 0),
            observacoes: pag.observacoes || "",
            itens: pag.folha_pagamento_itens?.reduce((acc: Record<string, number>, item: any) => {
              acc[item.variavel_id] = item.valor;
              return acc;
            }, {}) || {},
          };
        }
      });

      setLancamentos(newLancamentos);
      toast.success("Dados do mês anterior copiados!");
    } catch (error) {
      console.error("Erro ao copiar mês anterior:", error);
      toast.error("Erro ao copiar dados do mês anterior");
    }
  };

  const handleValueChange = (empId: string, field: "salario_base" | "observacoes", value: any) => {
    setLancamentos(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      }
    }));
  };

  const handleItemChange = (empId: string, variavelId: string, valor: number) => {
    setLancamentos(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        itens: {
          ...prev[empId].itens,
          [variavelId]: valor,
        }
      }
    }));
  };

  const calcularTotais = (empId: string) => {
    const lancamento = lancamentos[empId];
    if (!lancamento) return { proventos: 0, descontos: 0, liquido: 0 };

    let totalProventos = lancamento.salario_base;
    let totalDescontos = 0;

    Object.entries(lancamento.itens).forEach(([varId, valor]) => {
      const variavel = variaveis.find(v => v.id === varId);
      if (variavel?.tipo === "provento") {
        totalProventos += valor;
      } else if (variavel?.tipo === "desconto") {
        totalDescontos += valor;
      }
    });

    return {
      proventos: totalProventos,
      descontos: totalDescontos,
      liquido: totalProventos - totalDescontos,
    };
  };

  const getResumoGeral = () => {
    let totalProventos = 0;
    let totalDescontos = 0;
    let totalLiquido = 0;
    let funcionariosComDados = 0;

    const employeesToProcess = selectedEmployee === "all" 
      ? employees 
      : employees.filter(e => e.id === selectedEmployee);

    employeesToProcess.forEach(emp => {
      const totais = calcularTotais(emp.id);
      if (totais.proventos > 0 || totais.descontos > 0) {
        totalProventos += totais.proventos;
        totalDescontos += totais.descontos;
        totalLiquido += totais.liquido;
        funcionariosComDados++;
      }
    });

    return { totalProventos, totalDescontos, totalLiquido, funcionariosComDados };
  };

  const handleSubmit = async () => {
    setLoading(true);
    let sucessos = 0;
    let erros = 0;

    try {
      const employeesToProcess = selectedEmployee === "all" 
        ? employees 
        : employees.filter(e => e.id === selectedEmployee);

      for (const emp of employeesToProcess) {
        const lancamento = lancamentos[emp.id];
        if (!lancamento) continue;

        const totais = calcularTotais(emp.id);
        
        if (totais.proventos === 0 && totais.descontos === 0) continue;

        try {
          const { data: existingPag } = await supabase
            .from("folha_pagamento")
            .select("id")
            .eq("employee_id", emp.id)
            .eq("mes", mes)
            .eq("ano", ano)
            .eq("tipo_folha", tipoFolha)
            .maybeSingle();

          let pagamentoId: string;

          if (existingPag) {
            const { data: updatedPag, error: updateError } = await supabase
              .from("folha_pagamento")
              .update({
                valor_bruto: totais.proventos,
                desconto: totais.descontos,
                descontos: 0,
                valor_liquido: totais.liquido,
                observacoes: lancamento.observacoes || null,
              })
              .eq("id", existingPag.id)
              .select()
              .single();

            if (updateError) throw updateError;
            pagamentoId = updatedPag.id;
          } else {
            const { data: newPag, error: insertError } = await supabase
              .from("folha_pagamento")
              .insert({
                employee_id: emp.id,
                empresa_id: empresaId,
                mes,
                ano,
                tipo_folha: tipoFolha,
                valor_bruto: totais.proventos,
                desconto: totais.descontos,
                descontos: 0,
                valor_liquido: totais.liquido,
                observacoes: lancamento.observacoes || null,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            pagamentoId = newPag.id;
          }

          await supabase
            .from("folha_pagamento_itens")
            .delete()
            .eq("folha_pagamento_id", pagamentoId);

          const itensParaInserir = Object.entries(lancamento.itens)
            .filter(([_, valor]) => valor > 0)
            .map(([varId, valor]) => ({
              folha_pagamento_id: pagamentoId,
              variavel_id: varId,
              valor,
            }));

          if (itensParaInserir.length > 0) {
            const { error: itensError } = await supabase
              .from("folha_pagamento_itens")
              .insert(itensParaInserir);
            if (itensError) throw itensError;
          }

          sucessos++;
        } catch (err) {
          console.error(`Erro ao processar ${emp.nome_completo}:`, err);
          erros++;
        }
      }

      if (sucessos > 0) {
        toast.success(`${sucessos} pagamento(s) lançado(s) com sucesso!`);
        onSuccess(mes, ano);
      }
      if (erros > 0) {
        toast.error(`${erros} pagamento(s) com erro`);
      }
      if (sucessos === 0 && erros === 0) {
        toast.warning("Nenhum pagamento para lançar. Verifique os valores.");
      }
    } catch (error) {
      console.error("Erro ao lançar pagamentos:", error);
      toast.error("Erro ao lançar pagamentos");
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleBuscarVariavel = (empId: string, tipo: "provento" | "desconto") => {
    const codigo = codigoBusca[`${empId}-${tipo}`]?.trim();
    const valor = valorBusca[`${empId}-${tipo}`] || 0;

    if (!codigo) {
      toast.error("Digite o código da variável");
      return;
    }

    const variavel = variaveis.find(v => 
      v.codigo?.toLowerCase() === codigo.toLowerCase() && v.tipo === tipo
    );

    if (!variavel) {
      toast.error(`Variável com código "${codigo}" não encontrada`);
      return;
    }

    if (valor <= 0) {
      toast.error("Digite um valor maior que zero");
      return;
    }

    handleItemChange(empId, variavel.id, valor);
    setCodigoBusca(prev => ({ ...prev, [`${empId}-${tipo}`]: "" }));
    setValorBusca(prev => ({ ...prev, [`${empId}-${tipo}`]: 0 }));
    toast.success(`${variavel.nome} adicionado`);
  };

  const handleRemoveItem = (empId: string, variavelId: string) => {
    setLancamentos(prev => {
      const newItens = { ...prev[empId].itens };
      delete newItens[variavelId];
      return {
        ...prev,
        [empId]: {
          ...prev[empId],
          itens: newItens,
        }
      };
    });
  };

  const getVariaveisComValor = (empId: string) => {
    const lancamento = lancamentos[empId];
    if (!lancamento) return [];
    return Object.entries(lancamento.itens)
      .filter(([_, valor]) => valor > 0)
      .map(([varId, valor]) => {
        const variavel = variaveis.find(v => v.id === varId);
        return variavel ? { ...variavel, valor } : null;
      })
      .filter(Boolean) as (Variavel & { valor: number })[];
  };

  const employeesToShow = selectedEmployee === "all" 
    ? employees 
    : employees.filter(e => e.id === selectedEmployee);

  const resumoGeral = getResumoGeral();

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold">
            Lançamentos - {new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {employeesToShow.length} funcionário(s) selecionado(s)
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[220px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Selecionar funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleCopiarMesAnterior}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar Mês Anterior
          </Button>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Funcionários com dados</p>
          <p className="text-xl font-bold">{resumoGeral.funcionariosComDados}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Proventos</p>
          <p className="text-xl font-bold text-green-600">
            R$ {resumoGeral.totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Descontos</p>
          <p className="text-xl font-bold text-red-600">
            R$ {resumoGeral.totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Líquido</p>
          <p className="text-xl font-bold text-primary">
            R$ {resumoGeral.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lista de funcionários */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {employeesToShow.map(emp => {
          const totais = calcularTotais(emp.id);
          const lancamento = lancamentos[emp.id];
          if (!lancamento) return null;

          const itensAdicionados = getVariaveisComValor(emp.id);
          const proventosAdicionados = itensAdicionados.filter(v => v.tipo === "provento");
          const descontosAdicionados = itensAdicionados.filter(v => v.tipo === "desconto");

          return (
            <div key={emp.id} className="p-4 border rounded-lg space-y-4 bg-card">
              {/* Cabeçalho do funcionário */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{emp.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">{emp.cargo} {emp.setor ? `• ${emp.setor}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor em Mãos</p>
                  <p className={`text-xl font-bold ${totais.liquido >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    R$ {totais.liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Grid de proventos e descontos */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Proventos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Proventos
                  </Label>

                  <div className="space-y-2">
                    {/* Salário base */}
                    <div className="flex items-center gap-2">
                      <Label className="w-28 text-sm">Salário Base</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={lancamento.salario_base}
                        onChange={(e) => handleValueChange(emp.id, "salario_base", parseFloat(e.target.value) || 0)}
                        className="flex-1"
                      />
                    </div>

                    {/* Proventos adicionados */}
                    {proventosAdicionados.map(v => (
                      <div key={v.id} className="flex items-center gap-2">
                        {v.codigo && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {v.codigo}
                          </Badge>
                        )}
                        <Label className="flex-1 text-sm truncate" title={v.nome}>{v.nome}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={v.valor}
                          onChange={(e) => handleItemChange(emp.id, v.id, parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(emp.id, v.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Adicionar provento por código */}
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        placeholder="Código"
                        value={codigoBusca[`${emp.id}-provento`] || ""}
                        onChange={(e) => setCodigoBusca(prev => ({ ...prev, [`${emp.id}-provento`]: e.target.value }))}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={valorBusca[`${emp.id}-provento`] || ""}
                        onChange={(e) => setValorBusca(prev => ({ ...prev, [`${emp.id}-provento`]: parseFloat(e.target.value) || 0 }))}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBuscarVariavel(emp.id, "provento");
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleBuscarVariavel(emp.id, "provento")}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold text-green-600">Total:</span>
                      <span className="font-semibold text-green-600">
                        R$ {totais.proventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descontos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    Descontos
                  </Label>

                  <div className="space-y-2">
                    {descontosAdicionados.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">Nenhum desconto adicionado</p>
                    ) : (
                      descontosAdicionados.map(v => (
                        <div key={v.id} className="flex items-center gap-2">
                          {v.codigo && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {v.codigo}
                            </Badge>
                          )}
                          <Label className="flex-1 text-sm truncate" title={v.nome}>{v.nome}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={v.valor}
                            onChange={(e) => handleItemChange(emp.id, v.id, parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(emp.id, v.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}

                    {/* Adicionar desconto por código */}
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        placeholder="Código"
                        value={codigoBusca[`${emp.id}-desconto`] || ""}
                        onChange={(e) => setCodigoBusca(prev => ({ ...prev, [`${emp.id}-desconto`]: e.target.value }))}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={valorBusca[`${emp.id}-desconto`] || ""}
                        onChange={(e) => setValorBusca(prev => ({ ...prev, [`${emp.id}-desconto`]: parseFloat(e.target.value) || 0 }))}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBuscarVariavel(emp.id, "desconto");
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleBuscarVariavel(emp.id, "desconto")}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold text-red-600">Total:</span>
                      <span className="font-semibold text-red-600">
                        R$ {totais.descontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={lancamento.observacoes}
                  onChange={(e) => handleValueChange(emp.id, "observacoes", e.target.value)}
                  rows={2}
                  placeholder="Observações opcionais..."
                  className="mt-1"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Botões de ação */}
      <Separator />
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={() => setShowConfirmDialog(true)} 
          disabled={loading || resumoGeral.funcionariosComDados === 0}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Lançar Pagamentos
        </Button>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Lançamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Você está prestes a lançar pagamentos com os seguintes totais:</p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  <span>Funcionários:</span>
                  <span className="font-semibold">{resumoGeral.funcionariosComDados}</span>
                  <span>Total Proventos:</span>
                  <span className="font-semibold text-green-600">
                    R$ {resumoGeral.totalProventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span>Total Descontos:</span>
                  <span className="font-semibold text-red-600">
                    R$ {resumoGeral.totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span>Total Líquido:</span>
                  <span className="font-semibold text-primary">
                    R$ {resumoGeral.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Esta ação irá criar ou atualizar os registros de pagamento para o período selecionado.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LancamentoFolhaForm;
