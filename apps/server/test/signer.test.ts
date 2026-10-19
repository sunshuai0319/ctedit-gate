import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../src/contracts.js';
import { validateSignParams } from '../src/signer.js';

const config: ServerConfig = {
  primusAppId: 'app-id', primusAppSecret: 'secret-value', primusTemplateId: 'template-id',
  demoCreditScore: 720, port: 8787, allowedOrigin: 'http://localhost:5173', publicSourceUrl: 'https://demo.example/score',
};
const valid = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  appId: 'app-id', attTemplateID: 'template-id', userAddress: '0xabc', timestamp: Date.now(), ...overrides,
});

describe('signing boundary', () => {
  it('accepts a current fixed-template request', () => {
    expect(validateSignParams(valid(), config)).toMatchObject({ templateId: 'template-id', recipient: '0xabc' });
  });

  it.each([
    ['malformed', '{'],
    ['wrong template', valid({ attTemplateID: 'other' })],
    ['missing recipient', valid({ userAddress: '' })],
    ['expired nonce', valid({ timestamp: Date.now() - 301_000 })],
  ])('rejects %s without exposing secrets', (_label, value) => {
    expect(() => validateSignParams(value, config)).toThrow();
    expect(() => validateSignParams(value, config)).not.toThrow('secret-value');
  });

  it('does not allow a URL field to change the fixed template source', () => {
    expect(() => validateSignParams(valid({ url: 'https://evil.example' }), config)).toThrow(/INVALID_SIGN_PARAMS/);
  });
});
