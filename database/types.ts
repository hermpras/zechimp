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
        Relationships: [];
      };
      x_accounts: {
        Row: {
          id: string;
          user_id: string;
          x_user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          x_user_id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["x_accounts"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          campaign_id: string | null;
          type: "FOLLOW" | "LIKE_REPOST" | "COMMENT";
          title: string;
          description: string | null;
          reward_points: number;
          target_url: string | null;
          is_permanent: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          type: "FOLLOW" | "LIKE_REPOST" | "COMMENT";
          title: string;
          description?: string | null;
          reward_points?: number;
          target_url?: string | null;
          is_permanent?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["missions"]["Insert"]>;
        Relationships: [];
      };
      mission_completions: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          campaign_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          campaign_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_completions"]["Insert"]>;
        Relationships: [];
      };
      comment_proofs: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          campaign_id: string;
          comment_url: string;
          status: "PENDING" | "APPROVED" | "REJECTED";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          campaign_id: string;
          comment_url: string;
          status?: "PENDING" | "APPROVED" | "REJECTED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comment_proofs"]["Insert"]>;
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "MISSION_REWARD" | "ADMIN_ADJUSTMENT" | "TICKET_CONVERSION";
          source: string;
          mission_id: string | null;
          campaign_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "MISSION_REWARD" | "ADMIN_ADJUSTMENT" | "TICKET_CONVERSION";
          source: string;
          mission_id?: string | null;
          campaign_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["point_transactions"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
