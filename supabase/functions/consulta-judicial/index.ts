import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI config from database
    const { data: aiConfig } = await supabase
      .from('configuracoes_ia')
      .select('*')
      .limit(1)
      .maybeSingle();

    const provedor = aiConfig?.provedor || 'gemini';
    const modelo = aiConfig?.modelo;

    const { employee_id, cpf, nome, consultado_por } = await req.json();

    if (!cpf || !nome) {
      return new Response(JSON.stringify({ error: 'CPF e nome são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Busque informações sobre processos judiciais envolvendo a pessoa com CPF ${cpf} e nome "${nome}" no Brasil. 
Consulte fontes públicas como JusBrasil, Escavador, tribunais estaduais (TJ), tribunais regionais do trabalho (TRT), e tribunais federais (TRF).

Responda OBRIGATORIAMENTE no seguinte formato JSON:
{
  "processos_encontrados": <número inteiro>,
  "processos": [
    {
      "numero_processo": "<número se disponível>",
      "tribunal": "<tribunal>",
      "tipo": "<tipo da ação>",
      "status": "<ativo/arquivado/em andamento>",
      "polo": "<autor/réu/outro>",
      "resumo": "<breve descrição>"
    }
  ],
  "resumo_geral": "<resumo em 2-3 frases sobre a situação judicial da pessoa>",
  "fontes": ["<URLs das fontes consultadas>"]
}

Se não encontrar nenhum processo, retorne processos_encontrados como 0 e processos como array vazio.
Seja preciso e não invente informações. Se não tiver certeza, indique isso no resumo.`;

    let aiResponse: string;

    if (provedor === 'gemini') {
      const geminiKey = aiConfig?.google_gemini_api_key || Deno.env.get('GOOGLE_GEMINI_API_KEY');
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'Chave do Google Gemini não configurada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiModel = modelo || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provedor === 'openai') {
      const openaiKey = aiConfig?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) {
        return new Response(JSON.stringify({ error: 'Chave da OpenAI não configurada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const openaiModel = modelo || 'gpt-4o-mini';
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            { role: 'system', content: 'Você é um assistente especializado em busca de processos judiciais no Brasil. Responda sempre em JSON válido.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices?.[0]?.message?.content || '';
    } else {
      // Ollama
      const ollamaUrl = Deno.env.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
      const ollamaModel = modelo || 'llama3.1';

      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt,
          stream: false,
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.status}`);
      }

      const ollamaData = await ollamaResponse.json();
      aiResponse = ollamaData.response || '';
    }

    // Parse AI response
    let resultado: any = {};
    let processos_encontrados = 0;
    let resumo = '';

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      resultado = JSON.parse(jsonStr.trim());
      processos_encontrados = resultado.processos_encontrados || 0;
      resumo = resultado.resumo_geral || 'Consulta realizada com sucesso.';
    } catch {
      resultado = { raw_response: aiResponse };
      resumo = aiResponse.substring(0, 500);
    }

    // Save to database
    if (employee_id) {
      await supabase.from('consultas_judiciais').insert({
        employee_id,
        resultado,
        processos_encontrados,
        resumo,
        consultado_por,
      });
    }

    return new Response(JSON.stringify({
      processos_encontrados,
      resumo,
      resultado,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
