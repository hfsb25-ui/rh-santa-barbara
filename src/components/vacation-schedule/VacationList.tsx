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
import { Edit, Trash2, AlertCircle, CheckCircle, FileDown } from "lucide-react";
import { ExportVacationDialog } from "./ExportVacationDialog";
import { supabase } from "@/integrations/supabase/client";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ApproveVacationDialog } from "./ApproveVacationDialog";
import EditPlannedVacationDialog from "./EditPlannedVacationDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VacationListProps {
  filters: VacationFiltersType;
  onRefresh: () => void;
}

interface VacationItem {
  id: string;
  employee_id: string;
  employee_name: string;
  setor: string;
  empresa_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_totais: number;
  status: string;
  has_conflict: boolean;
}

const formatDateSafe = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (!isValid(date)) {
    console.error("VacationList - data inválida:", dateString);
    return "-";
  }
  try {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("VacationList - erro ao formatar data:", dateString, error);
    return "-";
  }
};

export function VacationList({ filters, onRefresh }: VacationListProps) {
  const [vacations, setVacations] = useState<VacationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<VacationItem | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    fetchVacations();
  }, [filters]);

  const fetchVacations = async () => {
    setLoading(true);
    const now = new Date();

    console.log("🔍 VacationList - Iniciando busca de férias", { filters });

    // 1) Buscar funcionários conforme os filtros
    let employeesQuery = supabase
      .from("employees")
      .select("id, nome_completo, setor, empresa_id, empresas(nome)");

    if (filters.empresa && filters.empresa !== "all") {
      employeesQuery = employeesQuery.eq("empresa_id", filters.empresa);
    }

    if (filters.setor && filters.setor !== "all") {
      employeesQuery = employeesQuery.eq("setor", filters.setor);
    }

    if (filters.search) {
      employeesQuery = employeesQuery.ilike("nome_completo", `%${filters.search}%`);
    }

    const { data: employees, error: employeesError } = await employeesQuery;

    console.log("📋 VacationList - Funcionários encontrados:", employees?.length, { employees, employeesError });

    if (employeesError) {
      console.error("❌ VacationList - Erro ao buscar funcionários:", employeesError);
      toast.error("Erro ao carregar funcionários para as férias");
      setVacations([]);
      setLoading(false);
      return;
    }

    if (!employees || employees.length === 0) {
      console.log("⚠️ VacationList - Nenhum funcionário encontrado");
      setVacations([]);
      setLoading(false);
      return;
    }

    const employeesById: Record<string, any> = {};
    for (const emp of employees) {
      employeesById[emp.id] = emp;
    }

    const employeeIds = employees.map((e: any) => e.id);

    // 2) Férias planejadas
    const { data: plannedData, error: plannedError } = await supabase
      .from("ferias_planejadas")
      .select("*")
      .in("employee_id", employeeIds);

    console.log("📅 VacationList - Férias planejadas:", plannedData?.length, { plannedData, plannedError });

    // 3) Férias confirmadas (tabela ferias)
    const { data: confirmedData, error: confirmedError } = await supabase
      .from("ferias")
      .select("*")
      .in("employee_id", employeeIds);

    console.log("✅ VacationList - Férias confirmadas:", confirmedData?.length, { confirmedData, confirmedError });

    if (plannedError || confirmedError) {
      console.error("❌ VacationList - Erro ao buscar férias:", { plannedError, confirmedError });
      toast.error("Erro ao carregar férias");
      setVacations([]);
      setLoading(false);
      return;
    }

    const allVacations: VacationItem[] = [];

    (plannedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      allVacations.push({
        id: item.id,
        employee_id: item.employee_id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "Sem Setor",
        empresa_nome: emp?.empresas?.nome || "Sem Empresa",
        periodo_inicio: item.periodo_inicio,
        periodo_fim: item.periodo_fim,
        dias_totais: item.dias_totais,
        status: item.status || "planejado",
        has_conflict: false,
      });
    });

    (confirmedData || []).forEach((item: any) => {
      const emp = employeesById[item.employee_id];
      const start = new Date(item.periodo_gozo_inicio);
      const end = new Date(item.periodo_gozo_fim);
      let status: string;
      if (now < start) status = "aprovado";
      else if (now > end) status = "concluido";
      else status = "em_andamento";

      allVacations.push({
        id: item.id,
        employee_id: item.employee_id,
        employee_name: emp?.nome_completo || "Funcionário não encontrado",
        setor: emp?.setor || "Sem Setor",
        empresa_nome: emp?.empresas?.nome || "Sem Empresa",
        periodo_inicio: item.periodo_gozo_inicio,
        periodo_fim: item.periodo_gozo_fim,
        dias_totais: item.dias_totais,
        status,
        has_conflict: false,
      });
    });

    console.log("🔄 VacationList - Total de férias combinadas:", allVacations.length, { allVacations });

    // Filtro por status (aplicado após combinar planejadas + confirmadas)
    const filteredVacations =
      filters.status && filters.status !== "all"
        ? allVacations.filter((v) => v.status === filters.status)
        : allVacations;

    console.log("🎯 VacationList - Após filtro de status:", filteredVacations.length, { filters, filteredVacations });

    // Ordenar por início desc
    filteredVacations.sort(
      (a, b) => new Date(b.periodo_inicio).getTime() - new Date(a.periodo_inicio).getTime()
    );

    setVacations(filteredVacations);
    setLoading(false);
    console.log("✨ VacationList - Busca finalizada. Total exibido:", filteredVacations.length);
  };

  const handleApprove = (vacation: VacationItem) => {
    setSelectedVacation(vacation);
    setShowApproveDialog(true);
  };

  const handleEdit = (vacation: VacationItem) => {
    setSelectedVacation(vacation);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (vacation: VacationItem) => {
    setVacationToDelete(vacation);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vacationToDelete) return;

    try {
      const tableName = vacationToDelete.status === "planejado" ? "ferias_planejadas" : "ferias";
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", vacationToDelete.id);

      if (error) throw error;

      toast.success("Férias excluídas com sucesso");
      setShowDeleteDialog(false);
      setVacationToDelete(null);
      fetchVacations();
      onRefresh();
    } catch (error) {
      console.error("Erro ao excluir férias:", error);
      toast.error("Erro ao excluir férias");
    }
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
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Férias</CardTitle>
        <Button variant="outline" onClick={() => setShowExportDialog(true)}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportar
        </Button>
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
                    {formatDateSafe(vacation.periodo_inicio)} -{" "}
                    {formatDateSafe(vacation.periodo_fim)}
                  </TableCell>
                  <TableCell className="text-center">{vacation.dias_totais}</TableCell>
                  <TableCell>{getStatusBadge(vacation.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {vacation.status === "planejado" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(vacation)}
                          title="Aprovar férias"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(vacation)}
                        title="Editar férias"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(vacation)}
                        title="Excluir férias"
                      >
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
    
    <ApproveVacationDialog
      open={showApproveDialog}
      onOpenChange={setShowApproveDialog}
      plannedVacation={selectedVacation}
      onSuccess={() => {
        fetchVacations();
        onRefresh();
      }}
    />

    <EditPlannedVacationDialog
      open={showEditDialog}
      onOpenChange={setShowEditDialog}
      vacation={selectedVacation}
      onUpdated={() => {
        fetchVacations();
        onRefresh();
      }}
    />

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir estas férias? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <ExportVacationDialog
      open={showExportDialog}
      onOpenChange={setShowExportDialog}
    />
    </>
  );
}
