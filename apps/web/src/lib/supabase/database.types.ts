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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_event: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          deal_id: string | null
          entity_id: string
          entity_type: string
          field: string | null
          id: number
          new_value: Json | null
          old_value: Json | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          deal_id?: string | null
          entity_id: string
          entity_type: string
          field?: string | null
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          deal_id?: string | null
          entity_id?: string
          entity_type?: string
          field?: string | null
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_event_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_event_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      deal: {
        Row: {
          address_line: string
          agent: string | null
          asking_price_pence: number | null
          baths: number | null
          beds: number | null
          comp_search: Json
          cover_photo_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          floor_area_sqm: number | null
          id: string
          key_features: string[]
          lat: number | null
          listed_at: string | null
          listing_provider_id: string | null
          listing_url: string | null
          lng: number | null
          passed_reason: string | null
          photo_urls: string[]
          postcode: string | null
          property_type: string | null
          status: string
          status_changed_at: string
          archived_at: string | null
          tenure: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address_line: string
          agent?: string | null
          asking_price_pence?: number | null
          baths?: number | null
          beds?: number | null
          comp_search?: Json
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          floor_area_sqm?: number | null
          id?: string
          key_features?: string[]
          lat?: number | null
          listed_at?: string | null
          listing_provider_id?: string | null
          listing_url?: string | null
          lng?: number | null
          passed_reason?: string | null
          photo_urls?: string[]
          postcode?: string | null
          property_type?: string | null
          status?: string
          status_changed_at?: string
          archived_at?: string | null
          tenure?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address_line?: string
          agent?: string | null
          asking_price_pence?: number | null
          baths?: number | null
          beds?: number | null
          comp_search?: Json
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          floor_area_sqm?: number | null
          id?: string
          key_features?: string[]
          lat?: number | null
          listed_at?: string | null
          listing_provider_id?: string | null
          listing_url?: string | null
          lng?: number | null
          passed_reason?: string | null
          photo_urls?: string[]
          postcode?: string | null
          property_type?: string | null
          status?: string
          status_changed_at?: string
          archived_at?: string | null
          tenure?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_input: {
        Row: {
          deal_id: string
          id: string
          key: string
          note: string | null
          scope: string
          set_at: string
          set_by: string | null
          source_text: string | null
          source_url: string | null
          user_id: string | null
          value: Json
          workspace_id: string
        }
        Insert: {
          deal_id: string
          id?: string
          key: string
          note?: string | null
          scope: string
          set_at?: string
          set_by?: string | null
          source_text?: string | null
          source_url?: string | null
          user_id?: string | null
          value: Json
          workspace_id: string
        }
        Update: {
          deal_id?: string
          id?: string
          key?: string
          note?: string | null
          scope?: string
          set_at?: string
          set_by?: string | null
          source_text?: string | null
          source_url?: string | null
          user_id?: string | null
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_input_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_input_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_input_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_input_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      erc_band: {
        Row: {
          from_month: number
          id: string
          ordinal: number
          pct: number
          product_id: string
          to_month: number
          workspace_id: string
        }
        Insert: {
          from_month: number
          id?: string
          ordinal: number
          pct: number
          product_id: string
          to_month: number
          workspace_id: string
        }
        Update: {
          from_month?: number
          id?: string
          ordinal?: number
          pct?: number
          product_id?: string
          to_month?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erc_band_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "finance_product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erc_band_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_product: {
        Row: {
          archived_at: string | null
          arrangement_fee_kind: string
          arrangement_fee_pct: number
          arrangement_fee_pence: number
          broker_fee_pence: number
          cashback_pence: number
          created_at: string
          created_by: string | null
          exit_fee_pct: number | null
          fee_added_to_loan: boolean
          fixed_months: number | null
          icr_threshold: number | null
          id: string
          interest_mode: string | null
          last_reviewed_at: string
          lender: string
          max_ltv: number | null
          min_months_owned_for_revaluation: number | null
          min_term_months: number | null
          monthly_rate: number | null
          name: string
          notes: string | null
          rate: number | null
          rate_type: string | null
          repayment: string | null
          stress_rate: number | null
          term_months: number | null
          type: string
          updated_at: string
          valuation_fee_pence: number
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          arrangement_fee_kind?: string
          arrangement_fee_pct?: number
          arrangement_fee_pence?: number
          broker_fee_pence?: number
          cashback_pence?: number
          created_at?: string
          created_by?: string | null
          exit_fee_pct?: number | null
          fee_added_to_loan?: boolean
          fixed_months?: number | null
          icr_threshold?: number | null
          id?: string
          interest_mode?: string | null
          last_reviewed_at?: string
          lender: string
          max_ltv?: number | null
          min_months_owned_for_revaluation?: number | null
          min_term_months?: number | null
          monthly_rate?: number | null
          name: string
          notes?: string | null
          rate?: number | null
          rate_type?: string | null
          repayment?: string | null
          stress_rate?: number | null
          term_months?: number | null
          type: string
          updated_at?: string
          valuation_fee_pence?: number
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          arrangement_fee_kind?: string
          arrangement_fee_pct?: number
          arrangement_fee_pence?: number
          broker_fee_pence?: number
          cashback_pence?: number
          created_at?: string
          created_by?: string | null
          exit_fee_pct?: number | null
          fee_added_to_loan?: boolean
          fixed_months?: number | null
          icr_threshold?: number | null
          id?: string
          interest_mode?: string | null
          last_reviewed_at?: string
          lender?: string
          max_ltv?: number | null
          min_months_owned_for_revaluation?: number | null
          min_term_months?: number | null
          monthly_rate?: number | null
          name?: string
          notes?: string | null
          rate?: number | null
          rate_type?: string | null
          repayment?: string | null
          stress_rate?: number | null
          term_months?: number | null
          type?: string
          updated_at?: string
          valuation_fee_pence?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_product_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_product_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_pot: {
        Row: {
          amount_pence: number
          created_at: string
          id: string
          kind: string
          name: string
          note: string | null
          owner_user_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_pence: number
          created_at?: string
          id?: string
          kind?: string
          name: string
          note?: string | null
          owner_user_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_pence?: number
          created_at?: string
          id?: string
          kind?: string
          name?: string
          note?: string | null
          owner_user_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_pot_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_pot_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_snapshot: {
        Row: {
          created_by: string | null
          deal_id: string | null
          error: string | null
          fetched_at: string
          id: string
          parsed: Json
          provider: string
          provider_ref: string | null
          raw_path: string | null
          source_url: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_by?: string | null
          deal_id?: string | null
          error?: string | null
          fetched_at?: string
          id?: string
          parsed?: Json
          provider: string
          provider_ref?: string | null
          raw_path?: string | null
          source_url: string
          status: string
          workspace_id: string
        }
        Update: {
          created_by?: string | null
          deal_id?: string | null
          error?: string | null
          fetched_at?: string
          id?: string
          parsed?: Json
          provider?: string
          provider_ref?: string | null
          raw_path?: string | null
          source_url?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_snapshot_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_snapshot_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_snapshot_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      refurb_item: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deal_id: string
          description: string | null
          id: string
          ordinal: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string | null
          id?: string
          ordinal?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string | null
          id?: string
          ordinal?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refurb_item_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refurb_item_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refurb_item_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rule_set: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          effective_from: string
          effective_to: string | null
          id: string
          jurisdiction: string
          kind: string
          note: string | null
          source_url: string | null
          verified_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          effective_from: string
          effective_to?: string | null
          id?: string
          jurisdiction?: string
          kind: string
          note?: string | null
          source_url?: string | null
          verified_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          effective_from?: string
          effective_to?: string | null
          id?: string
          jurisdiction?: string
          kind?: string
          note?: string | null
          source_url?: string | null
          verified_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rule_set_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rule_set_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_member: {
        Row: {
          joined_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_member_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          buy_box: Json
          buyer_entity: string
          defaults: Json
          stale_after_days: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buy_box?: Json
          buyer_entity?: string
          defaults?: Json
          stale_after_days?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buy_box?: Json
          buyer_entity?: string
          defaults?: Json
          stale_after_days?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activity_ignored_columns: { Args: never; Returns: string[] }
      is_workspace_member: {
        Args: { target_workspace: string }
        Returns: boolean
      }
      log_event: {
        Args: {
          p_deal: string
          p_entity_id: string
          p_entity_type: string
          p_field: string
          p_payload: Json
          p_workspace: string
        }
        Returns: undefined
      }
      save_finance_product: {
        Args: { p_bands: Json; p_product: Json }
        Returns: string
      }
      shares_workspace_with: { Args: { target_user: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
