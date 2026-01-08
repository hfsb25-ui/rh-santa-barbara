import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Evento {
  id?: string;
  titulo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  local?: string | null;
  tipo?: string;
  cor?: string;
  google_event_id?: string | null;
}

export const useGoogleCalendar = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConnected(false);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      setConnected(data.connected);
    } catch (error) {
      console.error("Error checking Google Calendar connection:", error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const syncToGoogle = useCallback(async (evento: Evento): Promise<string | null> => {
    if (!connected) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const action = evento.google_event_id ? "update" : "create";
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync?action=${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evento,
            googleEventId: evento.google_event_id,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("Sync error:", data.error);
        toast.error("Erro ao sincronizar com Google Calendar");
        return null;
      }

      if (action === "create" && data.googleEventId) {
        toast.success("Evento sincronizado com Google Calendar");
        return data.googleEventId;
      }

      if (action === "update") {
        toast.success("Evento atualizado no Google Calendar");
      }

      return evento.google_event_id || null;
    } catch (error) {
      console.error("Error syncing to Google:", error);
      return null;
    }
  }, [connected]);

  const deleteFromGoogle = useCallback(async (googleEventId: string): Promise<boolean> => {
    if (!connected || !googleEventId) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync?action=delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ googleEventId }),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("Delete error:", data.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleting from Google:", error);
      return false;
    }
  }, [connected]);

  return {
    connected,
    loading,
    checkConnection,
    syncToGoogle,
    deleteFromGoogle,
  };
};
