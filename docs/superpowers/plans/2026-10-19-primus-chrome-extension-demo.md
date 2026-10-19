# Primus Chrome 扩展 zkTLS Demo 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 PC Chrome + Primus Extension 的最小端到端 Demo，针对开发者自有 HTTPS 数据源生成并校验 Primus Attestation，并验证 `creditScore >= 650` 的隐私数据判定流程。

**Architecture:** 使用 Primus Enterprise DApp SDK `@primuslabs/zktls-js-sdk`。Vite 前端通过 `templateId` 创建请求，Node 服务端使用仅服务端持有的 `appSecret` 签名，Primus Chrome Extension 执行浏览器侧证明；Node 服务同时提供可公网访问的受控网页与 JSON 数据源。MVP 只做本地/服务端 `verifyAttestation()`，不接钱包、Gas 或链上合约。

**Tech Stack:** Node.js 18+、npm workspaces、TypeScript、Vite、Node `http`、Vitest、`@primuslabs/zktls-js-sdk`、Primus Chrome Extension。

**Spec:** `docs/superpowers/specs/2026-10-17-primus-chrome-extension-demo-design.md`

## Global Constraints

- 使用 Primus Developer Hub 的 **For DApp** 项目，不使用 For Backend 项目。
- 使用 `@primuslabs/zktls-js-sdk` 与 Primus Chrome Extension；不自行构建替代扩展。
- `appSecret` 只存在于服务端环境变量与服务端内存中，不进入前端 bundle、扩展资源、日志或 API 响应。
- Data source URL 必须是公开 HTTPS 网页；模板从网页发出的 `/api/score` JSON 请求中选择 `data.creditScore`。
- 受控数据只使用合成值，并始终标记 `CONTROLLED_TEST_SOURCE`；UI 不得称其为芝麻分或真实信用。
- 通过条件固定为 `creditScore >= 650`；`720` 应通过，`600` 应失败。
- MVP 不需要钱包、Gas、链上 RPC、支付宝登录或芝麻信用 API。
- 客户端不能把签名服务变成任意 URL 代理；服务端只签名固定允许的 template/request 结构。

## Review Focus

- **缺少/泄露 `appSecret`：** 服务端配置缺失时应明确失败，前端构建产物和网络响应不得包含 secret；测试归 Task 1、Task 3。
- **任意请求签名：** 篡改 `templateId`、URL 或请求结构必须被拒绝；测试归 Task 3。
- **证明数据异常：** 无效签名、JSON 解析失败、来源/模板不匹配、过期时间戳都不能进入业务判定；测试归 Task 4。
- **阈值边界：** `650` 应通过，`649` 应失败，`720`/`600` 固定验收；测试归 Task 2、Task 4。
- **Primus 扩展/公网数据源不可用：** UI 必须显示可行动的错误状态，不静默切换 mock；测试归 Task 5，公网真实证明归 Task 6 手工验收。

---

## 文件结构与职责

实现前固定以下边界：

```text
package.json                         # npm workspace、统一脚本
package-lock.json                    # 锁定依赖版本
tsconfig.base.json                   # 共享 TypeScript 严格配置
.gitignore                           # .env、构建产物、node_modules
README.md                            # 启动、凭据、模板和真实证明步骤
.env.example                         # 仅占位配置，不含秘密

apps/server/
  package.json                       # Node 服务脚本与依赖
  tsconfig.json                      # 服务端 TypeScript 项目配置
  src/config.ts                      # 环境变量解析与校验
  src/contracts.ts                   # HTTP/签名/来源数据类型
  src/source.ts                      # /score 网页与 /api/score 数据源
  src/signer.ts                      # Primus appSecret 签名边界
  src/server.ts                      # HTTP 路由与错误映射
  test/config.test.ts
  test/source.test.ts
  test/signer.test.ts
  test/server.test.ts

apps/web/
  package.json                       # Vite 前端脚本与 SDK 依赖
  tsconfig.json                      # 前端 TypeScript 项目配置
  index.html
  vite.config.ts                     # SDK 构建兼容配置
  src/config.ts                      # 仅读取 VITE_* 非敏感配置
  src/contracts.ts                   # 前端状态与响应类型
  src/primus-client.ts               # DApp SDK 初始化、请求、签名、证明
  src/verification.ts                # Attestation 校验与阈值策略
  src/view-model.ts                  # 状态到 UI 文案/标签的纯函数
  src/main.ts                        # DOM 事件、渲染和重试
  src/styles.css
  test/verification.test.ts
  test/view-model.test.ts
  test/no-secret.test.ts
```

