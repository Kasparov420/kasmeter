import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import crypto from 'crypto';
import { createSession } from '../../../lib/db';
import { sompiToKas } from '../../../lib/kaspa';

const BodySchema = z.object({
  checkpoint_seconds: z.number().int().min(1).max(3600).default(10),
  duration_seconds: z.number().int().min(5).max(24 * 60 * 60).default(60),

  // pricing (KAS per minute). Default if client doesn't send it.
  rate_kas_per_minute: z.number().min(0.000001).max(1000).optional(),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const { checkpoint_seconds, duration_seconds } = parsed.data;

  const receiver = process.env.RECEIVER_ADDRESS;
  if (!receiver) return res.status(500).json({ error: 'Missing RECEIVER_ADDRESS env var' });

  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();

  // ---- Pricing model (simple + deterministic) ----
  // Default: 0.1 KAS / minute if not provided
  const rateKasPerMinute = parsed.data.rate_kas_per_minute ?? 0.1;

  // Total KAS for prepaid duration
  const totalKas = rateKasPerMinute * (duration_seconds / 60);

  // Convert KAS -> sompi (1 KAS = 1e8 sompi)
  // Add a small random "salt" to make the amount unique.
  const baseSompi = Math.max(1, Math.round(totalKas * 1e8));
  const saltSompi = crypto.randomInt(1, 10000); // 1..9999 sompi
  const expectedSompi = baseSompi + saltSompi;

  // Store session (in-memory)
  createSession({
    id,
    createdAt: now,
    paidUntil: now, // locked until payment detection extends it
    address: receiver,
    expectedSompi: expectedSompi, // number
    checkpointSeconds: checkpoint_seconds,

    // optional compat fields for UI
    // @ts-ignore
    rateKasPerMinute,
    // @ts-ignore
    lastPaymentOutpoint: null,
  } as any);

  return res.status(200).json({
    id,
    receiver_address: receiver,
    expected_amount_sompi: expectedSompi,
    expected_amount_kas: sompiToKas(expectedSompi),
    checkpoint_seconds,
    duration_seconds,
    rate_kas_per_minute: rateKasPerMinute,
    created_at: now,
    paid_until: now,
  });
}
