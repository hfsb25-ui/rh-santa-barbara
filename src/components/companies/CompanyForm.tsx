import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CompanyFormProps {
  companyId?: string;
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ companyId, initialData, onSaved, onCancel }: CompanyFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const cnpj = formData.get("cnpj") as string;

    const companyData = {
      nome,
      cnpj: cnpj || null,
    };

    let error;
    if (companyId) {
      const result = await supabase
        .from("empresas")
        .update(companyData)
        .eq("id", companyId);
      error = result.error;
    } else {
      const result = await supabase.from("empresas").insert(companyData);
      error = result.error;
    }

    if (error) {
      toast.error("Erro ao salvar empresa");
      console.error(error);
    } else {
      toast.success(companyId ? "Empresa atualizada com sucesso" : "Empresa cadastrada com sucesso");
      onSaved();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome da Empresa *</Label>
        <Input id="nome" name="nome" defaultValue={initialData?.nome} required />
      </div>

      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" defaultValue={initialData?.cnpj} />
      </div>

      <div className="flex gap-2 justify-end">
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
