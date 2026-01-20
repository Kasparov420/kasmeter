// pages/api/session/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import crypto from 'crypto';
import { createSession } from '../../../lib/db';
import { sompiToKas, kasToSompi, makeUniqueAmountSompi } from '../../../lib/kaspa';

const BodySchema = z.object({
  checkpoint_seconds: z.number().int().min(1).max(3600).default(10),
  duration_seconds: z.number().int().min(5).max(24 * 60 * 60).default(60),
  rate_kas_per_minute: z.number().min(0.000001).max(1000).optional(),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const receiver = process.env.RECEIVER_ADDRESS;
  if (!receiver) return res.status(500).json({ error: 'Missing RECEIVER_ADDRESS env var' });

  const { checkpoint_seconds, duration_seconds } = parsed.data;

  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();

  // Simple pricing (you can change later)
  const rateKasPerMinute = parsed.data.rate_kas_per_minute ?? 0.1;

  // Total price for the selected duration, then add a tiny tag so payments are unique
  const totalKas = rateKasPerMinute * (duration_seconds / 60);
  const baseSompi = Math.max(1, kasToSompi(totalKas));
  const expectedSompi = makeUniqueAmountSompi(baseSompi);

  createSession({
    id,
    receiver_address: receiver,
    expected_amount_sompi: expectedSompi,
    checkpoint_seconds,
    rate_kas_per_minute: rateKasPerMinute,
    created_at: now,
    paid_until: now,
    last_payment_outpoint: null,
  });

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
