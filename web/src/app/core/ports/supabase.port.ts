export interface SupabaseAuthPort {
  signInWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface SupabaseStoragePort {
  uploadPublicAsset(path: string, file: File): Promise<string>;
}

export interface SupabaseRealtimePort {
  subscribeToChannel(channel: string, onMessage: (payload: unknown) => void): () => void;
}
