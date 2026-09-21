export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          points_balance: number;
          ticket_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          points_balance?: number;
          ticket_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          x_post_url: string;
          status: "DRAFT" | "ACTIVE" | "EXPIRED" | "ARCHIVED";
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          x_post_url: string;
          status?: "DRAFT" | "ACTIVE" | "EXPIRED" | "ARCHIVED";
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      raffles: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          access_code: string;
          wl_spots: number;
          status: "DRAFT" | "OPEN" | "CLOSED" | "DRAWN";
          starts_at: string | null;
          ends_at: string | null;
          closed_at: string | null;
          drawn_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          access_code: string;
          wl_spots: number;
          status?: "DRAFT" | "OPEN" | "CLOSED" | "DRAWN";
          starts_at?: string | null;
          ends_at?: string | null;
          closed_at?: string | null;
          drawn_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raffles"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
