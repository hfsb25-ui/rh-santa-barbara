import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface UniformStockFormProps {
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

const UniformStockForm = ({ initialData, onSaved, onCancel }: UniformStockFormProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tipo_uniforme: formData.get("tipo_uniforme") as string,
      tamanho: formData.get("tamanho") as string,
      quantidade_estoque: parseInt(formData.get("quantidade_estoque") as string),
      quantidade_minima: parseInt(formData.get("quantidade_minima") as string),
      cor: formData.get("cor") as string || null,
      observacoes: formData.get("observacoes") as string || null,
    };

    let error;
    if (initialData) {
      ({ error } = await supabase
        .from("estoque_uniformes")
        .update(data)
        .eq("id", initialData.id));
    } else {
      ({ error } = await supabase.from("estoque_uniformes").insert(data));
    }

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
      console.error(error);
    } else {
      toast.success(initialData ? "Uniforme atualizado!" : "Uniforme cadastrado no estoque!");
      onSaved();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Uniforme *</Label>
          <Input name="tipo_uniforme" defaultValue={initialData?.tipo_uniforme} required />
        </div>
        <div>
          <Label>Tamanho *</Label>
          <Input name="tamanho" defaultValue={initialData?.tamanho} required />
        </div>
      </div>
      <div>
        <Label>Cor</Label>
        <Input name="cor" defaultValue={initialData?.cor} />
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

export default UniformStockForm;
