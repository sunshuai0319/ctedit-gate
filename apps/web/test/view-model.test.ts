import { describe, expect, it } from 'vitest';
import { toViewModel, type DemoState } from '../src/view-model';

describe('demo view model', () => {
  it.each([
    ['idle', '开始证明'],
    ['signing', '正在请求签名'],
    ['awaiting_extension', '请在 Primus 扩展中完成操作'],
    ['verifying', '正在校验证明'],
  ] as const)('maps %s state', (state, buttonLabel) => {
    const model = toViewModel({ kind: state, message: '' } as DemoState);
    expect(model.buttonLabel).toBe(buttonLabel);
    expect(model.sourceLabel).toBe('数据来源：受控演示数据（Primus）');
  });

  it('gives actionable retry guidance without leaking secrets', () => {
    const model = toViewModel({ kind: 'failed', message: 'secret-value', errorCode: 'EXTENSION_MISSING' });
    expect(model.errorMessage).toContain('安装');
    expect(model.showRetry).toBe(true);
    expect(JSON.stringify(model)).not.toContain('secret-value');
  });

  it('shows success metadata and threshold result', () => {
    const model = toViewModel({ kind: 'success', message: '', result: { passed: true, score: 720, threshold: 650, status: 'threshold passed', source: 'CONTROLLED_TEST_SOURCE', timestamp: 1_700_000_000_000, recipient: '0xabc', templateId: 'template-id' } });
    expect(model.statusLabel).toContain('通过');
    expect(model.sourceLabel).toBe('数据来源：受控演示数据（Primus）');
    expect(model.metadata).toContain('模板 template-id');
    expect(model.allowRetry).toBe(true);
  });
});
