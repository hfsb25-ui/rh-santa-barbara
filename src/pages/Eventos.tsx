import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Calendar as CalendarIcon, List, ExternalLink } from "lucide-react";
import EventoCalendar from "@/components/eventos/EventoCalendar";
import EventoList from "@/components/eventos/EventoList";
import EventoForm from "@/components/eventos/EventoForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const Eventos = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setShowForm(false);
  };

  const handleAddEvent = (date?: Date) => {
    setSelectedDate(date || null);
    setShowForm(true);
  };

  const handleOpenGoogleCalendar = () => {
    toast.info("Para adicionar eventos ao Google Calendar, clique em um evento e use o botão 'Adicionar ao Google Calendar'");
    window.open("https://calendar.google.com/calendar", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Calendário de Eventos</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenGoogleCalendar}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Google Calendar
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Evento</DialogTitle>
                </DialogHeader>
                <EventoForm 
                  onSaved={handleRefresh} 
                  onCancel={() => setShowForm(false)}
                  initialDate={selectedDate}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="calendar">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <EventoCalendar 
              key={`calendar-${refreshKey}`}
              onAddEvent={handleAddEvent}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <EventoList 
              key={`list-${refreshKey}`}
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Eventos;
