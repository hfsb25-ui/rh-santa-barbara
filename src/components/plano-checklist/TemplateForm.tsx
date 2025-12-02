import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface TemplateFormProps {
  template?: any;
  defaultTipo: "admissao" | "desligamento";
  onSaved: () => void;
  onCancel: () => void;
}

export function TemplateForm({ template, defaultTipo, onSaved, onCancel }: TemplateFormProps) {
  const [nome, setNome] = useState(template?.nome || "");
  const [tipo, setTipo] = useState(template?.tipo || defaultTipo);
  const [empresaId, setEmpresaId] = useState(template?.empresa_id || "");
  const [setorId, setSetorId] = useState(template?.setor_id || "");
  const [funcaoId, setFuncaoId] = useState(template?.funcao_id || "");
  const [ativo, setAtivo] = useState(template?.ativo ?? true);
  const [loading, setLoading] = useState(false);
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [funcoes, setFuncoes] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [empRes, setRes, funcRes] = await Promise.all([
      supabase.from("empresas").select("id, nome").order("nome"),
      supabase.from("setores").select("id, nome").order("nome"),
      supabase.from("funcoes").select("id, nome").order("nome"),
    ]);

    if (empRes.data) setEmpresas(empRes.data);
    if (setRes.data) setSetores(setRes.data);
    if (funcRes.data) setFuncoes(funcRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o template.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const data = {
        nome: nome.trim(),
        tipo,
        empresa_id: empresaId || null,
        setor_id: setorId || null,
        funcao_id: funcaoId || null,
        ativo,
      };

      if (template) {
        const { error } = await supabase
          .from("plano_checklist_templates")
          .update(data)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plano_checklist_templates")
          .insert(data);

        if (error) throw error;
      }

      toast({
        title: template ? "Template atualizado" : "Template criado",
        description: "As alterações foram salvas com sucesso.",
      });
      onSaved();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Template *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Template de Admissão - Produção"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admissao">Admissão</SelectItem>
            <SelectItem value="desligamento">Desligamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Empresa (opcional)</Label>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as empresas</SelectItem>
            {empresas.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Setor (opcional)</Label>
        <Select value={setorId} onValueChange={setSetorId}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os setores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os setores</SelectItem>
            {setores.map((set) => (
              <SelectItem key={set.id} value={set.id}>
                {set.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Função (opcional)</Label>
        <Select value={funcaoId} onValueChange={setFuncaoId}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as funções</SelectItem>
            {funcoes.map((func) => (
              <SelectItem key={func.id} value={func.id}>
                {func.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Template ativo</Label>
        <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
