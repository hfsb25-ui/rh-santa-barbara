import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf } = await req.json();

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: "CPF é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove formatting from CPF
    const cpfClean = cpf.replace(/\D/g, "");

    if (cpfClean.length !== 11) {
      return new Response(
        JSON.stringify({ error: "CPF inválido. Deve conter 11 dígitos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("CPFHUB_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave de API do CPFHub não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Consultando CPF: ${cpfClean.substring(0, 3)}...`);

    const response = await fetch(`https://api.cpfhub.io/cpf/${cpfClean}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CPFHub API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Erro na consulta: ${response.status === 404 ? "CPF não encontrado" : "Falha na API"}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("CPFHub response keys:", Object.keys(data));

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cpf-lookup:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao consultar CPF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
