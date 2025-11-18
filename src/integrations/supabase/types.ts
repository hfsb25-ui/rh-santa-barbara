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
      employees: {
        Row: {
          cargo: string
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          data_desligamento: string | null
          endereco: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          quantidade_folgas: number | null
          salario: number | null
          setor: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          telefone: string | null
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
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo: string
          quantidade_folgas?: number | null
          salario?: number | null
          setor?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          telefone?: string | null
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
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
          quantidade_folgas?: number | null
          salario?: number | null
          setor?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          telefone?: string | null
          ultima_alteracao_folgas?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_entrega: string
          employee_id: string
          id: string
          observacoes: string | null
          quantidade: number
          tipo_epi: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_entrega: string
          employee_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tipo_epi: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
          created_at: string | null
          created_by: string | null
          dias_totais: number
          employee_id: string
          id: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_gozo_fim: string
          periodo_gozo_inicio: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dias_totais: number
          employee_id: string
          id?: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_gozo_fim: string
          periodo_gozo_inicio: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
          created_at: string | null
          created_by: string | null
          data_entrega: string
          employee_id: string
          id: string
          observacoes: string | null
          quantidade: number
          tamanho: string
          tipo_uniforme: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_entrega: string
          employee_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          tamanho: string
          tipo_uniforme: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
      employee_status: "ativo" | "ferias" | "afastado" | "demitido"
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
      employee_status: ["ativo", "ferias", "afastado", "demitido"],
    },
  },
} as const
