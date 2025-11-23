import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface VacationListProps {
  filters: VacationFiltersType;
  onRefresh: () => void;
}

interface VacationItem {
  id: string;
  employee_name: string;
  setor: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_totais: number;
  status: string;
  has_conflict: boolean;
}

export function VacationList({ filters, onRefresh }: VacationListProps) {
  const [vacations, setVacations] = useState<VacationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVacations();
  }, [filters]);

  const fetchVacations = async () => {
    setLoading(true);
    let query = supabase
      .from("ferias")
      .select(`
        id,
        employee_id,
        periodo_gozo_inicio,
        periodo_gozo_fim,
        dias_totais,
        employees!inner(
          nome_completo,
          setor,
          empresa_id,
          empresas(nome)
        )
      `)
      .order("periodo_gozo_inicio", { ascending: false });

    if (filters.empresa && filters.empresa !== "all") {
      query = query.eq("employees.empresa_id", filters.empresa);
    }

    if (filters.setor && filters.setor !== "all") {
      query = query.eq("employees.setor", filters.setor);
    }

    if (filters.search) {
      query = query.ilike("employees.nome_completo", `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        employee_name: item.employees.nome_completo,
        setor: item.employees.setor || "Sem Setor",
        empresa_nome: item.employees.empresas?.nome || "Sem Empresa",
        periodo_inicio: item.periodo_gozo_inicio,
        periodo_fim: item.periodo_gozo_fim,
        dias_totais: item.dias_totais,
        status: new Date(item.periodo_gozo_fim) < new Date() ? "concluido" : "em_andamento",
        has_conflict: false,
      }));
      setVacations(formatted);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      planejado: { variant: "secondary", label: "Planejado" },
      aprovado: { variant: "default", label: "Aprovado" },
      em_andamento: { variant: "default", label: "Em Andamento" },
      concluido: { variant: "outline", label: "Concluído" },
    };

    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Férias</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : vacations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma féria encontrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacations.map((vacation) => (
                <TableRow key={vacation.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {vacation.has_conflict && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      {vacation.employee_name}
                    </div>
                  </TableCell>
                  <TableCell>{vacation.setor}</TableCell>
                  <TableCell>{vacation.empresa_nome}</TableCell>
                  <TableCell>
                    {format(new Date(vacation.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(new Date(vacation.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-center">{vacation.dias_totais}</TableCell>
                  <TableCell>{getStatusBadge(vacation.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
