import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, TrendingUp, TrendingDown, Plus, X } from "lucide-react";
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
  itens: Record<string, number>; // variavel_id -> valor
}

interface LancamentoFolhaFormProps {
  employees: Employee[];
  empresaId: string;
  mes: number;
  ano: number;
  tipoFolha: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const LancamentoFolhaForm = ({ employees, empresaId, mes, ano, tipoFolha, onSuccess, onCancel }: LancamentoFolhaFormProps) => {
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [lancamentos, setLancamentos] = useState<Record<string, LancamentoData>>({});
  const [loading, setLoading] = useState(false);
  const [codigoInput, setCodigoInput] = useState<Record<string, string>>({});
  const [foundVariavel, setFoundVariavel] = useState<Record<string, Variavel | null>>({});
  const valorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
        toast.info("Nenhum pagamento encontrado no mês anterior");
        return;
      }

      const newLancamentos = { ...lancamentos };

      pagamentosAnteriores.forEach((pag: any) => {
        if (newLancamentos[pag.employee_id]) {
          newLancamentos[pag.employee_id] = {
            salario_base: pag.valor_bruto,
            observacoes: pag.observacoes || "",
            itens: {},
          };

          if (pag.folha_pagamento_itens) {
            pag.folha_pagamento_itens.forEach((item: any) => {
              newLancamentos[pag.employee_id].itens[item.variavel_id] = item.valor;
            });
          }
        }
      });

      setLancamentos(newLancamentos);
      toast.success("Dados do mês anterior copiados!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao copiar dados do mês anterior");
    }
  };

  const handleValueChange = (empId: string, field: string, value: number | string) => {
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
      if (variavel) {
        if (variavel.tipo === "provento") {
          totalProventos += valor;
        } else {
          totalDescontos += valor;
        }
      }
    });

    return {
      proventos: totalProventos,
      descontos: totalDescontos,
      liquido: totalProventos - totalDescontos,
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      for (const [empId, lancamento] of Object.entries(lancamentos)) {
        const totais = calcularTotais(empId);
        
        // Check if record already exists
        const { data: existingPag } = await supabase
          .from("folha_pagamento")
          .select("id")
          .eq("employee_id", empId)
          .eq("mes", mes)
          .eq("ano", ano)
          .eq("tipo_folha", tipoFolha)
          .maybeSingle();

        let pagamentoId: string;

        if (existingPag) {
          // Update existing record
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
          // Insert new record
          const { data: newPag, error: insertError } = await supabase
            .from("folha_pagamento")
            .insert({
              employee_id: empId,
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

        // Delete existing items and insert new ones
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
      }

      toast.success("Pagamentos lançados com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Erro ao lançar pagamentos:", error);
      toast.error("Erro ao lançar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleCodigoSearch = (empId: string, codigo: string) => {
    const upperCodigo = codigo.toUpperCase();
    setCodigoInput(prev => ({ ...prev, [empId]: upperCodigo }));
    
    if (upperCodigo.length >= 1) {
      const variavel = variaveis.find(v => v.codigo?.toUpperCase() === upperCodigo);
      setFoundVariavel(prev => ({ ...prev, [empId]: variavel || null }));
    } else {
      setFoundVariavel(prev => ({ ...prev, [empId]: null }));
    }
  };

  const handleAddVariavelByCodigo = (empId: string, valor: number) => {
    const variavel = foundVariavel[empId];
    if (!variavel || valor <= 0) return;
    
    handleItemChange(empId, variavel.id, valor);
    setCodigoInput(prev => ({ ...prev, [empId]: "" }));
    setFoundVariavel(prev => ({ ...prev, [empId]: null }));
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Lançamentos - {new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </h3>
        <Button variant="outline" onClick={handleCopiarMesAnterior}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar do Mês Anterior
        </Button>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {employees.map(emp => {
          const totais = calcularTotais(emp.id);
          const lancamento = lancamentos[emp.id];
          if (!lancamento) return null;

          return (
            <div key={emp.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{emp.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">{emp.cargo} - {emp.setor}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor em Mãos</p>
                  <p className={`text-xl font-bold ${totais.liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {totais.liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Busca por código */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <Label className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4" />
                  Adicionar variável por código
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Digite o código (ex: HE, INSS)"
                    value={codigoInput[emp.id] || ""}
                    onChange={(e) => handleCodigoSearch(emp.id, e.target.value)}
                    className="w-32 uppercase font-mono"
                    maxLength={10}
                  />
                  {foundVariavel[emp.id] && (
                    <>
                      <Badge 
                        variant={foundVariavel[emp.id]?.tipo === "provento" ? "default" : "destructive"}
                        className="whitespace-nowrap"
                      >
                        {foundVariavel[emp.id]?.nome}
                      </Badge>
                      <Input
                        ref={el => valorInputRefs.current[`${emp.id}-valor`] = el}
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        className="w-32"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.target as HTMLInputElement;
                            handleAddVariavelByCodigo(emp.id, parseFloat(input.value) || 0);
                            input.value = "";
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const input = valorInputRefs.current[`${emp.id}-valor`];
                          handleAddVariavelByCodigo(emp.id, parseFloat(input?.value || "0"));
                          if (input) input.value = "";
                        }}
                      >
                        Adicionar
                      </Button>
                    </>
                  )}
                  {codigoInput[emp.id] && !foundVariavel[emp.id] && (
                    <span className="text-sm text-muted-foreground">Código não encontrado</span>
                  )}
                </div>
              </div>

              {/* Itens adicionados */}
              {(() => {
                const itensAdicionados = getVariaveisComValor(emp.id);
                const proventosAdicionados = itensAdicionados.filter(v => v.tipo === "provento");
                const descontosAdicionados = itensAdicionados.filter(v => v.tipo === "desconto");

                return (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Proventos
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="w-32 text-sm">Salário Base</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lancamento.salario_base}
                            onChange={(e) => handleValueChange(emp.id, "salario_base", parseFloat(e.target.value) || 0)}
                            className="flex-1"
                          />
                        </div>
                        {proventosAdicionados.map(v => (
                          <div key={v.id} className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {v.codigo || "—"}
                            </Badge>
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
                              className="h-8 w-8"
                              onClick={() => handleRemoveItem(emp.id, v.id)}
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-green-600">Total Proventos:</span>
                          <span className="font-semibold text-green-600">
                            R$ {totais.proventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        Descontos
                      </Label>
                      <div className="space-y-2">
                        {descontosAdicionados.map(v => (
                          <div key={v.id} className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {v.codigo || "—"}
                            </Badge>
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
                              className="h-8 w-8"
                              onClick={() => handleRemoveItem(emp.id, v.id)}
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        {descontosAdicionados.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">Nenhum desconto adicionado</p>
                        )}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-red-600">Total Descontos:</span>
                          <span className="font-semibold text-red-600">
                            R$ {totais.descontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={lancamento.observacoes}
                  onChange={(e) => handleValueChange(emp.id, "observacoes", e.target.value)}
                  rows={2}
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : "Confirmar Lançamentos"}
        </Button>
      </div>
    </div>
  );
};

export default LancamentoFolhaForm;
