import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type SessionStatus = {
  id: string;
  receiver_address: string;
  expected_amount_kas: number;
  expected_amount_sompi: number;
  checkpoint_seconds: number;
  rate_kas_per_minute: number;
  paid_until: number;
  remaining_seconds: number;
  is_unlocked: boolean;
  last_payment_outpoint: string | null;
};

export default function SessionPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : null;
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const paymentUri = useMemo(() => {
    if (!status) return null;
    // Wallet URI schemes vary. This is a generic “kaspa:” payment URI.
    // Some wallets may ignore amount; QR still shows address + amount clearly.
    return `kaspa:${status.receiver_address}?amount=${status.expected_amount_kas}`;
  }, [status]);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    async function poll() {
      try {
        const res = await fetch(`/api/session/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (alive) {
          setStatus(data);
          setErr(null);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Error');
      }
    }

    poll();
    const t = setInterval(poll, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  if (!id) return <main style={{ padding: 16, fontFamily: 'system-ui, -apple-system' }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 820, margin: '40px auto', padding: 16, fontFamily: 'system-ui, -apple-system' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Session</h1>
        <button onClick={() => router.push('/')} style={{ padding: '8px 12px', cursor: 'pointer' }}>New session</button>
      </div>

      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {!status ? (
        <p>Loading status…</p>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
          <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Pay to unlock</h2>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
              <QRCodeSVG value={paymentUri || status.receiver_address} size={220} />
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              <div><strong>Send exactly:</strong> {status.expected_amount_kas} KAS</div>
              <div><strong>Buys:</strong> {status.checkpoint_seconds}s of access</div>
              <div><strong>To:</strong> <span style={{ wordBreak: 'break-all' }}>{status.receiver_address}</span></div>
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Each matching payment adds more time. You can “top up” by sending the same amount again.
              </div>
              <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
                Last matched outpoint: {status.last_payment_outpoint || '—'}
              </div>
            </div>
          </section>

          <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Access gate</h2>
              <div style={{ fontSize: 14 }}>
                <strong>Status:</strong>{' '}
                <span style={{ color: status.is_unlocked ? 'green' : 'crimson' }}>
                  {status.is_unlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 14 }}>
              <strong>Time remaining:</strong> {status.remaining_seconds}s
            </div>

            <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 10, minHeight: 220 }}>
              {status.is_unlocked ? (
                <>
                  <h3 style={{ marginTop: 0 }}>Unlocked content</h3>
                  <p style={{ lineHeight: 1.5 }}>
                    This section represents anything time-metered: an API key, a live feed, premium content, compute time, Wi‑Fi,
                    or a physical access token. For a 1‑day demo, we show a simple gate.
                  </p>
                  <ul style={{ marginTop: 10, lineHeight: 1.6 }}>
                    <li>Real Kaspa L1 payment → time credit</li>
                    <li>Time credit decays in real time</li>
                    <li>Top-up adds time instantly</li>
                  </ul>
                </>
              ) : (
                <>
                  <h3 style={{ marginTop: 0 }}>Locked</h3>
                  <p style={{ lineHeight: 1.5 }}>
                    Pay to unlock for a fixed time slice. When it runs out, it locks automatically.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
