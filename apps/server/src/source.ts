import type { ScorePayload } from './contracts.js';

export function renderScorePage(sourcePath: string): string {
  const safePath = sourcePath.startsWith('/') ? sourcePath : `/${sourcePath}`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>CreditGate 测试数据</title></head>
<body><main><h1>CreditGate 合成测试数据</h1><p>来源：CONTROLLED_TEST_SOURCE</p><p>页面路径：${safePath}</p><output id="score">加载中</output></main>
<script>fetch('/api/score').then(response => response.json()).then(payload => { document.querySelector('#score').textContent = String(payload.data.creditScore); });</script>
</body></html>`;
}

export function buildScorePayload(score: number, issuedAt: number): ScorePayload {
  return { data: { creditScore: score, source: 'CONTROLLED_TEST_SOURCE', issuedAt } };
}
