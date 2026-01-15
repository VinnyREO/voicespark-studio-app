import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create supabase client with fallback for missing env vars
let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  // Create a dummy client that will fail gracefully on API calls
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Database types
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          thumbnail_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          thumbnail_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          thumbnail_url?: string | null;
        };
      };
      project_data: {
        Row: {
          id: string;
          project_id: string;
          data: any;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          data: any;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          data?: any;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          owner_id: string;
          member_user_id: string | null;
          member_email: string | null;
          access_scope: 'workspace' | 'project';
          project_id: string | null;
          role: 'editor' | 'viewer';
          invitation_token: string;
          invitation_status: 'pending' | 'accepted' | 'declined';
          invited_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          member_user_id?: string | null;
          member_email?: string | null;
          access_scope?: 'workspace' | 'project';
          project_id?: string | null;
          role?: 'editor' | 'viewer';
          invitation_token?: string;
          invitation_status?: 'pending' | 'accepted' | 'declined';
          invited_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          member_user_id?: string | null;
          member_email?: string | null;
          access_scope?: 'workspace' | 'project';
          project_id?: string | null;
          role?: 'editor' | 'viewer';
          invitation_token?: string;
          invitation_status?: 'pending' | 'accepted' | 'declined';
          invited_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
