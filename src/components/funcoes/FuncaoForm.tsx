import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FuncaoFormProps {
  funcaoId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

const FuncaoForm = ({ funcaoId, onSaved, onCancel }: FuncaoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [cbo, setCbo] = useState("");

  useEffect(() => {
    if (funcaoId) {
      fetchFuncao();
    }
  }, [funcaoId]);

  const fetchFuncao = async () => {
    try {
      const { data, error } = await supabase
        .from("funcoes")
        .select("*")
        .eq("id", funcaoId)
        .single();

      if (error) throw error;
      if (data) {
        setNome(data.nome);
        setCbo(data.cbo || "");
      }
    } catch (error) {
      console.error("Erro ao carregar função:", error);
      toast.error("Erro ao carregar função");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (funcaoId) {
        const { error } = await supabase
          .from("funcoes")
          .update({ nome, cbo: cbo || null })
          .eq("id", funcaoId);

        if (error) throw error;
        toast.success("Função atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("funcoes")
          .insert({ nome, cbo: cbo || null });

        if (error) throw error;
        toast.success("Função cadastrada com sucesso!");
      }

      onSaved();
    } catch (error) {
      console.error("Erro ao salvar função:", error);
      toast.error("Erro ao salvar função");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome da Função *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          placeholder="Ex: Recepcionista, Garçom, etc."
        />
      </div>

      <div>
        <Label htmlFor="cbo">CBO (Classificação Brasileira de Ocupações)</Label>
        <Input
          id="cbo"
          value={cbo}
          onChange={(e) => setCbo(e.target.value)}
          placeholder="Ex: 5134-05"
        />
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
};

export default FuncaoForm;
