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

    // Format CPF for search variations
    const cpfLimpo = cpf.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    // Split name into parts for better search
    const nomePartes = nome.trim().split(/\s+/);
    const primeiroNome = nomePartes[0];
    const ultimoNome = nomePartes[nomePartes.length - 1];

    const prompt = `Você é um investigador jurídico especializado em buscar processos judiciais no Brasil.

TAREFA: Buscar TODOS os processos judiciais envolvendo esta pessoa:
- Nome completo: "${nome}"
- CPF: ${cpfFormatado} (${cpfLimpo})

INSTRUÇÕES DE BUSCA (SIGA RIGOROSAMENTE):
1. Busque no Google usando estas consultas EXATAS (uma de cada vez):
   - site:jusbrasil.com.br "${nome}"
   - site:jusbrasil.com.br "${cpfFormatado}"
   - site:escavador.com.br "${nome}"
   - "${nome}" processo judicial
   - "${nome}" ${cpfFormatado} processo
   - "${primeiroNome} ${ultimoNome}" tribunal processo
   - "${nome}" TRT OR TJ OR TRF OR TJSP OR TJRJ OR TJMG

2. Para CADA resultado encontrado, extraia:
   - Número do processo (formato CNJ: NNNNNNN-NN.NNNN.N.NN.NNNN)
   - Tribunal (ex: TJSP, TRT-2, TRF-3)
   - Tipo da ação (trabalhista, cível, criminal, etc.)
   - Status (ativo, arquivado, em andamento)
   - Polo da pessoa (autor, réu, reclamante, reclamado)
   - Breve resumo do que se trata

3. ATENÇÃO: NÃO ignore resultados. Se encontrar QUALQUER menção a processo judicial envolvendo esta pessoa, INCLUA no resultado.

4. Verifique variações do nome (com e sem acentos, abreviações).

Responda OBRIGATORIAMENTE neste formato JSON:
{
  "processos_encontrados": <número inteiro de processos encontrados>,
  "processos": [
    {
      "numero_processo": "<número se disponível ou 'não informado'>",
      "tribunal": "<tribunal>",
      "tipo": "<tipo da ação>",
      "status": "<ativo/arquivado/em andamento>",
      "polo": "<autor/réu/reclamante/reclamado/outro>",
      "resumo": "<breve descrição do processo>",
      "fonte": "<URL onde encontrou a informação>"
    }
  ],
  "resumo_geral": "<resumo em 2-3 frases sobre a situação judicial da pessoa>",
  "fontes": ["<URLs das fontes consultadas>"]
}

Se não encontrar NENHUM processo após busca exaustiva, retorne processos_encontrados como 0.
NÃO invente processos. Relate apenas o que efetivamente encontrar nas buscas.`;

    let aiResponse: string;

    if (provedor === 'gemini') {
      const geminiKey = aiConfig?.google_gemini_api_key || Deno.env.get('GOOGLE_GEMINI_API_KEY');
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'Chave do Google Gemini não configurada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use gemini-2.0-flash with google_search for grounding
      const geminiModel = modelo || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

      console.log(`Buscando processos judiciais para: ${nome} (${cpfFormatado})`);

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.0,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      
      // Extract text from all parts (Gemini with grounding may return multiple parts)
      const parts = geminiData.candidates?.[0]?.content?.parts || [];
      aiResponse = parts.map((p: any) => p.text || '').join('');
      
      // Also log grounding metadata if available
      const groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        console.log('Grounding search queries:', JSON.stringify(groundingMetadata.searchEntryPoint || {}));
        console.log('Grounding sources count:', groundingMetadata.groundingChunks?.length || 0);
      }
      
      console.log('AI Response length:', aiResponse.length);
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
            { role: 'system', content: 'Você é um investigador jurídico especializado em busca de processos judiciais no Brasil. Busque exaustivamente em todas as fontes públicas disponíveis. Responda sempre em JSON válido.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.0,
          max_tokens: 8192,
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
      
      // Try to find JSON object in the response
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        resultado = JSON.parse(jsonObjectMatch[0]);
      } else {
        resultado = JSON.parse(jsonStr.trim());
      }
      
      processos_encontrados = resultado.processos_encontrados || 0;
      resumo = resultado.resumo_geral || 'Consulta realizada com sucesso.';
      
      console.log(`Resultado: ${processos_encontrados} processo(s) encontrado(s) para ${nome}`);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', aiResponse.substring(0, 1000));
      resultado = { raw_response: aiResponse };
      resumo = aiResponse.substring(0, 500);
    }

    // Save to database
    if (employee_id) {
      const { error: insertError } = await supabase.from('consultas_judiciais').insert({
        employee_id,
        resultado,
        processos_encontrados,
        resumo,
        consultado_por,
      });
      
      if (insertError) {
        console.error('Error saving consultation:', insertError);
      }
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
