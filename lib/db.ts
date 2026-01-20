// lib/db.ts

export type Session = {
  id: string;
  address: string; // receiver address
  expected_amount_sompi: number;
  checkpoint_seconds: number;
  rate_kas_per_minute: number;
  created_at: number; // unix seconds
  paid_until: number; // unix seconds
  last_payment_outpoint: string | null;
};

type Store = Map<string, Session>;

// Keep store alive across hot reloads / lambda reuse
function getStore(): Store {
  const g = globalThis as unknown as { __kasmeterStore?: Store };
  if (!g.__kasmeterStore) g.__kasmeterStore = new Map();
  return g.__kasmeterStore;
}

export function createSession(session: Session): Session {
  const store = getStore();
  store.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | null {
  const store = getStore();
  return store.get(id) ?? null;
}

export function updateSession(
  id: string,
  patch: Partial<Omit<Session, "id" | "created_at">>
): Session | null {
  const store = getStore();
  const existing = store.get(id);
  if (!existing) return null;

  const updated: Session = { ...existing, ...patch };
  store.set(id, updated);
  return updated;
}
