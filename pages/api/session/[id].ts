// pages/api/session/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../../lib/db";
import { sompiToKas } from "../../../lib/kaspa";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const id = req.query.id;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  const row = getSession(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, row.paid_until - now);

  return res.status(200).json({
    id: row.id,
    receiver_address: row.address,
    expected_amount_sompi: row.expected_amount_sompi,
    expected_amount_kas: sompiToKas(row.expected_amount_sompi),
    checkpoint_seconds: row.checkpoint_seconds,
    rate_kas_per_minute: row.rate_kas_per_minute,
    created_at: row.created_at,
    paid_until: row.paid_until,
    remaining_seconds: remaining,
    is_unlocked: remaining > 0,
    last_payment_outpoint: row.last_payment_outpoint ?? null,
  });
}
