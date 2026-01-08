import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokenData) return null;

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error("Token refresh failed:", tokens);
      return null;
    }

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: tokens.access_token,
        expires_at: newExpiresAt,
      })
      .eq("user_id", userId);

    return tokens.access_token;
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not connected to Google Calendar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "create") {
      const body = await req.json();
      const { evento } = body;

      const googleEvent = {
        summary: evento.titulo,
        description: evento.descricao || "",
        location: evento.local || "",
        start: {
          dateTime: evento.data_inicio,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: evento.data_fim,
          timeZone: "America/Sao_Paulo",
        },
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("Google API error:", data.error);
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update the event with google_event_id
      if (evento.id) {
        await supabase
          .from("eventos")
          .update({ google_event_id: data.id })
          .eq("id", evento.id);
      }

      return new Response(JSON.stringify({ googleEventId: data.id, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const body = await req.json();
      const { evento, googleEventId } = body;

      const googleEvent = {
        summary: evento.titulo,
        description: evento.descricao || "",
        location: evento.local || "",
        start: {
          dateTime: evento.data_inicio,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: evento.data_fim,
          timeZone: "America/Sao_Paulo",
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("Google API error:", data.error);
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const body = await req.json();
      const { googleEventId } = body;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const data = await response.json();
        console.error("Google API error:", data.error);
        return new Response(JSON.stringify({ error: data.error?.message || "Failed to delete" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax");

      let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=100`;
      
      if (timeMax) {
        apiUrl += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.error) {
        console.error("Google API error:", data.error);
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ events: data.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import") {
      const body = await req.json();
      const { timeMin, timeMax } = body;

      let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=250`;
      
      if (timeMax) {
        apiUrl += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.error) {
        console.error("Google API error:", data.error);
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const googleEvents = data.items || [];
      let imported = 0;
      let skipped = 0;

      for (const gEvent of googleEvents) {
        // Skip events without dateTime (all-day events)
        if (!gEvent.start?.dateTime || !gEvent.end?.dateTime) {
          skipped++;
          continue;
        }

        // Check if event already exists
        const { data: existing } = await supabase
          .from("eventos")
          .select("id")
          .eq("google_event_id", gEvent.id)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Create event
        const { error } = await supabase.from("eventos").insert({
          titulo: gEvent.summary || "Sem título",
          descricao: gEvent.description || null,
          data_inicio: gEvent.start.dateTime,
          data_fim: gEvent.end.dateTime,
          local: gEvent.location || null,
          tipo: "geral",
          cor: "#3B82F6",
          google_event_id: gEvent.id,
          criado_por: user.id,
        });

        if (!error) {
          imported++;
        } else {
          console.error("Import error:", error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        imported,
        skipped,
        total: googleEvents.length 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
