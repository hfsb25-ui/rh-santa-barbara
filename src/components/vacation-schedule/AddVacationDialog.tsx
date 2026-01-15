import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";

interface AddVacationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onSuccess: () => void;
}

export function AddVacationDialog({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
}: AddVacationDialogProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);

  // Calcular dias totais
  const diasTotais = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = differenceInDays(end, start) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  }, [startDate, endDate]);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (selectedDate) {
        const formattedStart = format(selectedDate, "yyyy-MM-dd");
        setStartDate(formattedStart);
        // Auto-preencher data final 30 dias depois
        const endDateValue = addDays(selectedDate, 29);
        setEndDate(format(endDateValue, "yyyy-MM-dd"));
      }
    }
  }, [open, selectedDate]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, nome_completo")
      .eq("status", "ativo")
      .order("nome_completo");
    
    if (data) setEmployees(data);
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate) {
      const start = new Date(newStartDate);
      const end = addDays(start, 29); // 30 dias incluindo o primeiro
      setEndDate(format(end, "yyyy-MM-dd"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !startDate || !endDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("ferias_planejadas").insert({
      employee_id: selectedEmployee,
      periodo_inicio: startDate,
      periodo_fim: endDate,
      dias_totais: diasTotais,
      status: "planejado",
      observacoes: observations,
      criado_por: (await supabase.auth.getUser()).data.user?.id,
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao adicionar férias");
      return;
    }

    toast.success("Férias adicionadas com sucesso");
    onSuccess();
    resetForm();
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setStartDate("");
    setEndDate("");
    setObservations("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Férias</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Funcionário</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {diasTotais > 0 && (
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm font-medium">
                Total de dias: <span className="text-lg">{diasTotais}</span>{" "}
                {diasTotais === 1 ? "dia" : "dias"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações sobre as férias..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || diasTotais === 0}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
