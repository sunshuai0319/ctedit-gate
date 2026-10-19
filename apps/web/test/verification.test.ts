import { describe, expect, it } from 'vitest';
import { evaluateCreditScore, parseAttestationData, verifyAndEvaluate } from '../src/verification';

describe('credit verification policy', () => {
  it.each([[720, true], [650, true], [649, false], [600, false]])(
    'evaluates %s against the threshold',
    (score, passed) => {
      expect(evaluateCreditScore(score)).toMatchObject({ score, threshold: 650, passed });
    },
  );

  it('rejects malformed or untrusted attestation data', () => {
    expect(() => parseAttestationData('{')).toThrow(/malformed/i);
    expect(() => parseAttestationData(JSON.stringify({ data: {} }))).toThrow(/creditScore/i);
    expect(() =>
      parseAttestationData(JSON.stringify({ data: { creditScore: 720, source: 'OTHER' } })),
    ).toThrow(/source/i);
  });

  it('parses trusted credit data', () => {
    expect(parseAttestationData(JSON.stringify({ data: { creditScore: 720, source: 'CONTROLLED_TEST_SOURCE' } }))).toEqual({
      creditScore: 720,
      source: 'CONTROLLED_TEST_SOURCE',
    });
  });

  const base = { recipient: '0xabc', templateId: 'template-id', timestamp: 1_700_000_000_000, data: JSON.stringify({ data: { creditScore: 720, source: 'CONTROLLED_TEST_SOURCE' } }) };
  const policy = { threshold: 650, source: 'CONTROLLED_TEST_SOURCE' as const, maxAgeSeconds: 300 };
  it.each([
    ['signature', { verified: false }, /signature/i],
    ['json', { verified: true, data: '{' }, /malformed/i],
    ['source', { verified: true, data: JSON.stringify({ data: { creditScore: 720, source: 'OTHER' } }) }, /source/i],
    ['timestamp', { verified: true, timestamp: 1_699_999_000_000 }, /timestamp/i],
    ['threshold', { verified: true, data: JSON.stringify({ data: { creditScore: 649, source: 'CONTROLLED_TEST_SOURCE' } }) }, /threshold/i],
  ])('rejects invalid %s attestations', (_label, override, error) => {
    const result = verifyAndEvaluate({ ...base, ...override }, 1_700_000_000_000, policy);
    expect(result.passed).toBe(false); expect(result.status).toMatch(error);
  });
});
