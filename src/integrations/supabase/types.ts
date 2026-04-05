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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointment_photos: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          photo_url: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          photo_url: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          photo_url?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_photos_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          date: string
          id: string
          km: string | null
          license_plate: string
          mechanic_id: string | null
          notes: string | null
          service: string
          status: string
          time_slot: string
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string
          date: string
          id?: string
          km?: string | null
          license_plate: string
          mechanic_id?: string | null
          notes?: string | null
          service: string
          status?: string
          time_slot: string
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          km?: string | null
          license_plate?: string
          mechanic_id?: string | null
          notes?: string | null
          service?: string
          status?: string
          time_slot?: string
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          license_plate: string
          model: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          license_plate: string
          model?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          license_plate?: string
          model?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          cif: string | null
          city: string | null
          company_name: string | null
          created_at: string
          default_vat: number | null
          email: string | null
          id: string
          labor_rate: number | null
          owner_user_id: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cif?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_vat?: number | null
          email?: string | null
          id?: string
          labor_rate?: number | null
          owner_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cif?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_vat?: number | null
          email?: string | null
          id?: string
          labor_rate?: number | null
          owner_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_type: string
          name: string
          quantity: number
          total: number
          unit_price: number
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_type?: string
          name: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_type?: string
          name?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_type: string
          quantity: number
          total: number
          unit_price: number
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_type?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_type?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_series: {
        Row: {
          created_at: string
          id: string
          last_number: number
          prefix: string | null
          user_id: string
          workshop_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_number?: number
          prefix?: string | null
          user_id: string
          workshop_id?: string | null
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_number?: number
          prefix?: string | null
          user_id?: string
          workshop_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_series_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          client_name: string
          created_at: string
          id: string
          invoice_number: string
          labor_cost: number
          license_plate: string
          parts_total: number
          service: string
          status: string
          tax_rate: number
          total: number
          user_id: string
          work_order_id: string | null
          workshop_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_name: string
          created_at?: string
          id?: string
          invoice_number: string
          labor_cost?: number
          license_plate: string
          parts_total?: number
          service: string
          status?: string
          tax_rate?: number
          total?: number
          user_id: string
          work_order_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_name?: string
          created_at?: string
          id?: string
          invoice_number?: string
          labor_cost?: number
          license_plate?: string
          parts_total?: number
          service?: string
          status?: string
          tax_rate?: number
          total?: number
          user_id?: string
          work_order_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          name: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          name: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_parts: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          name: string
          quantity: number
          unit_price: number
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          name: string
          quantity?: number
          unit_price?: number
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          unit_price?: number
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_parts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_parts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_catalog: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          ref: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          ref?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          ref?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_catalog_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          line_type: string
          quantity: number
          quote_id: string
          total: number
          unit_price: number
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          line_type?: string
          quantity?: number
          quote_id: string
          total?: number
          unit_price?: number
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_type?: string
          quantity?: number
          quote_id?: string
          total?: number
          unit_price?: number
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          appointment_id: string | null
          brand: string | null
          client_name: string
          created_at: string
          estimated_hours: number
          id: string
          labor_cost: number
          labor_rate: number
          license_plate: string
          model: string | null
          notes: string | null
          parts_total: number
          phone: string | null
          service: string
          status: string
          tax_rate: number
          total: number
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          brand?: string | null
          client_name?: string
          created_at?: string
          estimated_hours?: number
          id?: string
          labor_cost?: number
          labor_rate?: number
          license_plate?: string
          model?: string | null
          notes?: string | null
          parts_total?: number
          phone?: string | null
          service?: string
          status?: string
          tax_rate?: number
          total?: number
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          brand?: string | null
          client_name?: string
          created_at?: string
          estimated_hours?: number
          id?: string
          labor_cost?: number
          labor_rate?: number
          license_plate?: string
          model?: string | null
          notes?: string | null
          parts_total?: number
          phone?: string | null
          service?: string
          status?: string
          tax_rate?: number
          total?: number
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_vehicles: {
        Row: {
          assigned_client: string | null
          brand: string | null
          client_phone: string | null
          created_at: string
          delivery_date: string | null
          id: string
          km: string | null
          model: string | null
          plate: string
          return_date: string | null
          status: string | null
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          assigned_client?: string | null
          brand?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          km?: string | null
          model?: string | null
          plate?: string
          return_date?: string | null
          status?: string | null
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          assigned_client?: string | null
          brand?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          km?: string | null
          model?: string | null
          plate?: string
          return_date?: string | null
          status?: string | null
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "substitution_vehicles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          item_type: string
          quantity: number
          total: number
          unit_price: number
          user_id: string
          work_order_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          item_type?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id: string
          work_order_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          item_type?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
          work_order_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          created_at: string
          id: string
          name: string
          quantity: number
          total: number | null
          unit_price: number
          user_id: string
          work_order_id: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          quantity?: number
          total?: number | null
          unit_price?: number
          user_id: string
          work_order_id: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          total?: number | null
          unit_price?: number
          user_id?: string
          work_order_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          appointment_id: string
          comentario_factura: string | null
          created_at: string
          id: string
          labor_cost: number | null
          labor_rate: number | null
          notes: string | null
          repair_end_time: string | null
          repair_start_time: string | null
          repair_time_hours: number | null
          status: string
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          appointment_id: string
          comentario_factura?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
          labor_rate?: number | null
          notes?: string | null
          repair_end_time?: string | null
          repair_start_time?: string | null
          repair_time_hours?: number | null
          status?: string
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          appointment_id?: string
          comentario_factura?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
          labor_rate?: number | null
          notes?: string | null
          repair_end_time?: string | null
          repair_start_time?: string | null
          repair_time_hours?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_settings: {
        Row: {
          address: string | null
          cif: string | null
          created_at: string
          email: string | null
          id: string
          labor_rate: number | null
          phone: string | null
          updated_at: string
          user_id: string
          workshop_name: string | null
        }
        Insert: {
          address?: string | null
          cif?: string | null
          created_at?: string
          email?: string | null
          id?: string
          labor_rate?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
          workshop_name?: string | null
        }
        Update: {
          address?: string | null
          cif?: string | null
          created_at?: string
          email?: string | null
          id?: string
          labor_rate?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          workshop_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_workshop_id: { Args: never; Returns: string }
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
