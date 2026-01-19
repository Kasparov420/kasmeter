export const SOMPI_PER_KAS = 100_000_000; // 1 sompi = 1e-8 KAS

export function kasToSompi(kas: number): number {
  return Math.round(kas * SOMPI_PER_KAS);
}

export function sompiToKas(sompi: number): number {
  return sompi / SOMPI_PER_KAS;
}

export function makeUniqueAmountSompi(baseSompi: number): number {
  const tag = 1 + Math.floor(Math.random() * 99_999);
  return baseSompi + tag;
}

export function priceSompiForCheckpoint(rateKasPerMinute: number, checkpointSeconds: number): number {
  const kas = rateKasPerMinute * (checkpointSeconds / 60);
  return kasToSompi(kas);
}
