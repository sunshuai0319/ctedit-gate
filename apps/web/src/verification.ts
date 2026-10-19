import type { ParsedCreditData, ThresholdResult } from './contracts';

export function evaluateCreditScore(score: number, threshold = 650): ThresholdResult {
  const passed = score >= threshold;
  return { passed, score, threshold, status: passed ? 'threshold passed' : 'threshold failed' };
}

export function parseAttestationData(data: string): ParsedCreditData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error('Malformed attestation data');
  }
  const candidate = (parsed as { data?: unknown })?.data;
  if (!candidate || typeof candidate !== 'object') throw new Error('Missing attestation data');
  const value = candidate as Record<string, unknown>;
  if (typeof value.creditScore !== 'number' || !Number.isFinite(value.creditScore)) {
    throw new Error('Missing numeric creditScore');
  }
  if (value.source !== 'CONTROLLED_TEST_SOURCE') throw new Error('Untrusted attestation source');
  return {
    creditScore: value.creditScore,
    source: 'CONTROLLED_TEST_SOURCE',
    ...(typeof value.issuedAt === 'number' ? { issuedAt: value.issuedAt } : {}),
  };
}
