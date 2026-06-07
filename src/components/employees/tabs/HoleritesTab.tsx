import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ShieldCheck } from "lucide-react";
import HoleriteDialog from "@/components/payroll/HoleriteDialog";
import { AuditoriaHoleriteDialog } from "@/components/holerites-assinatura/AuditoriaHoleriteDialog";

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface HoleritesTabProps {
  employeeId: string;
}

export function HoleritesTab({ employeeId }: HoleritesTabProps) {
  const [selectedPagamento, setSelectedPagamento] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ["holerites-employee", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folha_pagamento")
        .select(`
          *,
          employees(nome_completo, cargo, tipo_contrato, setor, cpf, data_admissao),
          folha_pagamento_itens(
            id, variavel_id, valor,
            variaveis_folha(id, nome, codigo, tipo)
          )
        `)
        .eq("employee_id", employeeId)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: assinaturas } = useQuery({
    queryKey: ["holerite-assinaturas-employee", employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("holerite_assinaturas")
        .select("id, folha_pagamento_id, status, protocolo, data_assinatura")
        .eq("employee_id", employeeId);
      const map: Record<string, any> = {};
      (data || []).forEach((a) => (map[a.folha_pagamento_id] = a));
      return map;
    },
  });

  if (isLoading) {
    return <div className="p-6">Carregando holerites...</div>;
  }

  if (!pagamentos || pagamentos.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhum holerite encontrado para este funcionário.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Holerites</h3>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              <TableHead className="text-right">Descontos</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.map((pag) => {
              const ass = assinaturas?.[pag.id];
              return (
                <TableRow key={pag.id}>
                  <TableCell className="font-medium">
                    {MESES[pag.mes]}/{pag.ano}
                  </TableCell>
                  <TableCell className="capitalize">{pag.tipo_folha}</TableCell>
                  <TableCell className="text-right">
                    R$ {pag.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {(pag.descontos || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {pag.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {ass?.status === "assinado" ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Assinado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPagamento(pag);
                          setShowDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      {ass?.status === "assinado" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAuditId(ass.id)}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Auditoria
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <HoleriteDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        pagamento={selectedPagamento}
        empresaId={selectedPagamento?.empresa_id || ""}
      />
      <AuditoriaHoleriteDialog
        open={!!auditId}
        onOpenChange={(o) => !o && setAuditId(null)}
        assinaturaId={auditId}
      />
    </div>
  );
}
