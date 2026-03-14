// Database types matching ARCHITECTURE.md schema.
// Regenerate with: npx supabase gen types typescript --local > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          goal: string | null;
          first_wing: string | null;
          onboarded: boolean;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          goal?: string | null;
          first_wing?: string | null;
          onboarded?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          goal?: string | null;
          first_wing?: string | null;
          onboarded?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      wings: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          custom_name: string | null;
          accent_color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          custom_name?: string | null;
          accent_color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slug?: string;
          custom_name?: string | null;
          accent_color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          wing_id: string;
          user_id: string;
          name: string;
          icon: string;
          cover_hue: number;
          sort_order: number;
          is_shared: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          wing_id: string;
          user_id: string;
          name: string;
          icon?: string;
          cover_hue?: number;
          sort_order?: number;
          is_shared?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          wing_id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          cover_hue?: number;
          sort_order?: number;
          is_shared?: boolean;
          created_at?: string;
        };
      };
      memories: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          title: string;
          description: string | null;
          type: string;
          file_path: string | null;
          file_url: string | null;
          thumbnail_url: string | null;
          metadata: Json;
          hue: number;
          saturation: number;
          lightness: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          type: string;
          file_path?: string | null;
          file_url?: string | null;
          thumbnail_url?: string | null;
          metadata?: Json;
          hue?: number;
          saturation?: number;
          lightness?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          type?: string;
          file_path?: string | null;
          file_url?: string | null;
          thumbnail_url?: string | null;
          metadata?: Json;
          hue?: number;
          saturation?: number;
          lightness?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      room_shares: {
        Row: {
          id: string;
          room_id: string;
          owner_id: string;
          shared_with_email: string;
          shared_with_id: string | null;
          permission: string;
          accepted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          owner_id: string;
          shared_with_email: string;
          shared_with_id?: string | null;
          permission?: string;
          accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          owner_id?: string;
          shared_with_email?: string;
          shared_with_id?: string | null;
          permission?: string;
          accepted?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
