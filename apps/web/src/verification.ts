import type { ParsedCreditData, ThresholdResult } from './contracts';

export interface AttestationLike {
  verified: boolean;
  recipient: string;
  templateId: string;
  timestamp: number;
  data: string;
}
export interface CreditPolicy { threshold: number; source: 'CONTROLLED_TEST_SOURCE'; maxAgeSeconds: number; }
export interface VerificationResult extends Omit<ThresholdResult, 'status'> {
  status: string;
  timestamp?: number;
  recipient?: string;
  templateId?: string;
  source?: string;
}

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

export function verifyAndEvaluate(attestation: AttestationLike, nowMs: number, policy: CreditPolicy): VerificationResult {
  const base = { passed: false, score: 0, threshold: policy.threshold };
  if (!attestation.verified) return { ...base, status: 'signature invalid' };
  if (Math.abs(nowMs - attestation.timestamp) > policy.maxAgeSeconds * 1000) return { ...base, status: 'timestamp expired' };
  let parsed: ParsedCreditData;
  try { parsed = parseAttestationData(attestation.data); } catch (error) { return { ...base, status: error instanceof Error ? error.message : 'attestation data invalid' }; }
  if (parsed.source !== policy.source) return { ...base, status: 'untrusted source' };
  const evaluated = evaluateCreditScore(parsed.creditScore, policy.threshold);
  return { ...evaluated, timestamp: attestation.timestamp, recipient: attestation.recipient, templateId: attestation.templateId, source: parsed.source };
}
