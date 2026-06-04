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
    PostgrestVersion: "14.5"
  }
  regwatch: {
    Tables: {
      alert_deliveries: {
        Row: {
          channel: string
          delivered_at: string
          delivery_metadata: Json
          delivery_status: string
          id: string
          organization_id: string
          regulatory_item_id: string
          user_id: string
        }
        Insert: {
          channel: string
          delivered_at?: string
          delivery_metadata?: Json
          delivery_status?: string
          id?: string
          organization_id: string
          regulatory_item_id: string
          user_id: string
        }
        Update: {
          channel?: string
          delivered_at?: string
          delivery_metadata?: Json
          delivery_status?: string
          id?: string
          organization_id?: string
          regulatory_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_regulatory_item_id_fkey"
            columns: ["regulatory_item_id"]
            isOneToOne: false
            referencedRelation: "regulatory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_preferences: {
        Row: {
          channel: string
          created_at: string
          critical_only: boolean
          frequency: string
          id: string
          organization_id: string
          saved_view_id: string | null
          severity_threshold: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          critical_only?: boolean
          frequency?: string
          id?: string
          organization_id: string
          saved_view_id?: string | null
          severity_threshold?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          critical_only?: boolean
          frequency?: string
          id?: string
          organization_id?: string
          saved_view_id?: string | null
          severity_threshold?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_addr: unknown
          metadata: Json
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_addr?: unknown
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_addr?: unknown
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          asset_type: string
          created_at: string
          footprint_id: string
          id: string
          jurisdiction_code: string | null
          metadata: Json
          name: string
          organization_id: string
          permits: Json
          segment: string
          substances_cas: string[]
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          footprint_id: string
          id?: string
          jurisdiction_code?: string | null
          metadata?: Json
          name: string
          organization_id: string
          permits?: Json
          segment: string
          substances_cas?: string[]
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          footprint_id?: string
          id?: string
          jurisdiction_code?: string | null
          metadata?: Json
          name?: string
          organization_id?: string
          permits?: Json
          segment?: string
          substances_cas?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_footprint_id_fkey"
            columns: ["footprint_id"]
            isOneToOne: false
            referencedRelation: "operations_footprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      footprint_matches: {
        Row: {
          assigned_to: string | null
          footprint_id: string
          id: string
          match_reason: Json
          matched_at: string
          organization_id: string
          regulatory_item_id: string
          resolved_at: string | null
          score: number
          seen_at: string | null
          severity: string
        }
        Insert: {
          assigned_to?: string | null
          footprint_id: string
          id?: string
          match_reason?: Json
          matched_at?: string
          organization_id: string
          regulatory_item_id: string
          resolved_at?: string | null
          score: number
          seen_at?: string | null
          severity?: string
        }
        Update: {
          assigned_to?: string | null
          footprint_id?: string
          id?: string
          match_reason?: Json
          matched_at?: string
          organization_id?: string
          regulatory_item_id?: string
          resolved_at?: string | null
          score?: number
          seen_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "footprint_matches_footprint_id_fkey"
            columns: ["footprint_id"]
            isOneToOne: false
            referencedRelation: "operations_footprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "footprint_matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "footprint_matches_regulatory_item_id_fkey"
            columns: ["regulatory_item_id"]
            isOneToOne: false
            referencedRelation: "regulatory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_briefings: {
        Row: {
          citations: Json
          deeper_resources: string | null
          details: string
          footprint_id: string
          generated_at: string
          generation_metadata: Json
          headline: string
          id: string
          organization_id: string
          regulatory_item_id: string
          requested_by: string | null
          trust_markers: Json
          what_to_do_now: string
          why_it_matters: string
        }
        Insert: {
          citations?: Json
          deeper_resources?: string | null
          details: string
          footprint_id: string
          generated_at?: string
          generation_metadata?: Json
          headline: string
          id?: string
          organization_id: string
          regulatory_item_id: string
          requested_by?: string | null
          trust_markers?: Json
          what_to_do_now: string
          why_it_matters: string
        }
        Update: {
          citations?: Json
          deeper_resources?: string | null
          details?: string
          footprint_id?: string
          generated_at?: string
          generation_metadata?: Json
          headline?: string
          id?: string
          organization_id?: string
          regulatory_item_id?: string
          requested_by?: string | null
          trust_markers?: Json
          what_to_do_now?: string
          why_it_matters?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_briefings_footprint_id_fkey"
            columns: ["footprint_id"]
            isOneToOne: false
            referencedRelation: "operations_footprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_briefings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_briefings_regulatory_item_id_fkey"
            columns: ["regulatory_item_id"]
            isOneToOne: false
            referencedRelation: "regulatory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_footprints: {
        Row: {
          activities_isic: string[]
          activities_nace: string[]
          activities_naics: string[]
          configured_at: string | null
          created_at: string
          geographies: string[]
          id: string
          is_configured: boolean
          monitored_regulator_slugs: string[]
          monitored_topics: string[]
          name: string
          organization_id: string
          substances_cas: string[]
          updated_at: string
        }
        Insert: {
          activities_isic?: string[]
          activities_nace?: string[]
          activities_naics?: string[]
          configured_at?: string | null
          created_at?: string
          geographies?: string[]
          id?: string
          is_configured?: boolean
          monitored_regulator_slugs?: string[]
          monitored_topics?: string[]
          name?: string
          organization_id: string
          substances_cas?: string[]
          updated_at?: string
        }
        Update: {
          activities_isic?: string[]
          activities_nace?: string[]
          activities_naics?: string[]
          configured_at?: string | null
          created_at?: string
          geographies?: string[]
          id?: string
          is_configured?: boolean
          monitored_regulator_slugs?: string[]
          monitored_topics?: string[]
          name?: string
          organization_id?: string
          substances_cas?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_footprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      regulators: {
        Row: {
          canonical_url: string | null
          crawl_config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          jurisdiction_code: string
          jurisdiction_name: string
          name: string
          region: string
          regulator_type: string
          short_name: string | null
          slug: string
          topic_domains: string[]
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          crawl_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction_code: string
          jurisdiction_name: string
          name: string
          region: string
          regulator_type: string
          short_name?: string | null
          slug: string
          topic_domains?: string[]
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          crawl_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction_code?: string
          jurisdiction_name?: string
          name?: string
          region?: string
          regulator_type?: string
          short_name?: string | null
          slug?: string
          topic_domains?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_items: {
        Row: {
          body_html: string | null
          body_search: unknown
          body_text: string | null
          citation: string
          consultation_closes_at: string | null
          effective_date: string | null
          embedding: string | null
          enrichment_metadata: Json
          enrichment_status: string
          id: string
          ingested_at: string
          instrument_type: string
          isic_codes: string[]
          jurisdiction_code: string
          last_changed_at: string
          nace_codes: string[]
          naics_codes: string[]
          proposed_date: string | null
          published_at: string
          regulator_id: string
          slug: string
          source_url: string
          status: string
          substances_cas: string[]
          summary: string | null
          title: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_search?: unknown
          body_text?: string | null
          citation: string
          consultation_closes_at?: string | null
          effective_date?: string | null
          embedding?: string | null
          enrichment_metadata?: Json
          enrichment_status?: string
          id?: string
          ingested_at?: string
          instrument_type: string
          isic_codes?: string[]
          jurisdiction_code: string
          last_changed_at?: string
          nace_codes?: string[]
          naics_codes?: string[]
          proposed_date?: string | null
          published_at?: string
          regulator_id: string
          slug: string
          source_url: string
          status?: string
          substances_cas?: string[]
          summary?: string | null
          title: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_search?: unknown
          body_text?: string | null
          citation?: string
          consultation_closes_at?: string | null
          effective_date?: string | null
          embedding?: string | null
          enrichment_metadata?: Json
          enrichment_status?: string
          id?: string
          ingested_at?: string
          instrument_type?: string
          isic_codes?: string[]
          jurisdiction_code?: string
          last_changed_at?: string
          nace_codes?: string[]
          naics_codes?: string[]
          proposed_date?: string | null
          published_at?: string
          regulator_id?: string
          slug?: string
          source_url?: string
          status?: string
          substances_cas?: string[]
          summary?: string | null
          title?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_items_regulator_id_fkey"
            columns: ["regulator_id"]
            isOneToOne: false
            referencedRelation: "regulators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_member: { Args: { target_org: string }; Returns: boolean }
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
  regwatch: {
    Enums: {},
  },
} as const
