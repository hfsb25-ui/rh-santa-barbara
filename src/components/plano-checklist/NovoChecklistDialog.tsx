import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface NovoChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "admissao" | "desligamento";
  onCreated: () => void;
}

export function NovoChecklistDialog({
  open,
  onOpenChange,
  tipo,
  onCreated,
}: NovoChecklistDialogProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, tipo]);

  const fetchData = async () => {
    try {
      // Fetch employees based on tipo
      const statusFilter = tipo === "admissao" ? "ativo" : "ativo";
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo, setor")
        .eq("status", statusFilter)
        .order("nome_completo");

      if (empError) throw empError;

      // Filter out employees that already have an active checklist of this type
      const { data: activeChecklists, error: checklistError } = await supabase
        .from("plano_checklist_funcionario")
        .select("employee_id")
        .eq("tipo", tipo)
        .eq("status", "em_andamento");

      if (checklistError) throw checklistError;

      const activeEmployeeIds = new Set(activeChecklists?.map((c) => c.employee_id));
      const availableEmployees = empData?.filter((e) => !activeEmployeeIds.has(e.id)) || [];
      setEmployees(availableEmployees);

      // Fetch templates
      const { data: tempData, error: tempError } = await supabase
        .from("plano_checklist_templates")
        .select("id, nome")
        .eq("tipo", tipo)
        .eq("ativo", true);

      if (tempError) throw tempError;
      setTemplates(tempData || []);

      // Auto-select first template if available
      if (tempData && tempData.length > 0) {
        setSelectedTemplate(tempData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    if (!selectedEmployee || !selectedTemplate) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um funcionário e um template.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get template items
      const { data: templateItems, error: itemsError } = await supabase
        .from("plano_checklist_itens")
        .select("*")
        .eq("template_id", selectedTemplate)
        .order("ordem");

      if (itemsError) throw itemsError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create checklist
      const { data: checklist, error: checklistError } = await supabase
        .from("plano_checklist_funcionario")
        .insert({
          employee_id: selectedEmployee,
          template_id: selectedTemplate,
          tipo,
          created_by: user?.id,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create checklist items
      const checklistItems = templateItems?.map((item) => ({
        checklist_funcionario_id: checklist.id,
        item_id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        ordem: item.ordem,
        obrigatorio: item.obrigatorio,
        prazo_dias: item.prazo_dias,
      }));

      if (checklistItems && checklistItems.length > 0) {
        const { error: insertError } = await supabase
          .from("plano_checklist_funcionario_itens")
          .insert(checklistItems);

        if (insertError) throw insertError;
      }

      toast({
        title: "Checklist criado",
        description: `Processo de ${tipo === "admissao" ? "admissão" : "desligamento"} iniciado com sucesso.`,
      });

      setSelectedEmployee("");
      onCreated();
    } catch (error: any) {
      toast({
        title: "Erro ao criar checklist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Novo {tipo === "admissao" ? "Processo de Admissão" : "Processo de Desligamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome_completo} - {emp.cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum funcionário disponível para este processo.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((temp) => (
                  <SelectItem key={temp.id} value={temp.id}>
                    {temp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading || !selectedEmployee}>
              {loading ? "Criando..." : "Criar Checklist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
