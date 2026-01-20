// lib/db.ts
export type Session = {
  id: string;

  // receiver (pay-to) address
  address: string;

  // pricing + timing
  expected_amount_sompi: number;
  checkpoint_seconds: number;
  rate_kas_per_minute: number;

  created_at: number;   // unix seconds
  paid_until: number;   // unix seconds

  // optional
  last_payment_outpoint: string | null;
};

// Global store (survives within a warm serverless instance)
declare global {
  // eslint-disable-next-line no-var
  var __KASMETER_SESSIONS__: Map<string, Session> | undefined;
}

const store: Map<string, Session> =
  globalThis.__KASMETER_SESSIONS__ ?? new Map<string, Session>();

globalThis.__KASMETER_SESSIONS__ = store;

export function createSession(s: Session): Session {
  store.set(s.id, s);
  return s;
}

export function getSession(id: string): Session | null {
  return store.get(id) ?? null;
}

export function updateSession(id: string, patch: Partial<Session>): Session | null {
  const cur = store.get(id);
  if (!cur) return null;
  const next: Session = { ...cur, ...patch };
  store.set(id, next);
  return next;
}
