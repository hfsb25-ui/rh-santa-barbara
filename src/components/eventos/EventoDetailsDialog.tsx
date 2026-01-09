import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Download, Trash2, Cloud, CloudOff, CheckCircle2, Circle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { downloadEventAsICS } from "@/lib/icsGenerator";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  local: string | null;
  tipo: string;
  cor: string;
  google_event_id?: string | null;
  concluido?: boolean | null;
}

interface EventoDetailsDialogProps {
  evento: Evento | null;
  onClose: () => void;
  onDelete: () => void;
}

const tipoLabels: Record<string, string> = {
  geral: "Geral",
  reuniao: "Reunião",
  treinamento: "Treinamento",
  feriado: "Feriado",
  evento_empresa: "Evento da Empresa",
};

const EventoDetailsDialog = ({ evento, onClose, onDelete }: EventoDetailsDialogProps) => {
  const { connected: googleConnected, deleteFromGoogle, syncToGoogle } = useGoogleCalendar();
  const [toggling, setToggling] = useState(false);

  if (!evento) return null;

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    // Delete from Google Calendar if synced
    if (evento.google_event_id && googleConnected) {
      await deleteFromGoogle(evento.google_event_id);
    }

    const { error } = await supabase.from("eventos").delete().eq("id", evento.id);
    if (error) {
      toast.error("Erro ao excluir evento");
      return;
    }
    toast.success("Evento excluído");
    onDelete();
  };

  const handleToggleConcluido = async () => {
    setToggling(true);
    const novoConcluido = !evento.concluido;
    
    const { error } = await supabase
      .from("eventos")
      .update({ 
        concluido: novoConcluido,
        concluido_em: novoConcluido ? new Date().toISOString() : null
      })
      .eq("id", evento.id);

    if (error) {
      toast.error("Erro ao atualizar evento");
      setToggling(false);
      return;
    }
    
    toast.success(novoConcluido ? "Evento marcado como concluído!" : "Evento reaberto!");
    setToggling(false);
    onDelete(); // This triggers refresh
  };

  const handleDownloadICS = () => {
    downloadEventAsICS(evento);
    toast.success("Arquivo .ics baixado! Importe no seu calendário.");
  };

  const handleSyncToGoogle = async () => {
    if (!googleConnected) {
      toast.error("Conecte-se ao Google Calendar primeiro");
      return;
    }

    const googleEventId = await syncToGoogle({
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao,
      data_inicio: evento.data_inicio,
      data_fim: evento.data_fim,
      local: evento.local,
      google_event_id: evento.google_event_id,
    });

    if (googleEventId && !evento.google_event_id) {
      await supabase.from("eventos").update({ google_event_id: googleEventId }).eq("id", evento.id);
    }
  };

  return (
    <Dialog open={!!evento} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: evento.concluido ? "#9CA3AF" : evento.cor }}
            />
            <span className={evento.concluido ? "line-through text-muted-foreground" : ""}>
              {evento.titulo}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {tipoLabels[evento.tipo] || evento.tipo}
            </Badge>
            {evento.concluido && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Concluído
              </Badge>
            )}
            {evento.google_event_id ? (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Cloud className="w-3 h-3 mr-1" />
                Sincronizado
              </Badge>
            ) : googleConnected ? (
              <Badge variant="outline" className="text-muted-foreground">
                <CloudOff className="w-3 h-3 mr-1" />
                Não sincronizado
              </Badge>
            ) : null}
          </div>

          {evento.descricao && (
            <p className="text-muted-foreground">{evento.descricao}</p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {format(parseISO(evento.data_inicio), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {format(parseISO(evento.data_inicio), "HH:mm")} - {format(parseISO(evento.data_fim), "HH:mm")}
            </div>
            {evento.local && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {evento.local}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              variant={evento.concluido ? "outline" : "default"}
              size="sm"
              onClick={handleToggleConcluido}
              disabled={toggling}
            >
              {evento.concluido ? (
                <>
                  <Circle className="w-4 h-4 mr-2" />
                  Reabrir
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadICS}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar .ics
            </Button>
            
            {googleConnected && !evento.google_event_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncToGoogle}
              >
                <Cloud className="w-4 h-4 mr-2" />
                Sincronizar
              </Button>
            )}
            
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventoDetailsDialog;
