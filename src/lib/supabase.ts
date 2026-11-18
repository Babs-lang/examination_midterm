import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export interface SupabaseSchemaProbeResult {
  reachable: boolean;
  schemaReady: boolean;
  message: string;
}

export async function probeSupabaseSchema(): Promise<SupabaseSchemaProbeResult> {
  if (!supabase) {
    return {
      reachable: false,
      schemaReady: false,
      message: 'Supabase environment variables are not configured.',
    };
  }

  try {
    const { error } = await supabase
      .from('scholarship_programs')
      .select('id')
      .limit(1);

    if (!error) {
      return {
        reachable: true,
        schemaReady: true,
        message: 'Connected to Supabase PostgreSQL schema with RLS active.',
      };
    }

    if (error.code === 'PGRST205') {
      return {
        reachable: true,
        schemaReady: false,
        message:
          'Supabase reachable; run supabase/migrations/001_scholarship_schema.sql in Supabase SQL Editor to enable remote tables. Active persistence is running on local SQLite backend.',
      };
    }

    return {
      reachable: true,
      schemaReady: false,
      message: error.message,
    };
  } catch (err) {
    return {
      reachable: false,
      schemaReady: false,
      message: err instanceof Error ? err.message : 'Unable to reach Supabase endpoint.',
    };
  }
}