服务端、前端和共享测试优先使用纯函数与显式接口；真实 Primus SDK 调用只在 `primus-client.ts` 与 `signer.ts` 两个边界内发生，单元测试不依赖扩展、钱包或公网。

## Task 1: 初始化 Workspace 与安全配置

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.ts`（最小可构建入口，Task 5 完善）
- Create: `apps/web/src/styles.css`（最小可构建样式，Task 5 完善）
- Test: `apps/web/test/no-secret.test.ts`

**Interfaces:**
- Produces npm scripts: `dev`, `dev:server`, `dev:web`, `test`, `typecheck`, `build`。
- Produces browser build define: `global: 'globalThis'`，并静态打包 `@primuslabs/zktls-js-sdk`。
- Produces environment contract: server reads `PRIMUS_APP_ID`, `PRIMUS_APP_SECRET`, `PRIMUS_TEMPLATE_ID`, `DEMO_CREDIT_SCORE`, `PORT`, `ALLOWED_ORIGIN`, `PUBLIC_SOURCE_URL`; web reads only `VITE_PRIMUS_APP_ID`, `VITE_PRIMUS_TEMPLATE_ID`, `VITE_RECIPIENT`, `VITE_SIGNING_URL`。

- [ ] **Step 1: 创建 workspace 清单与最小目录。**

  在根 `package.json` 配置 `apps/server`、`apps/web` workspaces；锁定 `@primuslabs/zktls-js-sdk` 的实际可用版本并提交 lockfile。使用 Node 18+，TypeScript 开启 `strict`。

- [ ] **Step 2: 写安全配置和前端 secret 扫描测试。**

  `apps/web/test/no-secret.test.ts` 构造唯一哨兵字符串 `TEST_APP_SECRET_SENTINEL`，构建前端后断言 `apps/web/dist` 不包含该字符串；同时断言 `.env.example` 不包含 `PRIMUS_APP_SECRET` 的真实值；`.gitignore` 排除 `.env`、`node_modules` 和 `dist`。

- [ ] **Step 3: 运行初始化验证。**

  Run: `npm install && npm run typecheck`

  Expected: PASS；此时允许没有业务源文件，但 workspace、TypeScript 和 Vite 配置可加载。

- [ ] **Step 4: Commit。**

  ```bash
  git add package.json package-lock.json tsconfig.base.json .gitignore .env.example apps/server/package.json apps/server/tsconfig.json apps/web/package.json apps/web/tsconfig.json apps/web/index.html apps/web/vite.config.ts apps/web/src/main.ts apps/web/src/styles.css apps/web/test/no-secret.test.ts
  git commit -m "chore: scaffold Primus demo workspace"
  ```

## Task 2: 实现配置、受控数据源与阈值领域逻辑

**Files:**
- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/contracts.ts`
- Create: `apps/server/src/source.ts`
- Create: `apps/web/src/config.ts`
- Create: `apps/web/src/contracts.ts`
- Create: `apps/web/src/verification.ts`
- Test: `apps/server/test/config.test.ts`
- Test: `apps/server/test/source.test.ts`
- Test: `apps/web/test/verification.test.ts`

**Interfaces:**
- `loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig`：缺少必填配置或分数非整数时抛出带字段名的配置错误。
- `renderScorePage(sourcePath: string): string`：返回说明为合成测试数据的 HTML，并只请求相对路径 `/api/score`。
- `buildScorePayload(score: number, issuedAt: number): ScorePayload`：返回 `{ data: { creditScore, source: 'CONTROLLED_TEST_SOURCE', issuedAt } }`。
- `evaluateCreditScore(score: number, threshold = 650): ThresholdResult`：返回 `{ passed, score, threshold, status }`，状态只能是 `threshold passed` 或 `threshold failed`。
- `parseAttestationData(data: string): ParsedCreditData`：只接受包含数值 `creditScore` 与固定来源标识的数据。

- [ ] **Step 1: 写配置失败测试。**

  在 `config.test.ts` 覆盖缺少 `PRIMUS_APP_SECRET`、缺少 `PRIMUS_TEMPLATE_ID`、`DEMO_CREDIT_SCORE=abc` 三种情况，断言错误包含对应变量名且不回显 secret 值。

