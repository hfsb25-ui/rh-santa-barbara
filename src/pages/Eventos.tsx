import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Calendar as CalendarIcon, List, Settings } from "lucide-react";
import EventoCalendar from "@/components/eventos/EventoCalendar";
import EventoList from "@/components/eventos/EventoList";
import EventoForm from "@/components/eventos/EventoForm";
import { GoogleCalendarSettings } from "@/components/eventos/GoogleCalendarSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Eventos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const handleGoogleCallback = async () => {
      const isGoogleCallback = searchParams.get("google_callback");
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (isGoogleCallback && code) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const redirectUri = sessionStorage.getItem("google_redirect_uri") || `${window.location.origin}/eventos?google_callback=true`;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ code, redirectUri }),
            }
          );

          const data = await response.json();

          if (data.success) {
            toast.success("Conectado ao Google Calendar com sucesso!");
            setShowSettings(true);
          } else {
            toast.error(data.error || "Erro ao conectar com Google Calendar");
          }
        } catch (err) {
          console.error("Callback error:", err);
          toast.error("Erro ao processar autorização do Google");
        }

        // Clear URL params
        sessionStorage.removeItem("google_redirect_uri");
        setSearchParams({});
      } else if (isGoogleCallback && error) {
        toast.error("Autorização do Google foi cancelada");
        setSearchParams({});
      }
    };

    handleGoogleCallback();
  }, [searchParams, setSearchParams]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setShowForm(false);
  };

  const handleAddEvent = (date?: Date) => {
    setSelectedDate(date || null);
    setShowForm(true);
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
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Google Calendar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurações do Google Calendar</DialogTitle>
                </DialogHeader>
                <GoogleCalendarSettings onRefresh={handleRefresh} />
              </DialogContent>
            </Dialog>
            
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
