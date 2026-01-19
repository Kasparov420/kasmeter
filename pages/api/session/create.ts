import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { db } from '../../../lib/db';
import crypto from 'crypto';
import { makeUniqueAmountSompi, sompiToKas, priceSompiForCheckpoint } from '../../../lib/kaspa';

const BodySchema = z.object({
  // optional: allow custom label
  label: z.string().max(80).optional(),
  // payment checkpoint (time slice) in seconds
  checkpoint_seconds: z.number().int().min(15).max(600).optional(),
});

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const receiver = getEnv('RECEIVER_ADDRESS');
  const defaultCheckpointSeconds = Number(getEnv('CHECKPOINT_SECONDS_DEFAULT', '60'));
  const rateKasPerMinute = Number(getEnv('RATE_KAS_PER_MINUTE', '0.1'));

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

  const id = crypto.randomBytes(12).toString('hex');
  const checkpointSeconds = parsed.data.checkpoint_seconds ?? defaultCheckpointSeconds;
  const base = priceSompiForCheckpoint(rateKasPerMinute, checkpointSeconds);
  const expected = makeUniqueAmountSompi(base);

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO sessions (id, receiver_address, expected_amount_sompi, checkpoint_seconds, rate_kas_per_minute, created_at, paid_until, last_payment_outpoint)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(id, receiver, expected, checkpointSeconds, rateKasPerMinute, now, 0);

  return res.status(200).json({
    id,
    receiver_address: receiver,
    expected_amount_sompi: expected,
    expected_amount_kas: sompiToKas(expected),
    checkpoint_seconds: checkpointSeconds,
    rate_kas_per_minute: rateKasPerMinute,
    label: parsed.data.label ?? null,
  });
}
