import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, ExternalLink, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  local: string | null;
  tipo: string;
  cor: string;
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
  if (!evento) return null;

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    const { error } = await supabase.from("eventos").delete().eq("id", evento.id);
    if (error) {
      toast.error("Erro ao excluir evento");
      return;
    }
    toast.success("Evento excluído");
    onDelete();
  };

  const generateGoogleCalendarLink = () => {
    const start = format(parseISO(evento.data_inicio), "yyyyMMdd'T'HHmmss");
    const end = format(parseISO(evento.data_fim), "yyyyMMdd'T'HHmmss");
    
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: evento.titulo,
      dates: `${start}/${end}`,
      details: evento.descricao || "",
      location: evento.local || "",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <Dialog open={!!evento} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: evento.cor }}
            />
            {evento.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Badge variant="secondary">
            {tipoLabels[evento.tipo] || evento.tipo}
          </Badge>

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

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(generateGoogleCalendarLink(), "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Adicionar ao Google
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventoDetailsDialog;
