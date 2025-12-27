import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface VariaveisFixasTabProps {
  employeeId: string;
}

interface Variavel {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: "desconto" | "provento";
}

interface VariavelFixa {
  id: string;
  employee_id: string;
  variavel_id: string;
  valor: number;
  ativo: boolean;
  variavel?: Variavel;
}

export function VariaveisFixasTab({ employeeId }: VariaveisFixasTabProps) {
  const queryClient = useQueryClient();
  const [selectedVariavel, setSelectedVariavel] = useState<string>("");
  const [valor, setValor] = useState<string>("");

  // Fetch all active variables
  const { data: variaveis } = useQuery({
    queryKey: ["variaveis-folha-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("variaveis_folha")
        .select("id, nome, codigo, tipo")
        .eq("ativo", true)
        .order("tipo")
        .order("nome");
      if (error) throw error;
      return data as Variavel[];
    },
  });

  // Fetch fixed variables for this employee
  const { data: variaveisFixas, isLoading } = useQuery({
    queryKey: ["variaveis-fixas", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("variaveis_fixas_funcionario")
        .select(`
          *,
          variavel:variaveis_folha(id, nome, codigo, tipo)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VariavelFixa[];
    },
  });

  // Add fixed variable
  const addMutation = useMutation({
    mutationFn: async ({ variavelId, valor }: { variavelId: string; valor: number }) => {
      const { error } = await supabase
        .from("variaveis_fixas_funcionario")
        .insert({
          employee_id: employeeId,
          variavel_id: variavelId,
          valor,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variaveis-fixas", employeeId] });
      setSelectedVariavel("");
      setValor("");
      toast.success("Variável fixa adicionada!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Esta variável já está cadastrada para este funcionário");
      } else {
        toast.error("Erro ao adicionar variável fixa");
      }
    },
  });

  // Update fixed variable
  const updateMutation = useMutation({
    mutationFn: async ({ id, valor, ativo }: { id: string; valor?: number; ativo?: boolean }) => {
      const updateData: any = {};
      if (valor !== undefined) updateData.valor = valor;
      if (ativo !== undefined) updateData.ativo = ativo;
      
      const { error } = await supabase
        .from("variaveis_fixas_funcionario")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variaveis-fixas", employeeId] });
      toast.success("Variável atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar variável");
    },
  });

  // Delete fixed variable
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("variaveis_fixas_funcionario")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variaveis-fixas", employeeId] });
      toast.success("Variável removida!");
    },
    onError: () => {
      toast.error("Erro ao remover variável");
    },
  });

  const handleAdd = () => {
    if (!selectedVariavel) {
      toast.error("Selecione uma variável");
      return;
    }
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Digite um valor válido maior que zero");
      return;
    }
    addMutation.mutate({ variavelId: selectedVariavel, valor: valorNum });
  };

  // Get available variables (not already added)
  const availableVariaveis = variaveis?.filter(
    v => !variaveisFixas?.some(vf => vf.variavel_id === v.id)
  );

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Variável Fixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Variáveis fixas são lançadas automaticamente na folha de pagamento todo mês.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="variavel">Variável</Label>
              <Select value={selectedVariavel} onValueChange={setSelectedVariavel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma variável" />
                </SelectTrigger>
                <SelectContent>
                  {availableVariaveis?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        {v.tipo === "provento" ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {v.nome} {v.codigo && `(${v.codigo})`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variáveis Fixas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {!variaveisFixas || variaveisFixas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma variável fixa cadastrada para este funcionário.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Variável</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variaveisFixas.map((vf) => (
                  <TableRow key={vf.id}>
                    <TableCell>
                      {vf.variavel?.tipo === "provento" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Provento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Desconto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{vf.variavel?.nome}</TableCell>
                    <TableCell>{vf.variavel?.codigo || "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-32"
                        defaultValue={vf.valor}
                        onBlur={(e) => {
                          const newValor = parseFloat(e.target.value);
                          if (!isNaN(newValor) && newValor !== vf.valor) {
                            updateMutation.mutate({ id: vf.id, valor: newValor });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={vf.ativo}
                        onCheckedChange={(checked) => 
                          updateMutation.mutate({ id: vf.id, ativo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(vf.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
