import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Contact, Plus, Trash2, Edit2, Save, X } from "lucide-react";

interface Contato {
  id: string;
  nome: string;
  numero: string;
  observacoes: string | null;
}

export function WhatsAppContatos() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", numero: "", observacoes: "" });
  const [editForm, setEditForm] = useState({ nome: "", numero: "", observacoes: "" });

  useEffect(() => {
    loadContatos();
  }, []);

  const loadContatos = async () => {
    const { data, error } = await supabase
      .from("whatsapp_contatos" as any)
      .select("*")
      .order("nome");
    if (!error) setContatos((data as any) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.nome.trim() || !form.numero.trim()) {
      toast.error("Nome e número são obrigatórios");
      return;
    }
    const numero = form.numero.replace(/\D/g, "");
    const { error } = await supabase
      .from("whatsapp_contatos" as any)
      .insert({ nome: form.nome.trim(), numero, observacoes: form.observacoes.trim() || null } as any);
    if (error) {
      toast.error("Erro ao adicionar contato");
      return;
    }
    toast.success("Contato adicionado!");
    setForm({ nome: "", numero: "", observacoes: "" });
    setAdding(false);
    loadContatos();
  };

  const handleEdit = async (id: string) => {
    if (!editForm.nome.trim() || !editForm.numero.trim()) {
      toast.error("Nome e número são obrigatórios");
      return;
    }
    const numero = editForm.numero.replace(/\D/g, "");
    const { error } = await supabase
      .from("whatsapp_contatos" as any)
      .update({ nome: editForm.nome.trim(), numero, observacoes: editForm.observacoes.trim() || null } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar contato");
      return;
    }
    toast.success("Contato atualizado!");
    setEditingId(null);
    loadContatos();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("whatsapp_contatos" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover contato");
      return;
    }
    toast.success("Contato removido!");
    loadContatos();
  };

  const startEdit = (c: Contato) => {
    setEditingId(c.id);
    setEditForm({ nome: c.nome, numero: c.numero, observacoes: c.observacoes || "" });
  };

  const formatPhone = (num: string) => {
    if (num.length >= 12) {
      return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 9)}-${num.slice(9)}`;
    }
    return num;
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" />
              Contatos para Envio de Mensagens
            </CardTitle>
            <CardDescription>
              Salve contatos aqui e peça ao Cérebrum no WhatsApp para enviar mensagens ou lembretes para eles.
            </CardDescription>
          </div>
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: João da Manutenção"
                  value={form.nome}
                  onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Número (com DDI)</Label>
                <Input
                  placeholder="5511999999999"
                  value={form.numero}
                  onChange={(e) => setForm(p => ({ ...p, numero: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Input
                  placeholder="Ex: Fornecedor de EPIs"
                  value={form.observacoes}
                  onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        {contatos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum contato salvo. Adicione contatos e peça ao Cérebrum: "Mande uma mensagem para o João dizendo que..."
          </p>
        ) : (
          <div className="space-y-2">
            {contatos.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                {editingId === c.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 mr-2">
                    <Input value={editForm.nome} onChange={(e) => setEditForm(p => ({ ...p, nome: e.target.value }))} />
                    <Input value={editForm.numero} onChange={(e) => setEditForm(p => ({ ...p, numero: e.target.value }))} />
                    <Input value={editForm.observacoes} onChange={(e) => setEditForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(c.numero)}
                      {c.observacoes && ` · ${c.observacoes}`}
                    </p>
                  </div>
                )}
                <div className="flex gap-1">
                  {editingId === c.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(c.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
