export type BackendProvider = 'nestjs' | 'supabase';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}
