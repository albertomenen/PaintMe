import { Config } from '@/constants/Config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Config.SUPABASE_URL;
const supabaseAnonKey = Config.SUPABASE_ANON_KEY;

// Debug logging (remove in production)
if (__DEV__) {
  console.log('🔗 Supabase Client Debug:', {
    url: supabaseUrl,
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET'
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          credits: number;
          image_generations_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          credits?: number;
          image_generations_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits?: number;
          image_generations_remaining?: number;
          updated_at?: string;
        };
      };
      transformations: {
        Row: {
          id: string;
          user_id: string;
          original_image_url: string;
          transformed_image_url: string;
          artist_style: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_image_url: string;
          transformed_image_url?: string;
          artist_style: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_image_url?: string;
          transformed_image_url?: string;
          artist_style?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          updated_at?: string;
        };
      };
    };
  };
}; 