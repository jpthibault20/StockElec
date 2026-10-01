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
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          item_type: Database["public"]["Enums"]["item_type"] | null
          name: string
          params_schema: Json
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"] | null
          name: string
          params_schema?: Json
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"] | null
          name?: string
          params_schema?: Json
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      filaments: {
        Row: {
          bed_temp_c: number | null
          color_hex: string | null
          diameter_mm: number
          dried_on: string | null
          item_id: string
          material: string
          nozzle_temp_c: number | null
          opened_on: string | null
          remaining_g: number | null
          tare_g: number | null
          user_id: string
        }
        Insert: {
          bed_temp_c?: number | null
          color_hex?: string | null
          diameter_mm?: number
          dried_on?: string | null
          item_id: string
          material: string
          nozzle_temp_c?: number | null
          opened_on?: string | null
          remaining_g?: number | null
          tare_g?: number | null
          user_id?: string
        }
        Update: {
          bed_temp_c?: number | null
          color_hex?: string | null
          diameter_mm?: number
          dried_on?: string | null
          item_id?: string
          material?: string
          nozzle_temp_c?: number | null
          opened_on?: string | null
          remaining_g?: number | null
          tare_g?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filaments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_links: {
        Row: {
          created_at: string
          id: string
          item_id: string
          supplier: string
          unit_price: number | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          supplier: string
          unit_price?: number | null
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          supplier?: string
          unit_price?: number | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_photos: {
        Row: {
          ai_result: Json | null
          created_at: string
          id: string
          item_id: string
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          item_id: string
          position?: number
          storage_path: string
          user_id?: string
        }
        Update: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          item_id?: string
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          approx_level: Database["public"]["Enums"]["approx_level"] | null
          barcode: string | null
          category_id: string | null
          created_at: string
          datasheet_url: string | null
          id: string
          location_id: string | null
          manufacturer: string | null
          min_threshold: number | null
          mpn: string | null
          name: string
          notes: string | null
          package: string | null
          params: Json
          quantity: number
          quantity_mode: Database["public"]["Enums"]["quantity_mode"]
          tags: string[] | null
          type: Database["public"]["Enums"]["item_type"]
          unit: Database["public"]["Enums"]["quantity_unit"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approx_level?: Database["public"]["Enums"]["approx_level"] | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          datasheet_url?: string | null
          id?: string
          location_id?: string | null
          manufacturer?: string | null
          min_threshold?: number | null
          mpn?: string | null
          name: string
          notes?: string | null
          package?: string | null
          params?: Json
          quantity?: number
          quantity_mode?: Database["public"]["Enums"]["quantity_mode"]
          tags?: string[] | null
          type: Database["public"]["Enums"]["item_type"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          approx_level?: Database["public"]["Enums"]["approx_level"] | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          datasheet_url?: string | null
          id?: string
          location_id?: string | null
          manufacturer?: string | null
          min_threshold?: number | null
          mpn?: string | null
          name?: string
          notes?: string | null
          package?: string | null
          params?: Json
          quantity?: number
          quantity_mode?: Database["public"]["Enums"]["quantity_mode"]
          tags?: string[] | null
          type?: Database["public"]["Enums"]["item_type"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          label: string | null
          purchased: boolean
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          label?: string | null
          purchased?: boolean
          quantity?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          label?: string | null
          purchased?: boolean
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      spool_tares: {
        Row: {
          brand: string
          created_at: string
          id: string
          tare_g: number
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          tare_g: number
          user_id?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          tare_g?: number
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          delta: number
          from_location_id: string | null
          id: string
          item_id: string
          to_location_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          delta?: number
          from_location_id?: string | null
          id?: string
          item_id: string
          to_location_id?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id?: string
        }
        Update: {
          created_at?: string
          delta?: number
          from_location_id?: string | null
          id?: string
          item_id?: string
          to_location_id?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_item_quantity: {
        Args: { p_delta: number; p_item_id: string }
        Returns: number
      }
    }
    Enums: {
      approx_level: "plenty" | "some" | "almost_empty"
      item_type: "component" | "consumable" | "tool" | "printing_3d"
      movement_type: "add" | "remove" | "move"
      quantity_mode: "exact" | "approximate"
      quantity_unit: "piece" | "meter" | "gram" | "spool"
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
    Enums: {
      approx_level: ["plenty", "some", "almost_empty"],
      item_type: ["component", "consumable", "tool", "printing_3d"],
      movement_type: ["add", "remove", "move"],
      quantity_mode: ["exact", "approximate"],
      quantity_unit: ["piece", "meter", "gram", "spool"],
    },
  },
} as const
