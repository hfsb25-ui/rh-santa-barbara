import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Smile, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClimaResponder() {
  const { token } = useParams();
  const [estado, setEstado] = useState<"validando" | "valido" | "invalido" | "enviado">("validando");
  const [pesquisa, setPesquisa] = useState<any>(null);
  const [tokenRow, setTokenRow] = useState<any>(null);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return setEstado("invalido");
      const { data: tk } = await (supabase.from("nr1_pesquisa_tokens") as any)
        .select("*").eq("token", token).maybeSingle();
      if (!tk || tk.usado) return setEstado("invalido");
      const { data: p } = await (supabase.from("nr1_pesquisas_clima") as any)
        .select("*").eq("id", tk.pesquisa_id).maybeSingle();
      if (!p || p.status !== "ativa") return setEstado("invalido");
      setTokenRow(tk); setPesquisa(p); setEstado("valido");
    })();
  }, [token]);

  const enviar = async () => {
    const perguntas: any[] = pesquisa.perguntas || [];
    const respostas = perguntas.map((q) => ({ pergunta_id: q.id, valor: valores[q.id] || 0 }));
    if (respostas.some((r) => !r.valor)) return toast.error("Responda todas as perguntas");
    setEnviando(true);
    const { error } = await (supabase.from("nr1_clima_respostas") as any).insert({
      pesquisa_id: pesquisa.id,
      respostas,
      comentario: comentario || null,
    });
    if (error) { setEnviando(false); return toast.error(error.message); }
    await (supabase.from("nr1_pesquisa_tokens") as any)
      .update({ usado: true, usado_em: new Date().toISOString() }).eq("id", tokenRow.id);
    setEstado("enviado");
  };

  if (estado === "validando")
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Validando link...</div>;
  if (estado === "invalido")
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center shadow-elegant">
          <h2 className="text-xl font-bold mb-2">Link inválido</h2>
          <p className="text-muted-foreground">Este link já foi utilizado ou expirou.</p>
        </Card>
      </div>
    );
  if (estado === "enviado")
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center shadow-elegant">
          <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Resposta enviada</h2>
          <p className="text-muted-foreground">Obrigado pela sua participação anônima.</p>
        </Card>
      </div>
    );

  const perguntas: any[] = pesquisa.perguntas || [];

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-2">
            <Smile className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{pesquisa.titulo}</h1>
          </div>
          {pesquisa.descricao && <p className="text-muted-foreground mb-2">{pesquisa.descricao}</p>}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Resposta 100% anônima. Nenhuma identificação é armazenada.
          </p>
        </Card>

        {perguntas.map((q) => (
          <Card key={q.id} className="p-4">
            <p className="mb-3 font-medium">{q.texto}</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={valores[q.id] === n ? "default" : "outline"}
                  onClick={() => setValores({ ...valores, [q.id]: n })}
                >
                  {n}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Discordo totalmente</span><span>Concordo totalmente</span>
            </div>
          </Card>
        ))}

        <Card className="p-4">
          <p className="mb-2 font-medium">Comentário adicional (opcional)</p>
          <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="..." />
        </Card>

        <Button onClick={enviar} disabled={enviando} className="w-full" size="lg">
          {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar resposta
        </Button>
      </div>
    </div>
  );
}