- [ ] **Step 2: 实现 `loadServerConfig`。**

  在 `apps/server/src/config.ts` 解析并校验环境变量；`DEMO_CREDIT_SCORE` 默认 `720` 但必须能通过环境改为 `600`；`ALLOWED_ORIGIN` 与 `PUBLIC_SOURCE_URL` 不能为空。

- [ ] **Step 3: 写受控页面和 JSON 数据源测试。**

  断言 `renderScorePage('/score')` 包含 `CONTROLLED_TEST_SOURCE`、`/api/score` 和“测试数据”文案；断言 `buildScorePayload(720, 1700000000000)` 的 JSON 结构精确包含 `data.creditScore=720`，且不包含身份、Cookie 或支付宝字段。

- [ ] **Step 4: 实现 `source.ts`。**

  只生成固定 HTML 和 JSON payload；页面不接受客户端传入分数，分数来自 `ServerConfig.demoCreditScore`，避免测试源变成任意伪造接口。

- [ ] **Step 5: 写并实现阈值/Attestation 数据解析测试。**

  在 `verification.test.ts` 断言 `720`、`650` 通过，`649`、`600` 失败；断言 malformed JSON、缺失 `creditScore`、来源不是 `CONTROLLED_TEST_SOURCE` 时抛出分类错误。

- [ ] **Step 6: 运行领域测试。**

  Run: `npm test -- apps/server/test/config.test.ts apps/server/test/source.test.ts apps/web/test/verification.test.ts`

  Expected: PASS。

- [ ] **Step 7: Commit。**

  ```bash
  git add apps/server/src apps/server/test apps/web/src/config.ts apps/web/src/contracts.ts apps/web/src/verification.ts apps/web/test/verification.test.ts
  git commit -m "feat: add controlled source and credit policy"
  ```

## Task 3: 实现服务端 Primus 签名边界与 HTTP 路由

**Files:**
- Create: `apps/server/src/signer.ts`
- Create: `apps/server/src/server.ts`
- Test: `apps/server/test/signer.test.ts`
- Test: `apps/server/test/server.test.ts`

**Interfaces:**
- `PrimusSigner.sign(signParams: string): Promise<string>`：调用 `@primuslabs/zktls-js-sdk` 的服务端签名能力，永不返回 `appSecret`。
- `validateSignParams(signParams: string, config: ServerConfig): ValidatedSignParams`：解析 SDK 序列化请求，固定检查 `templateId === config.primusTemplateId`、recipient 非空、请求结构完整。
- `createServer(config: ServerConfig, signer: PrimusSigner): http.Server`：提供 `GET /health`、`GET /score`、`GET /api/score`、`POST /api/primus/sign`。
- `POST /api/primus/sign` 请求体：`{ signParams: string, nonce: string }`；成功响应：`{ signResult: string, requestId: string }`；失败响应：`{ error: { code: string, message: string } }`。

- [ ] **Step 1: 写签名输入拒绝测试。**

  使用 fake signer 断言 malformed JSON、错误 `templateId`、缺失 recipient、超过 nonce 时效的请求返回 400/401，并且 fake signer 未被调用；断言任意 URL 字段不允许改变固定模板来源。

- [ ] **Step 2: 实现 `validateSignParams`。**

  将 Primus SDK 的序列化字符串作为不可信输入解析；只允许配置中的 template ID 和固定请求字段，使用短时 nonce（默认 5 分钟），错误分类为 `INVALID_SIGN_PARAMS` 或 `NONCE_EXPIRED`。

- [ ] **Step 3: 实现 `PrimusSigner`。**

  在服务端初始化 `PrimusZKTLS` 时传入 `PRIMUS_APP_ID` 与 `PRIMUS_APP_SECRET`；只暴露 `sign()`，不把配置对象、SDK 实例或异常中的 secret 写入日志/响应。

- [ ] **Step 4: 写 HTTP 路由测试。**

  使用 Node `http` 客户端请求服务器，断言 `/score` 返回 HTML、`/api/score` 返回 `application/json`、`/health` 返回配置状态但不返回秘密；断言 `/api/primus/sign` 的 CORS 只允许 `ALLOWED_ORIGIN`。

- [ ] **Step 5: 实现 `createServer` 与错误映射。**

  使用 Node `http` 和 `URL` 路由，不引入 Express；统一映射配置、校验、Primus SDK 错误为稳定错误码，响应中不返回原始异常和签名输入。

