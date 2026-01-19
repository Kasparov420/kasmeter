export const SOMPI_PER_KAS = 100_000_000; // 1 sompi = 1e-8 KAS

export function kasToSompi(kas: number): number {
  return Math.round(kas * SOMPI_PER_KAS);
}

export function sompiToKas(sompi: number): number {
  return sompi / SOMPI_PER_KAS;
}

// Generate a unique expected amount for a session by adding a tiny random 'tag'
// so multiple concurrent sessions can pay to the same receiver address.
// Tag range: 1..99_999 sompi (<= 0.00000099999 KAS)
export function makeUniqueAmountSompi(baseSompi: number): number {
  const tag = 1 + Math.floor(Math.random() * 99_999);
  return baseSompi + tag;
}

// Convenience: compute price for a given checkpoint (in seconds) based on a KAS/minute rate.
export function priceSompiForCheckpoint(rateKasPerMinute: number, checkpointSeconds: number): number {
  const kas = rateKasPerMinute * (checkpointSeconds / 60);
  return kasToSompi(kas);
}
