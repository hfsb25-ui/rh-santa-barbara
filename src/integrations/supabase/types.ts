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
          nome: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
      tipo_contrato: "fixo" | "intermitente" | "prestador_servico"
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
      tipo_contrato: ["fixo", "intermitente", "prestador_servico"],
      tipo_salario: ["mensal", "diario", "por_hora"],
      vaga_status: ["aberta", "pausada", "fechada"],
    },
  },
} as const
