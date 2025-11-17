import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface EmployeeFormProps {
  employeeId?: string;
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

const EmployeeForm = ({ employeeId, initialData, onSaved, onCancel }: EmployeeFormProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      nome_completo: formData.get("nome_completo") as string,
      cargo: formData.get("cargo") as string,
      setor: formData.get("setor") as string || null,
      cpf: formData.get("cpf") as string || null,
      telefone: formData.get("telefone") as string || null,
      endereco: formData.get("endereco") as string || null,
      data_admissao: formData.get("data_admissao") as string || null,
      status: (formData.get("status") as "ativo" | "ferias" | "afastado" | "demitido") || "ativo",
    };

    let error;
    if (employeeId) {
      ({ error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", employeeId));
    } else {
      ({ error } = await supabase.from("employees").insert([data]));
    }

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar funcionário");
    } else {
      toast.success(employeeId ? "Funcionário atualizado!" : "Funcionário cadastrado!");
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employeeId ? "Editar Funcionário" : "Novo Funcionário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome Completo</Label>
              <Input name="nome_completo" defaultValue={initialData?.nome_completo} required />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input name="cargo" defaultValue={initialData?.cargo} required />
            </div>
            <div>
              <Label>Setor</Label>
              <Input name="setor" defaultValue={initialData?.setor} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input name="cpf" defaultValue={initialData?.cpf} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input name="telefone" defaultValue={initialData?.telefone} />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input name="endereco" defaultValue={initialData?.endereco} />
            </div>
            <div>
              <Label>Data de Admissão</Label>
              <Input name="data_admissao" type="date" defaultValue={initialData?.data_admissao} />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={initialData?.status || "ativo"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                  <SelectItem value="demitido">Demitido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>Salvar</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
