export type BackendProvider = 'nestjs' | 'supabase';

export interface BackendProviderConfig {
  provider: BackendProvider;
}
