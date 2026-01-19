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

  const expectedSompiNum =
    typeof row.expectedSompi === 'number' ? row.expectedSompi : Number(row.expectedSompi);

  return res.status(200).json({
    id: row.id,
    receiver_address: row.address,
    expected_amount_sompi: expectedSompiNum,
    expected_amount_kas: sompiToKas(expectedSompiNum),
    checkpoint_seconds: row.checkpointSeconds,

    // optional fields (kept null-safe so frontend doesn't break)
    rate_kas_per_minute: (row as any).rateKasPerMinute ?? null,
    created_at: row.createdAt,
    paid_until: row.paidUntil,

    remaining_seconds: remaining,
    is_unlocked: remaining > 0,

    last_payment_outpoint: (row as any).lastPaymentOutpoint ?? null,
  });
}
