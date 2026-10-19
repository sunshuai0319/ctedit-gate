import './styles.css';
import { loadWebConfig } from './config';
import { createPrimusClient } from './primus-client';
import { verifyAndEvaluate, type AttestationLike } from './verification';
import { renderApp, toViewModel, type DemoState } from './view-model';

const root = document.querySelector<HTMLElement>('#app');
let state: DemoState = { kind: 'idle', message: '准备开始' };
let config: ReturnType<typeof loadWebConfig>;
let client: ReturnType<typeof createPrimusClient>;
try { config = loadWebConfig(); client = createPrimusClient(config); } catch { state = { kind: 'failed', message: '', errorCode: 'CREDENTIAL_ERROR' }; }
function render(): void {
  if (!root) return;
  renderApp(root, toViewModel(state));
  const button = root.querySelector<HTMLButtonElement>('#start');
  if (!button || !client || state.kind === 'signing' || state.kind === 'awaiting_extension' || state.kind === 'verifying') return;
  button.addEventListener('click', async () => {
    state = { kind: 'signing', message: '正在请求签名' }; render();
    try {
      state = { kind: 'awaiting_extension', message: '请在 Primus 扩展中完成操作' }; render();
      const proof = await client.attest(config.recipient);
      state = { kind: 'verifying', message: '正在校验证明' }; render();
      const result = verifyAndEvaluate({ ...proof.attestation, templateId: config.primusTemplateId, verified: proof.verified } as AttestationLike, Date.now(), { threshold: 650, source: 'CONTROLLED_TEST_SOURCE', maxAgeSeconds: 300 });
      state = { kind: 'success', message: '', result };
    } catch (error) { state = { kind: 'failed', message: '', errorCode: error instanceof Error ? error.message : 'PRIMUS_ERROR' }; }
    render();
  });
}
render();
