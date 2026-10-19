# Primus Chrome Extension Demo Runbook

## 固定配置

| 项目 | 值 |
| --- | --- |
| Project type | Developer Hub 选择 `For DApp` |
| SDK | `@primuslabs/zktls-js-sdk@0.3.15` |
| Template ID | 使用本地环境变量 `PRIMUS_TEMPLATE_ID` / `VITE_PRIMUS_TEMPLATE_ID` |
| App ID | 使用 `PRIMUS_APP_ID` / `VITE_PRIMUS_APP_ID` |
| App secret | 仅服务端 `PRIMUS_APP_SECRET`，不得提交 |
| Data source URL | 公网 HTTPS 的 `/score` 页面 |
| Request | `GET /api/score` |
| Data field | `data.creditScore` |
| Source field | `data.source = CONTROLLED_TEST_SOURCE` |

## 本地链路

```bash
npm test
npm run typecheck
npm run build
```

启动服务后确认：`GET /score` 返回页面，页面只请求相对路径 `/api/score`；`GET /api/score` 返回 `{ data: { creditScore, source, issuedAt } }`。

## 公网模板配置

1. 使用 HTTPS 部署或隧道暴露服务端。
2. 在 Developer Hub 选 **For DApp** 创建项目和模板。
3. Data source URL 填公网 `https://<host>/score`，全流程保持该页面打开。
4. Select request 选择 `GET /api/score`，Select data 选择 `data.creditScore`。
5. 保存 template ID，只写入本地 `.env`；不要把 app secret 放入前端或仓库。

## Chrome Smoke Test

1. 安装并启用 Primus Chrome Extension，使用 Chrome 打开 Vite 页面。
2. `DEMO_CREDIT_SCORE=720` 启动服务，点击开始证明；预期 Attestation 签名校验成功、阈值 `650` 通过。
3. 改为 `DEMO_CREDIT_SCORE=600` 并重启服务，重新打开 `/score` 后证明；预期签名校验成功但阈值失败。
4. 让 `/api/score` 返回被篡改的数据，预期来源或签名校验拒绝；不要在界面展示完整 attestation、Cookie 或 token。

## 证据记录

真实 smoke 需要有效的 Primus Developer Hub 项目、template ID、浏览器扩展和公网 HTTPS。没有这些凭据时，只能报告本地测试通过，不能宣称已生成真实 Primus 证明。
