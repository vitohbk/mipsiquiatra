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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_exceptions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          note: string | null
          professional_user_id: string
          service_id: string | null
          start_time: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          note?: string | null
          professional_user_id: string
          service_id?: string | null
          start_time?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          note?: string | null
          professional_user_id?: string
          service_id?: string | null
          start_time?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "availability_exceptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_booking_pages"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "availability_exceptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          professional_user_id: string
          service_id: string | null
          start_time: string
          tenant_id: string
          timezone: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          professional_user_id: string
          service_id?: string | null
          start_time: string
          tenant_id: string
          timezone?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          professional_user_id?: string
          service_id?: string | null
          start_time?: string
          tenant_id?: string
          timezone?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_booking_pages"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_action_tokens: {
        Row: {
          action: string
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          action: string
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          action?: string
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_action_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_locks: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          end_at: string
          expires_at: string
          id: string
          lock_token: string
          patient_id: string | null
          professional_user_id: string
          service_id: string
          start_at: string
          status: string
          tenant_id: string
          time_range: unknown
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          end_at: string
          expires_at: string
          id?: string
          lock_token: string
          patient_id?: string | null
          professional_user_id: string
          service_id: string
          start_at: string
          status?: string
          tenant_id: string
          time_range?: unknown
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          end_at?: string
          expires_at?: string
          id?: string
          lock_token?: string
          patient_id?: string | null
          professional_user_id?: string
          service_id?: string
          start_at?: string
          status?: string
          tenant_id?: string
          time_range?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "booking_locks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locks_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "booking_locks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_booking_pages"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "booking_locks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_locks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          customer_rut: string | null
          end_at: string
          id: string
          patient_id: string | null
          payment_id: string | null
          professional_user_id: string
          service_id: string
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          time_range: unknown
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          customer_rut?: string | null
          end_at: string
          id?: string
          patient_id?: string | null
          payment_id?: string | null
          professional_user_id: string
          service_id: string
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          time_range?: unknown
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          customer_rut?: string | null
          end_at?: string
          id?: string
          patient_id?: string | null
          payment_id?: string | null
          professional_user_id?: string
          service_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          time_range?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_booking_pages"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          secondary_role: Database["public"]["Enums"]["tenant_role"] | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["tenant_role"]
          secondary_role?: Database["public"]["Enums"]["tenant_role"] | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          secondary_role?: Database["public"]["Enums"]["tenant_role"] | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address_line: string | null
          birth_date: string | null
          comuna: string | null
          created_at: string
          email: string
          first_name: string
          health_insurance: Database["public"]["Enums"]["health_insurance"]
          id: string
          last_name: string
          phone: string
          region: string | null
          rut: string
          tenant_id: string
        }
        Insert: {
          address_line?: string | null
          birth_date?: string | null
          comuna?: string | null
          created_at?: string
          email: string
          first_name: string
          health_insurance: Database["public"]["Enums"]["health_insurance"]
          id?: string
          last_name: string
          phone: string
          region?: string | null
          rut: string
          tenant_id: string
        }
        Update: {
          address_line?: string | null
          birth_date?: string | null
          comuna?: string | null
          created_at?: string
          email?: string
          first_name?: string
          health_insurance?: Database["public"]["Enums"]["health_insurance"]
          id?: string
          last_name?: string
          phone?: string
          region?: string | null
          rut?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_clp: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          paid_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference: string | null
          raw_response: Json
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Insert: {
          amount_clp: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          paid_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          raw_response?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Update: {
          amount_clp?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          raw_response?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_tenant_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          phone: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          professional_user_id: string
          public_token: string
          service_id: string
          slug: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          professional_user_id: string
          public_token: string
          service_id: string
          slug: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          professional_user_id?: string
          public_token?: string
          service_id?: string
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_links_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "public_booking_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_booking_pages"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "public_booking_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_booking_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          currency: string
          deposit_amount_clp: number | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          max_advance_hours: number
          modality: Database["public"]["Enums"]["service_modality"]
          name: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          price_clp: number
          professional_user_id: string
          requires_payment: boolean
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit_amount_clp?: number | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          max_advance_hours?: number
          modality?: Database["public"]["Enums"]["service_modality"]
          name: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          price_clp: number
          professional_user_id: string
          requires_payment?: boolean
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deposit_amount_clp?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_advance_hours?: number
          modality?: Database["public"]["Enums"]["service_modality"]
          name?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          price_clp?: number
          professional_user_id?: string
          requires_payment?: boolean
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_booking_pages: {
        Row: {
          branding: Json | null
          currency: string | null
          deposit_amount_clp: number | null
          description: string | null
          duration_minutes: number | null
          max_advance_hours: number | null
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          price_clp: number | null
          professional_user_id: string | null
          requires_payment: boolean | null
          service_id: string | null
          service_name: string | null
          slug: string | null
          tenant_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      has_tenant_role: {
        Args: { roles: Database["public"]["Enums"]["tenant_role"][]; t: string }
        Returns: boolean
      }
      is_member_of_tenant: { Args: { t: string }; Returns: boolean }
      is_same_tenant_member: { Args: { target_user: string }; Returns: boolean }
      run_booking_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled"
      health_insurance: "fonasa" | "isapre" | "particular"
      payment_mode: "full" | "deposit"
      payment_provider: "webpay" | "stripe" | "paypal" | "mercadopago"
      payment_status: "pending" | "paid" | "failed" | "expired" | "refunded"
      service_modality: "zoom" | "whatsapp"
      tenant_role: "owner" | "admin" | "professional" | "staff"
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
      booking_status: ["pending", "confirmed", "cancelled"],
      health_insurance: ["fonasa", "isapre", "particular"],
      payment_mode: ["full", "deposit"],
      payment_provider: ["webpay", "stripe", "paypal", "mercadopago"],
      payment_status: ["pending", "paid", "failed", "expired", "refunded"],
      service_modality: ["zoom", "whatsapp"],
      tenant_role: ["owner", "admin", "professional", "staff"],
    },
  },
} as const
