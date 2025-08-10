export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          trader_name: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          trader_name?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          trader_name?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual: string | null
          created_at: string
          currency: string
          detail_url: string | null
          event_time: string
          forecast: string | null
          id: string
          impact_level: string
          previous: string | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          actual?: string | null
          created_at?: string
          currency: string
          detail_url?: string | null
          event_time: string
          forecast?: string | null
          id?: string
          impact_level: string
          previous?: string | null
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual?: string | null
          created_at?: string
          currency?: string
          detail_url?: string | null
          event_time?: string
          forecast?: string | null
          id?: string
          impact_level?: string
          previous?: string | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fund_data: {
        Row: {
          active_fund: number | null
          created_at: string
          id: string
          initial_capital: number | null
          lot_base_capital: number | null
          lot_base_lot: number | null
          mode: string
          profit_dist_active: number | null
          profit_dist_profit: number | null
          profit_dist_reserve: number | null
          profit_fund: number | null
          reserve_fund: number | null
          sub_user_name: string | null
          target_reserve_fund: number | null
          total_capital: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_fund?: number | null
          created_at?: string
          id?: string
          initial_capital?: number | null
          lot_base_capital?: number | null
          lot_base_lot?: number | null
          mode: string
          profit_dist_active?: number | null
          profit_dist_profit?: number | null
          profit_dist_reserve?: number | null
          profit_fund?: number | null
          reserve_fund?: number | null
          sub_user_name?: string | null
          target_reserve_fund?: number | null
          total_capital?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_fund?: number | null
          created_at?: string
          id?: string
          initial_capital?: number | null
          lot_base_capital?: number | null
          lot_base_lot?: number | null
          mode?: string
          profit_dist_active?: number | null
          profit_dist_profit?: number | null
          profit_dist_reserve?: number | null
          profit_fund?: number | null
          reserve_fund?: number | null
          sub_user_name?: string | null
          target_reserve_fund?: number | null
          total_capital?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          status: string | null
          trader_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string | null
          trader_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string | null
          trader_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_history: {
        Row: {
          created_at: string
          details: string | null
          end_balance: number | null
          entry_price: number | null
          exit_price: number | null
          id: string
          lot_size: number | null
          mode: string
          notes: string | null
          profit_loss: number | null
          start_balance: number | null
          sub_user_name: string | null
          symbol: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          end_balance?: number | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          lot_size?: number | null
          mode: string
          notes?: string | null
          profit_loss?: number | null
          start_balance?: number | null
          sub_user_name?: string | null
          symbol?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          end_balance?: number | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          lot_size?: number | null
          mode?: string
          notes?: string | null
          profit_loss?: number | null
          start_balance?: number | null
          sub_user_name?: string | null
          symbol?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_history: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          description: string | null
          from_fund: string | null
          id: string
          mode: string
          sub_user_name: string | null
          to_fund: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          description?: string | null
          from_fund?: string | null
          id?: string
          mode: string
          sub_user_name?: string | null
          to_fund?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          description?: string | null
          from_fund?: string | null
          id?: string
          mode?: string
          sub_user_name?: string | null
          to_fund?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          deposit_settings: Json | null
          id: string
          lot_size_settings: Json | null
          mode: string
          profit_management_settings: Json | null
          sub_user_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deposit_settings?: Json | null
          id?: string
          lot_size_settings?: Json | null
          mode: string
          profit_management_settings?: Json | null
          sub_user_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deposit_settings?: Json | null
          id?: string
          lot_size_settings?: Json | null
          mode?: string
          profit_management_settings?: Json | null
          sub_user_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
