import type { VerificationResult } from './verification';

export type DemoState =
  | { kind: 'idle' | 'signing' | 'awaiting_extension' | 'verifying'; message: string }
  | { kind: 'success'; message: string; result: VerificationResult }
  | { kind: 'failed'; message: string; errorCode?: string };
export interface ViewModel { buttonLabel: string; statusLabel: string; sourceLabel: string; showRetry: boolean; allowRetry: boolean; errorMessage?: string; metadata?: string; resultLabel?: string; }

const labels = { idle: '开始证明', signing: '正在请求签名', awaiting_extension: '请在 Primus 扩展中完成操作', verifying: '正在校验证明' } as const;
const errorLabels: Record<string, string> = { EXTENSION_MISSING: '请安装并启用 Primus Chrome 扩展后重试。', CREDENTIAL_ERROR: 'Primus 凭据配置错误，请检查服务端配置。', ATTESTATION_FAILED: '证明流程失败，请确认数据源页面已打开后重试。', PRIMUS_ERROR: 'Primus 服务暂时不可用，请稍后重试。', INVALID_SIGN_PARAMS: '证明请求无效，请重新发起。', NONCE_EXPIRED: '证明请求已过期，请重试。' };

export function toViewModel(state: DemoState): ViewModel {
  const base = { sourceLabel: '测试数据，不是芝麻分 · CONTROLLED_TEST_SOURCE', showRetry: false, allowRetry: false };
  if (state.kind === 'success') return { ...base, buttonLabel: '再次证明', statusLabel: state.result.passed ? '阈值通过' : '阈值未通过', allowRetry: true, metadata: `template ${state.result.templateId} · recipient ${state.result.recipient} · timestamp ${state.result.timestamp}`, resultLabel: `分数 ${state.result.score} / 阈值 ${state.result.threshold}` };
  if (state.kind === 'failed') return { ...base, buttonLabel: '重试', statusLabel: '证明失败', showRetry: true, allowRetry: true, errorMessage: errorLabels[state.errorCode ?? 'PRIMUS_ERROR'] ?? '证明失败，请重试。' };
  return { ...base, buttonLabel: labels[state.kind], statusLabel: state.message || '准备就绪', allowRetry: state.kind === 'idle' };
}

export function renderApp(root: HTMLElement, model: ViewModel): void {
  root.innerHTML = `<main class="card"><p class="eyebrow">CreditGate / Primus Demo</p><h1>信用证明演示</h1><p class="source">${model.sourceLabel}</p><p class="status">${model.statusLabel}</p>${model.resultLabel ? `<p class="result">${model.resultLabel}</p>` : ''}${model.metadata ? `<p class="metadata">${model.metadata}</p>` : ''}${model.errorMessage ? `<p class="error">${model.errorMessage}</p>` : ''}<button id="start" type="button">${model.buttonLabel}</button></main>`;
}
