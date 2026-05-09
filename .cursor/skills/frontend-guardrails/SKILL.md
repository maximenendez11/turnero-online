---
name: frontend-guardrails
description: Prevent frontend blank states and rendering regressions in Angular screens. Use when building or refactoring pages, loading states, API integrations, and UI flow steps.
---

# Frontend Guardrails

## Goal

Avoid silent failures in UI flows: if backend returns data, frontend must show it or show a clear state (loading, empty, error).

## Mandatory checks for every screen

1. Add explicit states:
   - `loading` state with skeleton or spinner
   - `empty` state with clear message
   - `error` state with retry action
2. Never rely on one response shape only. Normalize API responses at service level.
3. Do not hide content behind transitional text overlays.
4. Keep screen logic deterministic:
   - guard preconditions (required selected entities)
   - redirect only when preconditions fail
5. Repeated async lists must have `reload` action and visible fallback.

## Angular implementation pattern

Use this minimum pattern for async lists:

```ts
loading = false;
error = false;
items: Item[] = [];

async loadItems(): Promise<void> {
  this.loading = true;
  this.error = false;
  try {
    this.items = await firstValueFrom(this.api.getItems());
    if (this.items.length === 0) {
      await new Promise((r) => setTimeout(r, 300));
      this.items = await firstValueFrom(this.api.getItems());
    }
  } catch {
    this.items = [];
    this.error = true;
  } finally {
    this.loading = false;
  }
}
```

## API service normalization rule

When backend may return `[]` or `{ data: [] }` / `{ staff: [] }`, normalize in service:

```ts
private asArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>)[key])) {
    return (value as Record<string, T[]>)[key];
  }
  return [];
}
```

## UI checklist before done

- Data visible when API returns non-empty payload
- Skeleton visible only while loading
- Empty message only when load finished with zero items
- Error message + retry visible on request failure
- No visual overlap that hides cards/buttons
