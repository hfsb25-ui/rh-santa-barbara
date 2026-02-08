import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ordem de importação (tabelas pai primeiro)
const IMPORT_ORDER = [
  'empresas',
  'setores',
  'funcoes',
  'employees',
  'estoque_epis',
  'estoque_uniformes',
  'epis',
  'uniformes',
  'faltas',
  'afastamentos',
  'ferias',
  'ferias_planejadas',
  'folgas',
  'registros_ponto',
  'banco_horas',
  'configuracao_horas_trabalho',
  'avisos',
  'avisos_leituras',
  'tacs',
  'cursos',
  'modulos',
  'aulas',
  'progresso_aulas',
  'certificados_liberados',
  'vagas',
  'candidaturas',
  'historico_status_candidatura',
  'eventos',
  'ciclos_avaliacao',
  'criterios_avaliacao',
  'avaliacoes_desempenho',
  'notas_avaliacao',
  'execucoes_ciclo',
  'variaveis_folha',
  'folha_pagamento',
  'folha_pagamento_itens',
  'adiantamentos',
  'historico_reajustes_salariais',
  'historico_folgas',
  'historico_estoque_epis',
  'historico_estoque_uniformes',
  'configuracao_setor',
  'configuracoes_ferias',
  'configuracao_alertas_experiencia',
  'configuracoes_dashboard_funcionario',
  'plano_checklist_templates',
  'plano_checklist_itens',
  'plano_checklist_funcionario',
  'plano_checklist_funcionario_itens',
  'encaminhamentos_medicos',
  'cracha_templates',
  'contract_templates',
  'site_settings',
  'employee_files',
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verifica autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com token do usuário para verificar permissões
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica se é gestor
    const { data: userRole } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'gestor') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas gestores podem importar dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const body = await req.json();
    const { tables, mode = 'merge' } = body;

    if (!tables || typeof tables !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Formato de dados inválido. Esperado objeto com tabelas.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com service role para importar dados
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Iniciando importação no modo: ${mode}`);

    const results: Record<string, { inserted: number; errors: string[] }> = {};

    // Se modo for 'replace', limpar tabelas primeiro (ordem inversa)
    if (mode === 'replace') {
      console.log('Modo replace: limpando tabelas...');
      const reverseOrder = [...IMPORT_ORDER].reverse();
      
      for (const table of reverseOrder) {
        if (tables[table] && Array.isArray(tables[table]) && tables[table].length > 0) {
          try {
            // Não deletar profiles pois são gerenciados pelo auth
            if (table === 'profiles') continue;
            
            const { error } = await supabaseAdmin
              .from(table)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (error) {
              console.error(`Erro ao limpar ${table}:`, error.message);
            } else {
              console.log(`Tabela ${table} limpa`);
            }
          } catch (e) {
            console.error(`Exceção ao limpar ${table}:`, e);
          }
        }
      }
    }

    // Importar tabelas na ordem correta
    for (const table of IMPORT_ORDER) {
      if (!tables[table] || !Array.isArray(tables[table])) {
        continue;
      }

      const data = tables[table];
      if (data.length === 0) {
        results[table] = { inserted: 0, errors: [] };
        continue;
      }

      results[table] = { inserted: 0, errors: [] };

      // Processar em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
          const { data: insertedData, error } = await supabaseAdmin
            .from(table)
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select();

          if (error) {
            console.error(`Erro ao importar ${table} (lote ${i / batchSize + 1}):`, error.message);
            results[table].errors.push(error.message);
          } else {
            results[table].inserted += insertedData?.length || batch.length;
          }
        } catch (e) {
          console.error(`Exceção ao importar ${table}:`, e);
          results[table].errors.push(e.message);
        }
      }

      console.log(`Importado ${table}: ${results[table].inserted} registros`);
    }

    const summary = {
      success: true,
      importedAt: new Date().toISOString(),
      importedBy: user.email,
      mode,
      results,
    };

    console.log('Importação concluída');

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral na importação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
