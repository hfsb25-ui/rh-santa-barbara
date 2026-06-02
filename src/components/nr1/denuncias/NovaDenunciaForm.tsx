import { useState } from "react";
import { todayISO } from "@/lib/date";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CATEGORIAS_DENUNCIA } from "@/lib/nr1/perguntasPadrao";
import { toast } from "sonner";
import { Loader2, Paperclip, CheckCircle2, ShieldCheck, X } from "lucide-react";

interface Props {
  onSuccess?: (protocolo: string) => void;
}

export function NovaDenunciaForm({ onSuccess }: Props) {
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [setor, setSetor] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!categoria || !descricao.trim()) {
      toast.error("Preencha categoria e descrição");
      return;
    }
    setLoading(true);
    try {
      const protoNum = `NR1-${todayISO().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { data: denuncia, error } = await supabase
        .from("nr1_denuncias")
        .insert({
          protocolo: protoNum,
          categoria,
          descricao: descricao.trim(),
          setor: setor.trim() || null,
          status: "recebida",
        })
        .select()
        .single();
      if (error) throw error;

      for (const file of arquivos) {
        const ext = file.name.split(".").pop();
        const path = `${denuncia.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("nr1-denuncias").upload(path, file);
        if (!upErr) {
          await (supabase.from("nr1_denuncias_anexos") as any).insert({
            denuncia_id: denuncia.id,
            file_path: path,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      setProtocolo(protoNum);
      onSuccess?.(protoNum);
      // Limpa qualquer dado da sessão
      setCategoria("");
      setDescricao("");
      setSetor("");
      setArquivos([]);
    } catch (e: any) {
      toast.error("Erro ao enviar denúncia: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (protocolo) {
    return (
      <Card className="p-8 text-center space-y-4 shadow-elegant">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h3 className="text-2xl font-bold">Denúncia enviada com sucesso</h3>
        <p className="text-muted-foreground">Guarde seu protocolo para acompanhamento:</p>
        <div className="text-3xl font-mono font-bold bg-muted py-4 rounded-lg">{protocolo}</div>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4" />
          Sua identidade é 100% anônima. Nenhum dado pessoal foi registrado.
        </p>
        <Button variant="outline" onClick={() => setProtocolo(null)}>Nova denúncia</Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4 shadow-elegant max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-800 p-3 rounded-lg">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        Esta denúncia é <strong>100% anônima</strong>. Nenhuma informação que identifique você será armazenada.
      </div>

      <div>
        <Label>Categoria *</Label>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS_DENUNCIA.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Setor envolvido (opcional)</Label>
        <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Cozinha, Recepção..." />
      </div>

      <div>
        <Label>Descrição detalhada *</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva o ocorrido com o máximo de detalhes possíveis (datas, locais, circunstâncias). Não inclua informações que identifiquem você."
          rows={6}
          maxLength={3000}
        />
        <p className="text-xs text-muted-foreground mt-1">{descricao.length}/3000</p>
      </div>

      <div>
        <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" /> Anexos (imagens, áudios, documentos)</Label>
        <Input
          type="file"
          multiple
          accept="image/*,audio/*,.pdf,.doc,.docx"
          onChange={(e) => setArquivos(Array.from(e.target.files || []))}
        />
        {arquivos.length > 0 && (
          <div className="mt-2 space-y-1">
            {arquivos.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-muted px-2 py-1 rounded">
                <span className="truncate flex-1">{f.name}</span>
                <button onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Enviar Denúncia Anônima
      </Button>
    </Card>
  );
}