- [ ] **Step 6: 运行服务端测试。**

  Run: `npm test -- apps/server/test/signer.test.ts apps/server/test/server.test.ts`

  Expected: PASS。

- [ ] **Step 7: Commit。**

  ```bash
  git add apps/server/src/signer.ts apps/server/src/server.ts apps/server/test/signer.test.ts apps/server/test/server.test.ts
  git commit -m "feat: add Primus signing service"
  ```

## Task 4: 实现浏览器 DApp 客户端和证明校验适配层

**Files:**
- Create: `apps/web/src/primus-client.ts`
- Modify: `apps/web/src/verification.ts`
- Test: `apps/web/test/verification.test.ts`

**Interfaces:**
- `createPrimusClient(config: WebConfig): PrimusClient`：初始化 `PrimusZKTLS`，只使用 `appId`，不接受前端 `appSecret`。
- `PrimusClient.createRequest(recipient: string): string`：调用 `generateRequestParams(templateId, recipient)` 并返回 `toJsonString()`。
- `PrimusClient.attest(recipient: string): Promise<AttestationResult>`：向 `VITE_SIGNING_URL` 请求签名，调用 `startAttestation(signedRequestStr)`，随后必须调用 `verifyAttestation()`。
- `verifyAndEvaluate(attestation: AttestationLike, nowMs: number, policy: CreditPolicy): VerificationResult`：按顺序校验签名结果、时间戳、来源、JSON 数据和阈值。

- [ ] **Step 1: 补充 Attestation 失败测试。**

  在 `verification.test.ts` 使用 fake Attestation 覆盖：`verifyAttestation=false`、`data` 非 JSON、来源错误、时间戳超过 `PROOF_MAX_AGE_SECONDS`、`creditScore=649`；每种情况断言对应状态，且 `passed=false`。

- [ ] **Step 2: 实现 `verifyAndEvaluate`。**

  先调用注入的签名验证结果，再解析 `attestation.data`；只有签名、时间戳、来源和字段解析全部通过，才调用 `evaluateCreditScore`。成功结果保留最小审计元数据：`timestamp`、`recipient`、`templateId`、`source`、`threshold`。

- [ ] **Step 3: 实现 `primus-client.ts`。**

  静态导入 `@primuslabs/zktls-js-sdk`；页面初始化时调用 `init(appId)`；签名请求使用 `POST` JSON，不把 secret 放入 query string；`startAttestation()` 失败时转换为 `EXTENSION_MISSING`、`ATTESTATION_FAILED` 或 `PRIMUS_ERROR`。

- [ ] **Step 4: 运行浏览器领域测试和类型检查。**

  Run: `npm test -- apps/web/test/verification.test.ts && npm run typecheck`

  Expected: PASS；测试不依赖安装扩展或钱包。

- [ ] **Step 5: Commit。**

  ```bash
  git add apps/web/src/primus-client.ts apps/web/src/verification.ts apps/web/test/verification.test.ts
  git commit -m "feat: integrate browser Primus attestation flow"
  ```

## Task 5: 实现 UI、状态机和可行动错误提示

**Files:**
- Create: `apps/web/src/view-model.ts`
- Modify: `apps/web/src/main.ts`
- Modify: `apps/web/src/styles.css`
- Create: `apps/web/test/view-model.test.ts`

**Interfaces:**
- `DemoState`：`idle | signing | awaiting_extension | verifying | success | failed`，并携带 `message`、`result`、`errorCode`。
- `toViewModel(state: DemoState): ViewModel`：输出按钮文案、状态文案、来源标签、是否显示重试、是否允许再次证明。
- `renderApp(root: HTMLElement, model: ViewModel): void`：只负责渲染，不执行网络请求或 SDK 调用。

- [ ] **Step 1: 写状态映射测试。**

  在 `view-model.test.ts` 断言缺少扩展显示安装指引、不调用服务端；签名失败显示重试；证明无效显示拒绝原因；成功结果同时显示 `CONTROLLED_TEST_SOURCE` 与阈值结果；任何状态都不显示 secret 或原始服务端异常。

- [ ] **Step 2: 实现 `view-model.ts`。**

  将内部错误码映射为中文用户文案：扩展缺失、凭据配置错误、签名失败、来源不可达、证明无效、证明过期、未达阈值；固定显示“测试数据，不是芝麻分”。

- [ ] **Step 3: 实现 `main.ts` 事件流。**

  页面加载时检测配置与 Primus 扩展；点击开始后按 `createRequest → sign → startAttestation → verifyAndEvaluate` 更新状态；防止重复点击；失败后只允许重试，不切换到 mock 证明。

