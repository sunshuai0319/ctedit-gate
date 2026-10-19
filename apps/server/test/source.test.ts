import { describe, expect, it } from 'vitest';
import { buildScorePayload, renderScorePage } from '../src/source.js';

describe('controlled score source', () => {
  it('renders a fixed test page that requests only the relative JSON endpoint', () => {
    const html = renderScorePage('/score');
    expect(html).toContain('CONTROLLED_TEST_SOURCE');
    expect(html).toContain('/api/score');
    expect(html).toContain('测试数据');
    expect(html).not.toContain('document.location');
  });

  it('builds a minimal payload without identity or platform fields', () => {
    const payload = buildScorePayload(720, 1700000000000);
    expect(payload).toEqual({
      data: { creditScore: 720, source: 'CONTROLLED_TEST_SOURCE', issuedAt: 1700000000000 },
    });
    expect(JSON.stringify(payload)).not.toMatch(/identity|cookie|支付宝/i);
  });
});
