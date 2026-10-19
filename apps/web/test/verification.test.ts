import { describe, expect, it } from 'vitest';
import { evaluateCreditScore, parseAttestationData } from '../src/verification';

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
});
