import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../lib/db';
import { sompiToKas } from '../../../lib/kaspa';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });

  const row = getSession(id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, row.paidUntil - now);

  return res.status(200).json({
    id: row.id,
    receiver_address: row.address,
    expected_amount_sompi: row.expectedSompi,
    expected_amount_kas: sompiToKas(row.expectedSompi),
    checkpoint_seconds: row.checkpointSeconds,

    // These may not exist in your in-memory Session (depends on your create.ts).
    // Keep them null-safe so the frontend doesn't break.
    rate_kas_per_minute: (row as any).rateKasPerMinute ?? null,
    created_at: row.createdAt,
    paid_until: row.paidUntil,

    remaining_seconds: remaining,
    is_unlocked: remaining > 0,

    last_payment_outpoint: (row as any).lastPaymentOutpoint ?? null,
  });
}
