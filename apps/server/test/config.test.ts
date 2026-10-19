import { describe, expect, it } from 'vitest';
import { loadServerConfig } from '../src/config.js';

const validEnv = {
  PRIMUS_APP_ID: 'app-id',
  PRIMUS_APP_SECRET: 'secret-value',
  PRIMUS_TEMPLATE_ID: 'template-id',
  DEMO_CREDIT_SCORE: '720',
  PORT: '8787',
  ALLOWED_ORIGIN: 'http://localhost:5173',
  PUBLIC_SOURCE_URL: 'https://demo.example/score',
};

describe('loadServerConfig', () => {
  it.each([
    ['PRIMUS_APP_SECRET', { PRIMUS_APP_SECRET: '' }],
    ['PRIMUS_TEMPLATE_ID', { PRIMUS_TEMPLATE_ID: '' }],
    ['DEMO_CREDIT_SCORE', { DEMO_CREDIT_SCORE: 'abc' }],
  ])('rejects invalid %s', (field, override) => {
    expect(() => loadServerConfig({ ...validEnv, ...override })).toThrow(field);
    expect(() => loadServerConfig({ ...validEnv, ...override })).not.toThrow('secret-value');
  });

  it('uses a default score and accepts an integer override', () => {
    const { DEMO_CREDIT_SCORE: _ignored, ...withoutScore } = validEnv;
    expect(loadServerConfig(withoutScore).demoCreditScore).toBe(720);
    expect(loadServerConfig({ ...validEnv, DEMO_CREDIT_SCORE: '600' }).demoCreditScore).toBe(600);
  });
});
