# Supabase Adapter Staging Area

This folder is intentionally minimal and acts as the integration boundary for future Supabase support.

Rules:
- Keep feature services independent from Supabase SDK details.
- Implement adapters here and expose them through application ports.
- Preserve tenant isolation rules regardless of provider.
