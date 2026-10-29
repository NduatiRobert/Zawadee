/**
 * Database types for the current schema.
 *
 * NOTE: This file is normally produced by `pnpm gen:types`
 * (`supabase gen types typescript --local`). Local generation needs a running
 * local Supabase (Docker), which is unavailable on the current dev machine, so
 * this file is hand-maintained to match the applied migrations and committed so
 * that typed Supabase clients and `pnpm typecheck` work locally. CI regenerates
 * it from the real schema before typecheck/build, so any drift is caught there.
 * Keep it in step with `supabase/migrations/*`. See docs/DECISIONS.md.
 */

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
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      farms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          location: string | null;
          currency: string;
          timezone: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          location?: string | null;
          currency?: string;
          timezone?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          location?: string | null;
          currency?: string;
          timezone?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      farm_members: {
        Row: {
          id: string;
          farm_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["farm_role"];
          status: Database["public"]["Enums"]["member_status"];
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          farm_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["farm_role"];
          status?: Database["public"]["Enums"]["member_status"];
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          farm_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["farm_role"];
          status?: Database["public"]["Enums"]["member_status"];
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "farm_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          farm_id: string;
          email: string;
          role: Database["public"]["Enums"]["farm_role"];
          token: string;
          status: Database["public"]["Enums"]["invitation_status"];
          expires_at: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          accepted_at: string | null;
          accepted_by: string | null;
        };
        Insert: {
          id?: string;
          farm_id: string;
          email: string;
          role: Database["public"]["Enums"]["farm_role"];
          token?: string;
          status?: Database["public"]["Enums"]["invitation_status"];
          expires_at?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Update: {
          id?: string;
          farm_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["farm_role"];
          token?: string;
          status?: Database["public"]["Enums"]["invitation_status"];
          expires_at?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
        ];
      };
      farm_settings: {
        Row: {
          farm_id: string;
          date_format: string;
          units: string;
          low_stock_threshold: number;
          overdue_days: number;
          invoice_prefix: string;
          logo_path: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          farm_id: string;
          date_format?: string;
          units?: string;
          low_stock_threshold?: number;
          overdue_days?: number;
          invoice_prefix?: string;
          logo_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          farm_id?: string;
          date_format?: string;
          units?: string;
          low_stock_threshold?: number;
          overdue_days?: number;
          invoice_prefix?: string;
          logo_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "farm_settings_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          row_id: string | null;
          farm_id: string | null;
          action: string;
          before: Json | null;
          after: Json | null;
          actor: string | null;
          at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          row_id?: string | null;
          farm_id?: string | null;
          action: string;
          before?: Json | null;
          after?: Json | null;
          actor?: string | null;
          at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          row_id?: string | null;
          farm_id?: string | null;
          action?: string;
          before?: Json | null;
          after?: Json | null;
          actor?: string | null;
          at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_farm_member: {
        Args: { p_farm_id: string };
        Returns: boolean;
      };
      has_farm_role: {
        Args: {
          p_farm_id: string;
          p_roles: Database["public"]["Enums"]["farm_role"][];
        };
        Returns: boolean;
      };
      shares_farm_with: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      create_farm: {
        Args: {
          p_name: string;
          p_slug: string;
          p_location?: string | null;
          p_currency?: string;
          p_timezone?: string;
        };
        Returns: Database["public"]["Tables"]["farms"]["Row"];
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["farm_members"]["Row"];
      };
    };
    Enums: {
      farm_role: "owner" | "manager" | "vet" | "worker" | "accountant";
      member_status: "active" | "invited" | "suspended";
      invitation_status: "pending" | "accepted" | "revoked" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
