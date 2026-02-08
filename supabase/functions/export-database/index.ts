import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de tabelas para exportar (ordem importa para foreign keys)
const TABLES_TO_EXPORT = [
  'empresas',
  'setores',
  'funcoes',
  'profiles',
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
        JSON.stringify({ error: 'Acesso negado. Apenas gestores podem exportar o banco de dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com service role para exportar todos os dados
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando exportação do banco de dados...');

    const exportData: Record<string, any[]> = {};
    const errors: string[] = [];

    for (const table of TABLES_TO_EXPORT) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*');

        if (error) {
          console.error(`Erro ao exportar ${table}:`, error.message);
          errors.push(`${table}: ${error.message}`);
          exportData[table] = [];
        } else {
          exportData[table] = data || [];
          console.log(`Exportado ${table}: ${data?.length || 0} registros`);
        }
      } catch (e) {
        console.error(`Exceção ao exportar ${table}:`, e);
        errors.push(`${table}: ${e.message}`);
        exportData[table] = [];
      }
    }

    const result = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      tables: exportData,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Exportação concluída com sucesso');

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('Erro geral na exportação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
