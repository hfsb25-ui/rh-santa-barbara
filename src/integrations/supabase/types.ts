export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adiantamentos: {
        Row: {
          ano: number
          created_at: string
          created_by: string | null
          employee_id: string
          empresa_id: string
          forma_pagamento: string
          id: string
          mes: number
          updated_at: string
          valor: number
        }
        Insert: {
          ano: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          empresa_id: string
          forma_pagamento: string
          id?: string
          mes: number
          updated_at?: string
          valor?: number
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          empresa_id?: string
          forma_pagamento?: string
          id?: string
          mes?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      afastamentos: {
        Row: {
          cid: string | null
          created_at: string | null
          created_by: string | null
          data_fim: string
          data_inicio: string
          documento_url: string | null
          employee_id: string
          id: string
          motivo: string
        }
        Insert: {
          cid?: string | null
          created_at?: string | null
          created_by?: string | null
          data_fim: string
          data_inicio: string
          documento_url?: string | null
          employee_id: string
          id?: string
          motivo: string
        }
        Update: {
          cid?: string | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          documento_url?: string | null
          employee_id?: string
          id?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "afastamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          created_at: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          modulo_id: string
          ordem: number
          titulo: string
          youtube_url: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          modulo_id: string
          ordem?: number
          titulo: string
          youtube_url: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          modulo_id?: string
          ordem?: number
          titulo?: string
          youtube_url?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_desempenho: {
        Row: {
          auto_avaliacao_concluida: boolean | null
          avaliacao_gestor_concluida: boolean | null
          avaliador_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          nota_final: number | null
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          auto_avaliacao_concluida?: boolean | null
          avaliacao_gestor_concluida?: boolean | null
          avaliador_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          nota_final?: number | null
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          auto_avaliacao_concluida?: boolean | null
          avaliacao_gestor_concluida?: boolean | null
          avaliador_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          nota_final?: number | null
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_desempenho_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_expiracao: string
          id: string
          mensagem: string
          setores: string[]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_expiracao: string
          id?: string
          mensagem: string
          setores: string[]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_expiracao?: string
          id?: string
          mensagem?: string
          setores?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "avisos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          saldo_horas: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          saldo_horas?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          saldo_horas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidaturas: {
        Row: {
          avaliacao_gestor: string | null
          avaliado_por: string | null
          carta_apresentacao: string | null
          cpf: string
          created_at: string | null
          curriculum_url: string | null
          data_avaliacao: string | null
          data_candidatura: string | null
          data_entrevista: string | null
          data_nascimento: string
          email: string
          endereco: string | null
          experiencia_resumo: string | null
          id: string
          motivo_reprovacao: string | null
          nome_completo: string
          nota_avaliacao: number | null
          status: Database["public"]["Enums"]["candidatura_status"] | null
          telefone: string
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          avaliacao_gestor?: string | null
          avaliado_por?: string | null
          carta_apresentacao?: string | null
          cpf: string
          created_at?: string | null
          curriculum_url?: string | null
          data_avaliacao?: string | null
          data_candidatura?: string | null
          data_entrevista?: string | null
          data_nascimento: string
          email: string
          endereco?: string | null
          experiencia_resumo?: string | null
          id?: string
          motivo_reprovacao?: string | null
          nome_completo: string
          nota_avaliacao?: number | null
          status?: Database["public"]["Enums"]["candidatura_status"] | null
          telefone: string
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          avaliacao_gestor?: string | null
          avaliado_por?: string | null
          carta_apresentacao?: string | null
          cpf?: string
          created_at?: string | null
          curriculum_url?: string | null
          data_avaliacao?: string | null
          data_candidatura?: string | null
          data_entrevista?: string | null
          data_nascimento?: string
          email?: string
          endereco?: string | null
          experiencia_resumo?: string | null
          id?: string
          motivo_reprovacao?: string | null
          nome_completo?: string
          nota_avaliacao?: number | null
          status?: Database["public"]["Enums"]["candidatura_status"] | null
          telefone?: string
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_avaliado_por_fkey"
            columns: ["avaliado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_avaliacao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          criar_metas: boolean | null
          data_inicio: string
          data_proxima_execucao: string
          dias_para_conclusao: number | null
          empresa_id: string | null
          funcao_id: string | null
          id: string
          nome: string
          setor_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          criar_metas?: boolean | null
          data_inicio: string
          data_proxima_execucao: string
          dias_para_conclusao?: number | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          nome: string
          setor_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          criar_metas?: boolean | null
          data_inicio?: string
          data_proxima_execucao?: string
          dias_para_conclusao?: number | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          nome?: string
          setor_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_avaliacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_avaliacao_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_avaliacao_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_horas_trabalho: {
        Row: {
          created_at: string | null
          employee_id: string
          hora_entrada_prevista: string | null
          hora_saida_prevista: string | null
          horas_diarias_esperadas: number
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          hora_entrada_prevista?: string | null
          hora_saida_prevista?: string | null
          horas_diarias_esperadas?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          hora_entrada_prevista?: string | null
          hora_saida_prevista?: string | null
          horas_diarias_esperadas?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_horas_trabalho_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_setor: {
        Row: {
          alertas_ativos: boolean
          created_at: string | null
          id: string
          quantidade_media: number
          setor_id: string
          updated_at: string | null
        }
        Insert: {
          alertas_ativos?: boolean
          created_at?: string | null
          id?: string
          quantidade_media?: number
          setor_id: string
          updated_at?: string | null
        }
        Update: {
          alertas_ativos?: boolean
          created_at?: string | null
          id?: string
          quantidade_media?: number
          setor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_setor_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: true
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_dashboard_funcionario: {
        Row: {
          avisos_visivel: boolean
          banco_horas_visivel: boolean
          created_at: string | null
          epis_visivel: boolean
          folgas_visivel: boolean
          id: string
          saldo_horas_visivel: boolean
          treinamentos_visivel: boolean
          uniformes_visivel: boolean
          updated_at: string | null
        }
        Insert: {
          avisos_visivel?: boolean
          banco_horas_visivel?: boolean
          created_at?: string | null
          epis_visivel?: boolean
          folgas_visivel?: boolean
          id?: string
          saldo_horas_visivel?: boolean
          treinamentos_visivel?: boolean
          uniformes_visivel?: boolean
          updated_at?: string | null
        }
        Update: {
          avisos_visivel?: boolean
          banco_horas_visivel?: boolean
          created_at?: string | null
          epis_visivel?: boolean
          folgas_visivel?: boolean
          id?: string
          saldo_horas_visivel?: boolean
          treinamentos_visivel?: boolean
          uniformes_visivel?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_ferias: {
        Row: {
          cobertura_minima: number | null
          created_at: string | null
          empresa_id: string | null
          funcionarios_chave: string[] | null
          id: string
          percentual_maximo_ausencia: number | null
          setor_id: string | null
          updated_at: string | null
        }
        Insert: {
          cobertura_minima?: number | null
          created_at?: string | null
          empresa_id?: string | null
          funcionarios_chave?: string[] | null
          id?: string
          percentual_maximo_ausencia?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cobertura_minima?: number | null
          created_at?: string | null
          empresa_id?: string | null
          funcionarios_chave?: string[] | null
          id?: string
          percentual_maximo_ausencia?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      criterios_avaliacao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          funcao_id: string | null
          id: string
          nome: string
          peso: number | null
          setor_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          funcao_id?: string | null
          id?: string
          nome: string
          peso?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          funcao_id?: string | null
          id?: string
          nome?: string
          peso?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criterios_avaliacao_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterios_avaliacao_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          ativo: boolean | null
          carga_horaria: number | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          funcao_id: string | null
          id: string
          obrigatorio: boolean | null
          setor_id: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          carga_horaria?: number | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          obrigatorio?: boolean | null
          setor_id?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          carga_horaria?: number | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          obrigatorio?: boolean | null
          setor_id?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_files: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          cargo: string
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          data_desligamento: string | null
          data_nascimento: string | null
          empresa_id: string | null
          endereco: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          quantidade_folgas: number | null
          rg: string | null
          salario: number | null
          setor: string | null
          sexo: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          telefone: string | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_salario: Database["public"]["Enums"]["tipo_salario"] | null
          ultima_alteracao_folgas: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cargo: string
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_nascimento?: string | null
          empresa_id?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo: string
          quantidade_folgas?: number | null
          rg?: string | null
          salario?: number | null
          setor?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_salario?: Database["public"]["Enums"]["tipo_salario"] | null
          ultima_alteracao_folgas?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cargo?: string
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_nascimento?: string | null
          empresa_id?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
          quantidade_folgas?: number | null
          rg?: string | null
          salario?: number | null
          setor?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_salario?: Database["public"]["Enums"]["tipo_salario"] | null
          ultima_alteracao_folgas?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      encaminhamentos_medicos: {
        Row: {
          apto_trabalho: boolean | null
          beneficiario_reabilitado: boolean
          cbo: string | null
          created_at: string
          created_by: string | null
          data_agendamento: string | null
          data_encaminhamento: string
          data_realizacao: string | null
          descricao_atividade: string | null
          employee_id: string
          empresa_id: string
          espaco_confinado: boolean
          funcao: string
          id: string
          matricula_esocial: string | null
          observacoes: string | null
          portador_deficiencia: boolean
          resultado_exame: string | null
          setor: string | null
          status: Database["public"]["Enums"]["status_encaminhamento"]
          tipo_exame: Database["public"]["Enums"]["tipo_exame_medico"]
          trabalho_altura: boolean
          updated_at: string
        }
        Insert: {
          apto_trabalho?: boolean | null
          beneficiario_reabilitado?: boolean
          cbo?: string | null
          created_at?: string
          created_by?: string | null
          data_agendamento?: string | null
          data_encaminhamento?: string
          data_realizacao?: string | null
          descricao_atividade?: string | null
          employee_id: string
          empresa_id: string
          espaco_confinado?: boolean
          funcao: string
          id?: string
          matricula_esocial?: string | null
          observacoes?: string | null
          portador_deficiencia?: boolean
          resultado_exame?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["status_encaminhamento"]
          tipo_exame: Database["public"]["Enums"]["tipo_exame_medico"]
          trabalho_altura?: boolean
          updated_at?: string
        }
        Update: {
          apto_trabalho?: boolean | null
          beneficiario_reabilitado?: boolean
          cbo?: string | null
          created_at?: string
          created_by?: string | null
          data_agendamento?: string | null
          data_encaminhamento?: string
          data_realizacao?: string | null
          descricao_atividade?: string | null
          employee_id?: string
          empresa_id?: string
          espaco_confinado?: boolean
          funcao?: string
          id?: string
          matricula_esocial?: string | null
          observacoes?: string | null
          portador_deficiencia?: boolean
          resultado_exame?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["status_encaminhamento"]
          tipo_exame?: Database["public"]["Enums"]["tipo_exame_medico"]
          trabalho_altura?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encaminhamentos_medicos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encaminhamentos_medicos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encaminhamentos_medicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          assinatura_funcionario: string | null
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          data_entrega: string
          employee_id: string
          id: string
          observacoes: string | null
          quantidade: number
          tipo_epi: string
        }
        Insert: {
          assinatura_funcionario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_entrega: string
          employee_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tipo_epi: string
        }
        Update: {
          assinatura_funcionario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_entrega?: string
          employee_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tipo_epi?: string
        }
        Relationships: [
          {
            foreignKeyName: "epis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_epis: {
        Row: {
          ca: string | null
          created_at: string | null
          finalidade: string | null
          id: string
          marca_modelo: string | null
          observacoes: string | null
          quantidade_estoque: number
          quantidade_minima: number | null
          tamanho: string | null
          tipo_epi: string
          updated_at: string | null
        }
        Insert: {
          ca?: string | null
          created_at?: string | null
          finalidade?: string | null
          id?: string
          marca_modelo?: string | null
          observacoes?: string | null
          quantidade_estoque?: number
          quantidade_minima?: number | null
          tamanho?: string | null
          tipo_epi: string
          updated_at?: string | null
        }
        Update: {
          ca?: string | null
          created_at?: string | null
          finalidade?: string | null
          id?: string
          marca_modelo?: string | null
          observacoes?: string | null
          quantidade_estoque?: number
          quantidade_minima?: number | null
          tamanho?: string | null
          tipo_epi?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      estoque_uniformes: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          observacoes: string | null
          quantidade_estoque: number
          quantidade_minima: number | null
          tamanho: string
          tipo_uniforme: string
          updated_at: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          quantidade_estoque?: number
          quantidade_minima?: number | null
          tamanho: string
          tipo_uniforme: string
          updated_at?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          quantidade_estoque?: number
          quantidade_minima?: number | null
          tamanho?: string
          tipo_uniforme?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      execucoes_ciclo: {
        Row: {
          avaliacoes_criadas: number | null
          ciclo_id: string | null
          created_at: string | null
          data_execucao: string | null
          detalhes: Json | null
          id: string
          status: string | null
        }
        Insert: {
          avaliacoes_criadas?: number | null
          ciclo_id?: string | null
          created_at?: string | null
          data_execucao?: string | null
          detalhes?: Json | null
          id?: string
          status?: string | null
        }
        Update: {
          avaliacoes_criadas?: number | null
          ciclo_id?: string | null
          created_at?: string | null
          data_execucao?: string | null
          detalhes?: Json | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_ciclo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      faltas: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          employee_id: string
          id: string
          justificada: boolean | null
          motivo: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: string
          employee_id: string
          id?: string
          justificada?: boolean | null
          motivo?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          employee_id?: string
          id?: string
          justificada?: boolean | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faltas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faltas_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          confirmado_por: string | null
          created_at: string | null
          created_by: string | null
          data_confirmacao: string | null
          data_retorno_confirmada: boolean | null
          dias_totais: number
          employee_id: string
          id: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_gozo_fim: string
          periodo_gozo_inicio: string
        }
        Insert: {
          confirmado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_confirmacao?: string | null
          data_retorno_confirmada?: boolean | null
          dias_totais: number
          employee_id: string
          id?: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_gozo_fim: string
          periodo_gozo_inicio: string
        }
        Update: {
          confirmado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_confirmacao?: string | null
          data_retorno_confirmada?: boolean | null
          dias_totais?: number
          employee_id?: string
          id?: string
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          periodo_gozo_fim?: string
          periodo_gozo_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_confirmado_por_fkey"
            columns: ["confirmado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_planejadas: {
        Row: {
          aprovado_por: string | null
          created_at: string | null
          criado_por: string | null
          data_aprovacao: string | null
          dias_totais: number
          employee_id: string
          id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          updated_at: string | null
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_aprovacao?: string | null
          dias_totais: number
          employee_id: string
          id?: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_aprovacao?: string | null
          dias_totais?: number
          employee_id?: string
          id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      folgas: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          employee_id: string
          id: string
          motivo: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: string
          employee_id: string
          id?: string
          motivo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          employee_id?: string
          id?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "folgas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folgas_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento: {
        Row: {
          ano: number
          created_at: string | null
          created_by: string | null
          descontos: number | null
          employee_id: string
          empresa_id: string
          id: string
          mes: number
          observacoes: string | null
          updated_at: string | null
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          ano: number
          created_at?: string | null
          created_by?: string | null
          descontos?: number | null
          employee_id: string
          empresa_id: string
          id?: string
          mes: number
          observacoes?: string | null
          updated_at?: string | null
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          ano?: number
          created_at?: string | null
          created_by?: string | null
          descontos?: number | null
          employee_id?: string
          empresa_id?: string
          id?: string
          mes?: number
          observacoes?: string | null
          updated_at?: string | null
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          cbo: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cbo?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cbo?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      historico_banco_horas: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_id: string
          horas: number
          id: string
          mes_referencia: string | null
          observacao: string | null
          saldo_anterior: number
          saldo_novo: number
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          horas: number
          id?: string
          mes_referencia?: string | null
          observacao?: string | null
          saldo_anterior: number
          saldo_novo: number
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          horas?: number
          id?: string
          mes_referencia?: string | null
          observacao?: string | null
          saldo_anterior?: number
          saldo_novo?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_banco_horas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_banco_horas_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_estoque_epis: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string | null
          estoque_epi_id: string
          id: string
          motivo: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          estoque_epi_id: string
          id?: string
          motivo?: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          estoque_epi_id?: string
          id?: string
          motivo?: string | null
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_estoque_epis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estoque_epis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estoque_epis_estoque_epi_id_fkey"
            columns: ["estoque_epi_id"]
            isOneToOne: false
            referencedRelation: "estoque_epis"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_estoque_uniformes: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string | null
          estoque_uniforme_id: string
          id: string
          motivo: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          estoque_uniforme_id: string
          id?: string
          motivo?: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          estoque_uniforme_id?: string
          id?: string
          motivo?: string | null
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_estoque_uniformes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estoque_uniformes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estoque_uniformes_estoque_uniforme_id_fkey"
            columns: ["estoque_uniforme_id"]
            isOneToOne: false
            referencedRelation: "estoque_uniformes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_folgas: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          created_at: string | null
          employee_id: string
          id: string
          observacao: string | null
          quantidade_anterior: number
          quantidade_nova: number
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          observacao?: string | null
          quantidade_anterior: number
          quantidade_nova: number
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          observacao?: string | null
          quantidade_anterior?: number
          quantidade_nova?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_folgas_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_folgas_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_reajustes_salariais: {
        Row: {
          aplicado_em: string
          aplicado_por: string | null
          created_at: string | null
          employee_id: string
          id: string
          justificativa: string
          percentual_reajuste: number | null
          salario_anterior: number
          salario_novo: number
        }
        Insert: {
          aplicado_em?: string
          aplicado_por?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          justificativa: string
          percentual_reajuste?: number | null
          salario_anterior: number
          salario_novo: number
        }
        Update: {
          aplicado_em?: string
          aplicado_por?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          justificativa?: string
          percentual_reajuste?: number | null
          salario_anterior?: number
          salario_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_reajustes_salariais_aplicado_por_fkey"
            columns: ["aplicado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_reajustes_salariais_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status_candidatura: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          candidatura_id: string
          id: string
          observacao: string | null
          status_anterior:
            | Database["public"]["Enums"]["candidatura_status"]
            | null
          status_novo: Database["public"]["Enums"]["candidatura_status"]
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          candidatura_id: string
          id?: string
          observacao?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["candidatura_status"]
            | null
          status_novo: Database["public"]["Enums"]["candidatura_status"]
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          candidatura_id?: string
          id?: string
          observacao?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["candidatura_status"]
            | null
          status_novo?: Database["public"]["Enums"]["candidatura_status"]
        }
        Relationships: [
          {
            foreignKeyName: "historico_status_candidatura_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_status_candidatura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          employee_id: string | null
          id: string
          ip_address: string | null
          login_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_funcionario: {
        Row: {
          avaliacao_id: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          employee_id: string
          id: string
          percentual_conclusao: number | null
          prazo: string | null
          status: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          avaliacao_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          employee_id: string
          id?: string
          percentual_conclusao?: number | null
          prazo?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          avaliacao_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          employee_id?: string
          id?: string
          percentual_conclusao?: number | null
          prazo?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_funcionario_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_desempenho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_funcionario_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_contrato: {
        Row: {
          conteudo_template: string
          created_at: string
          funcao_id: string
          id: string
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string
        }
        Insert: {
          conteudo_template: string
          created_at?: string
          funcao_id: string
          id?: string
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Update: {
          conteudo_template?: string
          created_at?: string
          funcao_id?: string
          id?: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_contrato_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string | null
          curso_id: string
          descricao: string | null
          id: string
          ordem: number
          titulo: string
        }
        Insert: {
          created_at?: string | null
          curso_id: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo: string
        }
        Update: {
          created_at?: string | null
          curso_id?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_avaliacao: {
        Row: {
          avaliacao_id: string
          comentario_funcionario: string | null
          comentario_gestor: string | null
          created_at: string | null
          criterio_id: string
          id: string
          nota_funcionario: number | null
          nota_gestor: number | null
          updated_at: string | null
        }
        Insert: {
          avaliacao_id: string
          comentario_funcionario?: string | null
          comentario_gestor?: string | null
          created_at?: string | null
          criterio_id: string
          id?: string
          nota_funcionario?: number | null
          nota_gestor?: number | null
          updated_at?: string | null
        }
        Update: {
          avaliacao_id?: string
          comentario_funcionario?: string | null
          comentario_gestor?: string | null
          created_at?: string | null
          criterio_id?: string
          id?: string
          nota_funcionario?: number | null
          nota_gestor?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_avaliacao_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_desempenho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_avaliacao_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome_completo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nome_completo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome_completo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      progresso_treinamento: {
        Row: {
          aula_id: string
          concluida: boolean | null
          created_at: string | null
          data_conclusao: string | null
          employee_id: string
          id: string
        }
        Insert: {
          aula_id: string
          concluida?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          aula_id?: string
          concluida?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progresso_treinamento_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_treinamento_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          employee_id: string
          hora_entrada: string | null
          hora_fim_intervalo: string | null
          hora_inicio_intervalo: string | null
          hora_saida: string | null
          horas_trabalhadas: number | null
          id: string
          observacoes: string | null
          tipo_dia: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: string
          employee_id: string
          hora_entrada?: string | null
          hora_fim_intervalo?: string | null
          hora_inicio_intervalo?: string | null
          hora_saida?: string | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          tipo_dia?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          employee_id?: string
          hora_entrada?: string | null
          hora_fim_intervalo?: string | null
          hora_inicio_intervalo?: string | null
          hora_saida?: string | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          tipo_dia?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          favicon_url: string | null
          id: string
          site_description: string | null
          site_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          site_description?: string | null
          site_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          site_description?: string | null
          site_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uniformes: {
        Row: {
          assinatura_funcionario: string | null
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          data_entrega: string
          employee_id: string
          id: string
          observacoes: string | null
          quantidade: number
          tamanho: string
          tipo_uniforme: string
        }
        Insert: {
          assinatura_funcionario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_entrega: string
          employee_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tamanho: string
          tipo_uniforme: string
        }
        Update: {
          assinatura_funcionario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_entrega?: string
          employee_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tamanho?: string
          tipo_uniforme?: string
        }
        Relationships: [
          {
            foreignKeyName: "uniformes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniformes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vagas: {
        Row: {
          beneficios: string | null
          created_at: string | null
          created_by: string | null
          data_abertura: string
          data_fechamento: string | null
          descricao: string
          empresa_id: string | null
          exibir_salario: boolean | null
          funcao_id: string | null
          id: string
          quantidade_vagas: number | null
          requisitos: string
          salario: number | null
          setor_id: string | null
          status: Database["public"]["Enums"]["vaga_status"] | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          tipo_salario: Database["public"]["Enums"]["tipo_salario"]
          titulo: string
          updated_at: string | null
        }
        Insert: {
          beneficios?: string | null
          created_at?: string | null
          created_by?: string | null
          data_abertura?: string
          data_fechamento?: string | null
          descricao: string
          empresa_id?: string | null
          exibir_salario?: boolean | null
          funcao_id?: string | null
          id?: string
          quantidade_vagas?: number | null
          requisitos: string
          salario?: number | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["vaga_status"] | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          tipo_salario: Database["public"]["Enums"]["tipo_salario"]
          titulo: string
          updated_at?: string | null
        }
        Update: {
          beneficios?: string | null
          created_at?: string | null
          created_by?: string | null
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string
          empresa_id?: string | null
          exibir_salario?: boolean | null
          funcao_id?: string | null
          id?: string
          quantidade_vagas?: number | null
          requisitos?: string
          salario?: number | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["vaga_status"] | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_salario?: Database["public"]["Enums"]["tipo_salario"]
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vagas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "funcionario"
      candidatura_status:
        | "nova"
        | "em_analise"
        | "entrevista_agendada"
        | "aprovada"
        | "reprovada"
        | "contratada"
      employee_status: "ativo" | "ferias" | "afastado" | "demitido"
      status_encaminhamento: "pendente" | "agendado" | "realizado" | "cancelado"
      tipo_contrato: "fixo" | "intermitente" | "prestador_servico"
      tipo_exame_medico:
        | "admissional"
        | "demissional"
        | "periodico"
        | "mudanca_riscos"
        | "retorno_trabalho"
      tipo_salario: "mensal" | "diario" | "por_hora"
      vaga_status: "aberta" | "pausada" | "fechada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "funcionario"],
      candidatura_status: [
        "nova",
        "em_analise",
        "entrevista_agendada",
        "aprovada",
        "reprovada",
        "contratada",
      ],
      employee_status: ["ativo", "ferias", "afastado", "demitido"],
      status_encaminhamento: ["pendente", "agendado", "realizado", "cancelado"],
      tipo_contrato: ["fixo", "intermitente", "prestador_servico"],
      tipo_exame_medico: [
        "admissional",
        "demissional",
        "periodico",
        "mudanca_riscos",
        "retorno_trabalho",
      ],
      tipo_salario: ["mensal", "diario", "por_hora"],
      vaga_status: ["aberta", "pausada", "fechada"],
    },
  },
} as const
