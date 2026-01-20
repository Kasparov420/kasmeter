# Kaspa Time-Pay Demo (1-day MVP)

This is a minimal **pay-as-you-use** primitive for Kaspa:

- A user sends a **specific amount** of KAS to a receiver address.
- The app detects the payment and **unlocks access for a checkpoint** (a time slice, e.g., 30s/60s/5m).
- When time runs out, the content locks again.
- Sending the same amount again **tops up** more time.

The “wow” is the pricing primitive: **time-native payments on L1**.

## How it detects payment
To keep this 1-day build dead simple, it:

1) Uses a single `RECEIVER_ADDRESS` (merchant address)
2) Lets the user pick a checkpoint length per session
3) Computes an amount from `RATE_KAS_PER_MINUTE * checkpoint` and adds a tiny unique “tag” in sompi
4) Polls the Kaspa REST API for new UTXOs to the receiver address, and matches by amount

Kaspa REST API base used by default: `https://api.kaspa.org` citeturn0search0turn0search15

## Setup

1. Install deps

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env.local
# edit RECEIVER_ADDRESS
```

3. Run

```bash
npm run dev

# in another terminal (same folder)
node watcher.js
```

Open http://localhost:3000

## Notes / limitations

- This is a demo. A production version should:
  - derive unique addresses per session from an xpub (no unique-amount matching)
  - use websocket / notifications instead of polling
  - run its own indexer / watcher for reliability

- Smallest unit: **1 sompi = 1e-8 KAS** citeturn2search1
redeploy 1768912083
