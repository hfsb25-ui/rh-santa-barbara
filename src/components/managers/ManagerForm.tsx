import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ManagerFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

export default function ManagerForm({ onSaved, onCancel }: ManagerFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nomeCompleto = formData.get("nome_completo") as string;
    const cpf = formData.get("cpf") as string;
    const senha = formData.get("senha") as string;

    try {
      // Chamar edge function para criar usuário gestor
      const { data, error } = await supabase.functions.invoke('create-manager-user', {
        body: {
          cpf,
          senha,
          nome_completo: nomeCompleto,
        }
      });

      if (error) throw error;

      toast.success("Gestor cadastrado com sucesso!");
      onSaved();
    } catch (error: any) {
      console.error("Erro ao cadastrar gestor:", error);
      toast.error(error.message || "Erro ao cadastrar gestor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Gestor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome_completo" className="text-sm font-medium">
              Nome Completo
            </label>
            <Input
              id="nome_completo"
              name="nome_completo"
              required
              placeholder="Nome completo do gestor"
            />
          </div>

          <div>
            <label htmlFor="cpf" className="text-sm font-medium">
              CPF
            </label>
            <Input
              id="cpf"
              name="cpf"
              required
              placeholder="CPF (será usado como login)"
            />
          </div>

          <div>
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="senha"
              name="senha"
              type="password"
              required
              placeholder="Senha de acesso"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar Gestor"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
