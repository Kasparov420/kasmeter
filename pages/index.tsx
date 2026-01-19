import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkpointSeconds, setCheckpointSeconds] = useState<number>(60);
  const router = useRouter();

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ checkpoint_seconds: checkpointSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await router.push(`/s/${data.id}`);
    } catch (e: any) {
      setError(e?.message || 'Error');
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'system-ui, -apple-system' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Kaspa Time-Pay Demo</h1>
      <p style={{ lineHeight: 1.5 }}>
        Pay a fixed amount to unlock the page for a fixed amount of time. When time runs out, it locks again.
        This is the minimal “pay-as-you-use” primitive.
      </p>

      <div style={{ marginTop: 14, border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}><strong>Choose checkpoint (time slice):</strong></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[30, 60, 300].map((s) => (
            <button
              key={s}
              onClick={() => setCheckpointSeconds(s)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: checkpointSeconds === s ? '#f3f3f3' : 'white',
              }}
            >
              {s === 300 ? '5 min' : `${s}s`}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            Custom
            <input
              type="number"
              min={15}
              max={600}
              value={checkpointSeconds}
              onChange={(e) => setCheckpointSeconds(Math.max(15, Math.min(600, Number(e.target.value) || 60)))}
              style={{ width: 90, padding: '6px 8px' }}
            />
            sec
          </label>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          Shorter checkpoints reduce overpay if you stop early, but increase transaction count.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button onClick={start} disabled={loading} style={{ padding: '10px 14px', fontSize: 16, cursor: 'pointer' }}>
          {loading ? 'Creating session…' : 'Start a session'}
        </button>
        {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
      </div>

      <div style={{ marginTop: 24, fontSize: 14, opacity: 0.85 }}>
        <p><strong>How it works:</strong> the app generates a unique expected payment amount and watches a receiver address for a matching UTXO.</p>
        <p><strong>Note:</strong> This demo uses polling against a Kaspa REST API, and a local watcher process.</p>
      </div>
    </main>
  );
}