- [ ] **Step 4: 实现最小 UI 与样式。**

  页面必须有配置状态、扩展状态、开始按钮、进度、结果摘要、证明元数据、来源标签和错误区域；不展示完整响应、Cookie、token 或签名 payload。

- [ ] **Step 5: 运行 UI 单元测试和构建。**

  Run: `npm test -- apps/web/test/view-model.test.ts && npm run build`

  Expected: PASS；构建产物不包含 `TEST_APP_SECRET_SENTINEL` 或任何 `VITE_PRIMUS_APP_SECRET` 字样。

- [ ] **Step 6: Commit。**

  ```bash
  git add apps/web/src/main.ts apps/web/src/view-model.ts apps/web/src/styles.css apps/web/test/view-model.test.ts
  git commit -m "feat: add demo UI and failure states"
  ```

## Task 6: 文档、公网模板配置与真实 Primus Smoke Test

**Files:**
- Create: `README.md`
- Modify: `.env.example`
- Create: `docs/superpowers/plans/2026-10-19-primus-chrome-extension-demo-runbook.md`
- Test: `apps/server/test/server.test.ts`（补充完整 HTTP smoke）

**Interfaces:**
- Runbook 必须记录真实 Developer Hub 项目类型、template ID（以环境变量占位表示，不提交真实 secret）、Data source URL、请求路径、字段路径和 SDK 版本。
- README 必须提供本地启动、HTTPS 隧道、模板创建、扩展安装、生产签名和故障排查命令。

- [ ] **Step 1: 写本地 HTTP smoke 测试。**

  启动 `createServer`，用 HTTP 客户端验证 `/score → /api/score` 链路；分别注入 `DEMO_CREDIT_SCORE=720` 与 `600`，断言 payload 和策略结果符合验收标准。

- [ ] **Step 2: 编写 README 与 runbook。**

  明确先在 Developer Hub 选 **For DApp**、创建模板时输入公网 HTTPS 网页、在 Select request 选择 `/api/score`、在 Select data 选择 `data.creditScore`；记录 `appSecret` 只能放服务端，真实 `appId/templateId` 通过本地 `.env` 提供。

- [ ] **Step 3: 运行本地完整验证。**

  Run: `npm test && npm run typecheck && npm run build`

  Expected: 全部 PASS，且 `git status --short` 不显示 `.env`、`dist` 或 `node_modules`。

- [ ] **Step 4: 执行公网模板配置。**

  将 Node 服务以 HTTPS 暴露（临时隧道或稳定部署），在 Developer Hub 模板向导输入 `/score` 页面，选择 `/api/score` 请求和 `data.creditScore` 字段，保存并把 template ID 写入本地环境文件。

- [ ] **Step 5: 执行真实 Extension Smoke Test。**

  Chrome 安装 Primus Extension，启动 web/server；使用 `720` 运行一次，记录 Attestation 校验成功与阈值通过；改为 `600` 重启数据源后再次运行，记录 Attestation 校验成功但阈值失败；篡改返回载荷后确认校验拒绝。

- [ ] **Step 6: 记录证据并 Commit。**

  Run: `git diff --check && git status --short`

  Expected: 只有代码、测试、README 和 runbook 变更；不包含凭据、Cookie、完整 Attestation secret 字段或用户数据。

  ```bash
  git add README.md .env.example docs/superpowers/plans/2026-10-19-primus-chrome-extension-demo-runbook.md apps/server/test/server.test.ts
  git commit -m "docs: add Primus demo runbook and smoke checks"
  ```

## Self-Review Checklist

- [x] 设计中的 For DApp/Backend 选择有明确实现任务。
- [x] 模板 URL、请求选择、字段选择和公网 HTTPS 前置条件有 Task 2、Task 6 覆盖。
- [x] `appSecret` 仅服务端保存，并有配置、签名、构建产物和 HTTP 响应测试。
- [x] Attestation 签名、来源、时间戳、字段解析和阈值判定均有独立测试。
- [x] 缺扩展、签名失败、来源不可达、模板不匹配和证明无效都有 UI 状态。
- [x] 本地 mock/受控数据与真实 Primus Attestation 明确区分，没有把本地数据冒充芝麻分。
- [x] 真实公网证明保留为最后的手工 Smoke Test，不在单元测试中依赖网络、钱包或支付宝。
