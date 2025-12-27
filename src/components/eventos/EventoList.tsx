import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Edit, Trash2, ExternalLink } from "lucide-react";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import EventoForm from "./EventoForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

interface EventoListProps {
  onRefresh: () => void;
}

const EventoList = ({ onRefresh }: EventoListProps) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);

  useEffect(() => {
    fetchEventos();
  }, [filter]);

  const fetchEventos = async () => {
    let query = supabase.from("eventos").select("*").order("data_inicio", { ascending: filter !== "past" });

    const now = new Date().toISOString();
    if (filter === "upcoming") {
      query = query.gte("data_inicio", now);
    } else if (filter === "past") {
      query = query.lt("data_inicio", now);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar eventos");
      return;
    }
    setEventos(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir evento");
      return;
    }
    toast.success("Evento excluído");
    fetchEventos();
    onRefresh();
  };

  const generateGoogleCalendarLink = (evento: Evento) => {
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

  const tipoLabels: Record<string, string> = {
    geral: "Geral",
    reuniao: "Reunião",
    treinamento: "Treinamento",
    feriado: "Feriado",
    evento_empresa: "Evento da Empresa",
  };

  return (
    <>
      <Dialog open={!!editingEvento} onOpenChange={(open) => !open && setEditingEvento(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          {editingEvento && (
            <EventoForm
              evento={editingEvento}
              onSaved={() => {
                setEditingEvento(null);
                fetchEventos();
                onRefresh();
              }}
              onCancel={() => setEditingEvento(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Eventos</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("upcoming")}
              >
                Próximos
              </Button>
              <Button
                variant={filter === "past" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("past")}
              >
                Passados
              </Button>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum evento encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {eventos.map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div
                    className="w-2 h-full min-h-16 rounded-full"
                    style={{ backgroundColor: evento.cor }}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{evento.titulo}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {tipoLabels[evento.tipo] || evento.tipo}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(generateGoogleCalendarLink(evento), "_blank")}
                          title="Adicionar ao Google Calendar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEvento(evento)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(evento.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {evento.descricao && (
                      <p className="text-sm text-muted-foreground mt-2">{evento.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(evento.data_inicio), "HH:mm")} - {format(parseISO(evento.data_fim), "HH:mm")}
                      </div>
                      {evento.local && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {evento.local}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default EventoList;
