import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReadmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess: () => void;
}

const ReadmitDialog = ({ open, onOpenChange, employee, onSuccess }: ReadmitDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [cargo, setCargo] = useState(employee?.cargo || "");
  const [setor, setSetor] = useState(employee?.setor || "");
  const [salario, setSalario] = useState(employee?.salario?.toString() || "");
  const [empresaId, setEmpresaId] = useState(employee?.empresa_id || "");
  const [iniciarChecklist, setIniciarChecklist] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [funcoes, setFuncoes] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setCargo(employee?.cargo || "");
      setSetor(employee?.setor || "");
      setSalario(employee?.salario?.toString() || "");
      setEmpresaId(employee?.empresa_id || "");
      setDataAdmissao("");
      setIniciarChecklist(false);
      fetchOptions();
    }
  }, [open, employee]);

  const fetchOptions = async () => {
    const [empresasRes, setoresRes, funcoesRes] = await Promise.all([
      supabase.from("empresas").select("id, nome").order("nome"),
      supabase.from("setores").select("id, nome").order("nome"),
      supabase.from("funcoes").select("id, nome").order("nome"),
    ]);
    setEmpresas(empresasRes.data || []);
    setSetores(setoresRes.data || []);
    setFuncoes(funcoesRes.data || []);
  };

  const handleSubmit = async () => {
    if (!dataAdmissao) {
      toast.error("Informe a nova data de admissão");
      return;
    }

    setLoading(true);
    try {
      const newStatus = iniciarChecklist ? "em_admissao" : "ativo";

      const { error } = await supabase
        .from("employees")
        .update({
          status: newStatus,
          data_admissao: dataAdmissao,
          data_desligamento: null,
          cargo,
          setor,
          salario: salario ? parseFloat(salario) : null,
          empresa_id: empresaId || null,
        })
        .eq("id", employee.id);

      if (error) throw error;

      // Se marcou checklist, buscar template de admissão e criar checklist
      if (iniciarChecklist) {
        const { data: templates } = await supabase
          .from("plano_checklist_templates")
          .select("id")
          .eq("tipo", "admissao")
          .eq("ativo", true)
          .limit(1);

        if (templates && templates.length > 0) {
          const templateId = templates[0].id;

          // Buscar itens do template
          const { data: itens } = await supabase
            .from("plano_checklist_itens")
            .select("*")
            .eq("template_id", templateId)
            .order("ordem");

          // Criar checklist do funcionário
          const { data: checklist, error: checklistError } = await supabase
            .from("plano_checklist_funcionario")
            .insert({
              employee_id: employee.id,
              template_id: templateId,
              tipo: "admissao",
              status: "em_andamento",
            })
            .select()
            .single();

          if (!checklistError && checklist && itens && itens.length > 0) {
            const checklistItens = itens.map((item) => ({
              checklist_funcionario_id: checklist.id,
              item_id: item.id,
              titulo: item.titulo,
              descricao: item.descricao,
              ordem: item.ordem,
              obrigatorio: item.obrigatorio,
              prazo_dias: item.prazo_dias,
            }));

            await supabase.from("plano_checklist_funcionario_itens").insert(checklistItens);
          }
        }
      }

      toast.success("Funcionário readmitido com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao readmitir:", error);
      toast.error(error.message || "Erro ao readmitir funcionário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Readmitir Funcionário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Readmitindo <strong>{employee?.nome_completo}</strong>. Todo o histórico será mantido.
          </p>

          <div className="space-y-2">
            <Label>Nova Data de Admissão *</Label>
            <Input
              type="date"
              value={dataAdmissao}
              onChange={(e) => setDataAdmissao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cargo / Função</Label>
            <Select value={cargo} onValueChange={setCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {funcoes.map((f) => (
                  <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salário</Label>
            <Input
              type="number"
              step="0.01"
              value={salario}
              onChange={(e) => setSalario(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="checklist"
              checked={iniciarChecklist}
              onCheckedChange={(v) => setIniciarChecklist(v === true)}
            />
            <Label htmlFor="checklist" className="cursor-pointer">
              Iniciar checklist de admissão
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Readmitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReadmitDialog;
