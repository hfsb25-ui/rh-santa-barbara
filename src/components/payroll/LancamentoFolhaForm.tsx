import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Copy, TrendingUp, TrendingDown } from "lucide-react";
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
  onSuccess: () => void;
  onCancel: () => void;
}

const LancamentoFolhaForm = ({ employees, empresaId, mes, ano, onSuccess, onCancel }: LancamentoFolhaFormProps) => {
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [lancamentos, setLancamentos] = useState<Record<string, LancamentoData>>({});
  const [loading, setLoading] = useState(false);

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
        
        // Insert or update folha_pagamento
        const { data: pagamento, error: pagError } = await supabase
          .from("folha_pagamento")
          .upsert({
            employee_id: empId,
            empresa_id: empresaId,
            mes,
            ano,
            valor_bruto: totais.proventos,
            desconto: totais.descontos,
            descontos: 0, // Legacy field
            valor_liquido: totais.liquido,
            observacoes: lancamento.observacoes || null,
          }, { onConflict: "employee_id,mes,ano" })
          .select()
          .single();

        if (pagError) throw pagError;

        // Delete existing items and insert new ones
        await supabase
          .from("folha_pagamento_itens")
          .delete()
          .eq("folha_pagamento_id", pagamento.id);

        const itensParaInserir = Object.entries(lancamento.itens)
          .filter(([_, valor]) => valor > 0)
          .map(([varId, valor]) => ({
            folha_pagamento_id: pagamento.id,
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

  const proventos = variaveis.filter(v => v.tipo === "provento");
  const descontos = variaveis.filter(v => v.tipo === "desconto");

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
                    {proventos.map(v => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Label className="w-32 text-sm truncate" title={v.nome}>{v.nome}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={lancamento.itens[v.id] || 0}
                          onChange={(e) => handleItemChange(emp.id, v.id, parseFloat(e.target.value) || 0)}
                          className="flex-1"
                        />
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
                    {descontos.map(v => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Label className="w-32 text-sm truncate" title={v.nome}>{v.nome}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={lancamento.itens[v.id] || 0}
                          onChange={(e) => handleItemChange(emp.id, v.id, parseFloat(e.target.value) || 0)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold text-red-600">Total Descontos:</span>
                      <span className="font-semibold text-red-600">
                        R$ {totais.descontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
