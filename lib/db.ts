export type Session = {
  id: string;
  createdAt: number;
  paidUntil: number;
  address: string;
  expectedSompi: string;
  checkpointSeconds: number;
};

const g = globalThis as any;
if (!g.__kasmeter) g.__kasmeter = { sessions: new Map<string, Session>() };

const sessions: Map<string, Session> = g.__kasmeter.sessions;

export function dbInit() {
  // no-op (kept so other code doesn't break)
}

export function createSession(s: Session) {
  sessions.set(s.id, s);
  return s;
}

export function getSession(id: string): Session | null {
  return sessions.get(id) ?? null;
}

export function updateSession(id: string, patch: Partial<Session>): Session | null {
  const prev = sessions.get(id);
  if (!prev) return null;
  const next = { ...prev, ...patch };
  sessions.set(id, next);
  return next;
}
