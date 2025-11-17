import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EpiStockFormProps {
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

const EpiStockForm = ({ initialData, onSaved, onCancel }: EpiStockFormProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tipo_epi: formData.get("tipo_epi") as string,
      marca_modelo: formData.get("marca_modelo") as string || null,
      ca: formData.get("ca") as string || null,
      tamanho: formData.get("tamanho") as string || null,
      quantidade_estoque: parseInt(formData.get("quantidade_estoque") as string),
      quantidade_minima: parseInt(formData.get("quantidade_minima") as string),
      finalidade: formData.get("finalidade") as string || null,
      observacoes: formData.get("observacoes") as string || null,
    };

    let error;
    if (initialData) {
      ({ error } = await supabase
        .from("estoque_epis")
        .update(data)
        .eq("id", initialData.id));
    } else {
      ({ error } = await supabase.from("estoque_epis").insert(data));
    }

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
      console.error(error);
    } else {
      toast.success(initialData ? "EPI atualizado!" : "EPI cadastrado no estoque!");
      onSaved();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tipo de EPI *</Label>
        <Input name="tipo_epi" defaultValue={initialData?.tipo_epi} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Marca/Modelo</Label>
          <Input name="marca_modelo" defaultValue={initialData?.marca_modelo} />
        </div>
        <div>
          <Label>CA (Certificado de Aprovação)</Label>
          <Input name="ca" defaultValue={initialData?.ca} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tamanho</Label>
          <Input name="tamanho" defaultValue={initialData?.tamanho} />
        </div>
        <div>
          <Label>Finalidade/Proteção</Label>
          <Input name="finalidade" defaultValue={initialData?.finalidade} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantidade em Estoque *</Label>
          <Input 
            name="quantidade_estoque" 
            type="number" 
            defaultValue={initialData?.quantidade_estoque || 0} 
            required 
          />
        </div>
        <div>
          <Label>Quantidade Mínima *</Label>
          <Input 
            name="quantidade_minima" 
            type="number" 
            defaultValue={initialData?.quantidade_minima || 10} 
            required 
          />
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea name="observacoes" defaultValue={initialData?.observacoes} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {initialData ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default EpiStockForm;
