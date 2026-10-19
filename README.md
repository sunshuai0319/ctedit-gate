# CreditGate Primus Chrome Extension Demo

这是一个用于验证 Primus zkTLS 浏览器流程的最小 DApp。页面展示的是 `CONTROLLED_TEST_SOURCE` 合成数据，不是芝麻分，也不代表支付宝官方数据。

## 本地启动

```bash
cp .env.example .env
npm install
npm run dev:server
npm run dev:web
```

服务端默认监听 `8787`，Vite 默认监听 `5173`。开发阶段可使用 `cloudflared tunnel --url http://localhost:8787` 或其他 HTTPS 隧道，把公网地址写入 `PUBLIC_SOURCE_URL`；Primus 模板要求公网 HTTPS 页面。

## Primus Developer Hub

1. 创建项目时选择 **For DApp**，不要选择 For Backend。
2. 创建模板时把 Data source URL 填为公网 HTTPS 的 `/score` 页面，例如 `https://demo.example/score`。
3. 在 Select request 选择页面发出的 `GET /api/score`。
4. 在 Select data 选择 `data.creditScore`，确认来源字段为 `data.source`。
5. 将模板 ID 写入 `.env` 的 `PRIMUS_TEMPLATE_ID` 和前端的 `VITE_PRIMUS_TEMPLATE_ID`。

`PRIMUS_APP_SECRET` 只能放服务端环境变量。浏览器只接收 `appId`、template ID、recipient 和签名服务 URL。

## 验证与构建

```bash
npm test
npm run typecheck
npm run build
```

## 故障排查

- `EXTENSION_MISSING`：安装并启用 Primus Chrome Extension，并使用 Chrome 打开页面。
- `INVALID_SIGN_PARAMS`：检查 template ID、recipient 和模板选择是否一致。
- `NONCE_EXPIRED`：重新点击证明，服务端只接受 5 分钟内的请求。
- `ATTESTATION_FAILED`：检查公网 URL、页面是否保持打开，以及模板是否选择 `/api/score` 和 `data.creditScore`。
- 本地服务正常但真实证明失败：先确认 HTTPS 隧道可从外网访问，再确认 Developer Hub 项目状态和模板 ID。
