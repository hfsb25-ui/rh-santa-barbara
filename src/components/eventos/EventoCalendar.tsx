import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import EventoDetailsDialog from "./EventoDetailsDialog";

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

interface EventoCalendarProps {
  onAddEvent: (date?: Date) => void;
  onRefresh: () => void;
}

const EventoCalendar = ({ onAddEvent, onRefresh }: EventoCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);

  useEffect(() => {
    fetchEventos();
  }, [currentDate]);

  const fetchEventos = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data } = await supabase
      .from("eventos")
      .select("*")
      .gte("data_inicio", start.toISOString())
      .lte("data_inicio", end.toISOString())
      .order("data_inicio");

    setEventos(data || []);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getEventsForDay = (date: Date) => {
    return eventos.filter((evento) => {
      const eventoDate = parseISO(evento.data_inicio);
      return isSameDay(eventoDate, date);
    });
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Calculate padding days for the first week
  const firstDayOfMonth = startOfMonth(currentDate);
  const paddingDays = firstDayOfMonth.getDay();

  return (
    <>
      <EventoDetailsDialog
        evento={selectedEvento}
        onClose={() => setSelectedEvento(null)}
        onDelete={() => {
          setSelectedEvento(null);
          fetchEventos();
          onRefresh();
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                {day}
              </div>
            ))}
            
            {/* Padding for days before the first of the month */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`padding-${i}`} className="p-2 min-h-24 bg-muted/30 rounded-md" />
            ))}
            
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 min-h-24 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${
                    isCurrentDay ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => onAddEvent(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((evento) => (
                      <div
                        key={evento.id}
                        className="text-xs p-1 rounded truncate cursor-pointer"
                        style={{ backgroundColor: evento.cor, color: "#fff" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvento(evento);
                        }}
                      >
                        {evento.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default EventoCalendar;
