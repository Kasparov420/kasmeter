/*
  Minimal watcher that polls Kaspa REST API for new UTXOs on RECEIVER_ADDRESS.
  When it sees a NEW outpoint with amount matching a session's expected amount,
  it credits that session with its configured checkpoint length (seconds).

  This is intentionally simple for a 1-day demo.
*/

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'db.sqlite'));

const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS;
const KASPA_API_BASE = process.env.KASPA_API_BASE || 'https://api.kaspa.org';
const DEFAULT_CHECKPOINT_SECONDS = Number(process.env.CHECKPOINT_SECONDS_DEFAULT || '60');

if (!RECEIVER_ADDRESS) {
  console.error('Missing RECEIVER_ADDRESS env. Copy .env.example -> .env.local and set it.');
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function normalizeUtxos(payload) {
  // api.kaspa.org returns an array of UTXOs; field names may vary slightly by version.
  // We try multiple common shapes.
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.utxos)) return payload.utxos;
  return [];
}

function getOutpoint(u) {
  const txid = u.transactionId || u.txId || u.txid || (u.outpoint && u.outpoint.transactionId);
  const index = u.index ?? u.outpointIndex ?? u.vout ?? (u.outpoint && u.outpoint.index);
  if (!txid && txid !== 0) return null;
  if (index === undefined || index === null) return null;
  return `${txid}:${index}`;
}

function getAmountSompi(u) {
  // amount is usually in 'amount' (sompi). Some APIs nest it.
  const a = u.amount ?? (u.utxoEntry && u.utxoEntry.amount);
  if (typeof a === 'string') return Number(a);
  if (typeof a === 'number') return a;
  return null;
}

async function tick() {
  const url = `${KASPA_API_BASE.replace(/\/$/, '')}/addresses/${encodeURIComponent(RECEIVER_ADDRESS)}/utxos`;

  let utxos;
  try {
    const payload = await fetchJson(url);
    utxos = normalizeUtxos(payload);
  } catch (e) {
    console.error('[watcher] Failed to fetch utxos:', e.message);
    return;
  }

  const sessions = db.prepare('SELECT * FROM sessions').all();
  if (!sessions.length) return;

  const seenStmt = db.prepare('SELECT 1 FROM seen_outpoints WHERE outpoint = ?');
  const addSeenStmt = db.prepare('INSERT OR IGNORE INTO seen_outpoints (outpoint, amount_sompi, seen_at) VALUES (?, ?, ?)');
  const updateSessionStmt = db.prepare('UPDATE sessions SET paid_until = ?, last_payment_outpoint = ? WHERE id = ?');

  const t = nowSec();

  for (const u of utxos) {
    const outpoint = getOutpoint(u);
    const amount = getAmountSompi(u);
    if (!outpoint || amount === null) continue;

    const already = seenStmt.get(outpoint);
    if (already) continue;

    // Try to match a session by unique expected amount
    const match = sessions.find((s) => Number(s.expected_amount_sompi) === Number(amount));
    if (!match) continue;

    const currentPaidUntil = Number(match.paid_until || 0);
    const base = Math.max(currentPaidUntil, t);
    const checkpointSeconds = Number(match.checkpoint_seconds || DEFAULT_CHECKPOINT_SECONDS);
    const newPaidUntil = base + checkpointSeconds;

    addSeenStmt.run(outpoint, amount, t);
    updateSessionStmt.run(newPaidUntil, outpoint, match.id);

    console.log(`[watcher] Matched payment for session ${match.id}: +${checkpointSeconds}s (outpoint ${outpoint})`);
  }
}

async function main() {
  console.log('[watcher] Watching receiver address:', RECEIVER_ADDRESS);
  console.log('[watcher] API base:', KASPA_API_BASE);
  console.log('[watcher] Default checkpoint seconds:', DEFAULT_CHECKPOINT_SECONDS);

  // Poll every 2 seconds for the demo
  setInterval(() => {
    tick().catch((e) => console.error('[watcher] tick error', e));
  }, 2000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
