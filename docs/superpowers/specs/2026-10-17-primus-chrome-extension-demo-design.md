# Primus Chrome 扩展 zkTLS Demo 设计

## 状态

方向已在对话中确认；实现尚未开始。Developer Hub 的截图说明：本 demo 使用 **For DApp** 类型项目，以及模板驱动的浏览器 SDK。

## 目标

构建一个最小端到端 demo，用于验证 Primus 能否在 PC Chrome 环境下生成并校验 zkTLS 证明。demo 首先使用开发者自有的 HTTPS JSON 接口，而不是支付宝或芝麻信用，这样一旦失败，可以归因到集成、凭据、网络可达性或模板配置，而不是支付宝数据源不可用。

demo 必须演示一个阈值判定，例如 `creditScore >= 650`，且不得把 mock 数据当作真实芝麻信用数据。

## 非目标

- 不访问、不抓取支付宝 App 内的会话。
- 不宣称本 demo 证明了芝麻信用的可用性。
- 不存储支付宝凭据或个人金融数据。
- 不部署区块链合约、钱包流程或链上验证器。
- 本轮不构建支付宝小程序或移动端客户端。

## Primus 凭据与接入准备

1. 在 [Primus Developer Hub](https://dev.primuslabs.xyz/) 使用 **For DApp** 创建一个项目。
2. 从该项目获取配对的 `appId` 与 `appSecret`。
3. 为受控 HTTPS 网页创建或选择一个 Data Verification Template，并记录其 template ID。
4. `appSecret` 只保存在服务端环境中。浏览器/扩展只拿到 `appId` 和未签名的请求；由服务端用 `appSecret` 签名后返回签名结果。
5. 如果 Developer Hub 账号无法获取项目凭据或创建模板，则 demo 在接入准备阶段即终止并阻塞；不接受使用支付宝凭据或随意替换的密钥。

当前 DApp 集成使用 `@primuslabs/zktls-js-sdk`：浏览器需要安装 Primus 扩展，请求引用 template ID，生产环境签名时 `appSecret` 保留在服务端。Backend 类型项目是服务端生成证明的另一套流程，本 Chrome 扩展 demo 不使用它。Developer Hub 上的具体文案可能变化，但凭据契约始终是 `appId` 加 `appSecret`。

## 项目类型选择

- **For DApp —— 选这个。** 用户操作 Chrome，Primus 扩展执行浏览器侧流程，前端按 ID 请求预定义模板。企业版 DApp SDK 生成证明无需钱包或 gas 交易。
- **For Backend —— 本轮不用。** 服务端在无浏览器扩展的情况下执行证明流程，且必须持有/配置访问目标数据源所需的凭据。它适用于自动化服务或 agent，不适合验证用户操作的 Chrome 流程。

## Data source URL 该填什么

模板向导的第一个字段应填写**包含或加载了待验证数据的公开 HTTPS 网页 URL**，而不是 Primus 的 URL、Developer Hub 的 URL、`localhost` 或 `file://` URL。对本受控 demo，部署一个类似这样的简单页面：

```text
https://creditgate-demo.example.com/score
```

该页面应可见地渲染合成数据，并发出一个确定性的请求，例如：

```text
GET https://creditgate-demo.example.com/api/score
```

向导流程如下：

1. 输入并打开该网页 URL。
2. 在 **Select request** 中选择该页面的 JSON `fetch`/XHR 请求（`/api/score`）。
3. 在 **Select data** 中选择响应字段 `data.creditScore`（或等价的 JSONPath）。
4. 保存模板，并在 DApp 中使用其 template ID。

第一次真实证明时，主机必须能被 Primus 通过公网 HTTPS 访问；不要依赖只在本地机器上存在的 URL。开发阶段可以用临时 HTTPS 隧道，但优先使用稳定部署的端点。

## 推荐架构

```text
Chrome 测试页
    │ templateId + appId + recipient
    ▼
本地 Node 服务 ── appSecret ── Primus 签名/证明服务
    │ signed request
    ▼
Primus DApp SDK + Primus Chrome 扩展
    │ zkTLS 协议
    ▼
Primus Attestor 网络 ── HTTPS ── 受控 JSON 数据源
    │ signed Attestation
    ▼
浏览器 + 本地/服务端 verifyAttestation()
    │
    └── 业务规则：creditScore >= 650
```

浏览器页面负责用户交互与结果展示。扩展负责浏览器侧的 Primus 运行时与证明流程。本地服务持有 `appSecret`、负责请求签名以及受控测试端点。MVP 的结果校验不需要任何区块链交易。

## 组件

### Chrome demo 页面

- Vite + TypeScript。
- 展示配置状态、扩展检测结果、启动按钮、进度、证明元数据、校验结果、阈值判定结果，以及明确的来源标签（`CONTROLLED_TEST_SOURCE`）。
- 绝不内嵌 `appSecret`，也不打印它。

### 浏览器 DApp 与 Primus 扩展

- Vite + TypeScript 页面，使用 `@primuslabs/zktls-js-sdk`。
- 用 `appId` 初始化 SDK；生产签名委托给本地服务。
- 调用 `generateRequestParams(templateId, recipient)`，随后通过已安装的 Primus Chrome 扩展启动证明。
- 本轮不自行构建或打包替代的 Primus 扩展。

### 本地服务

- Node.js HTTP 服务，包含一个签名路由。
- 从环境变量读取 `PRIMUS_APP_ID` 和 `PRIMUS_APP_SECRET`。
- 只对客户端生成的结构化请求参数签名；不接受浏览器传来的任意 URL。
- 暴露一个确定性的受控 JSON 端点，分数可配置，用于通过/不通过测试。
- 校验请求来源，并使用短时效的请求 nonce，防止 demo 中意外重放。

### 校验适配层

- 在本地或通过服务端校验端点，用 Primus SDK 校验返回的 Attestation。
- 检查来源 URL/模板身份、证明时间戳新鲜度、响应字段提取结果，以及 `creditScore >= 650`。
- 对 `attestation invalid`（证明无效）、`source/template mismatch`（来源/模板不匹配）、`stale proof`（证明过期）、`threshold failed`（未达阈值）、`mock/test source`（模拟/测试来源）分别报告状态。

## 数据流

1. 用户打开 Chrome demo 页面，确认已安装 Primus 扩展。
2. 页面基于固定的 template ID 和 recipient 标识构建请求。
3. 页面把序列化后的未签名请求发送给本地服务。
4. 服务端用 `appSecret` 签名并返回签名后的请求。
5. DApp SDK 通过已安装的 Primus 扩展启动证明流程，默认使用代理 TLS。
6. Primus Attestor 校验目标 HTTPS 交互，返回已签名的 Attestation。
7. 扩展/页面校验 Attestation，并提取 `creditScore`。
8. demo 判定 `creditScore >= 650`，并展示完整审计元数据，不暴露无关的响应数据。

## 错误处理

- 缺少 Primus 扩展：给出安装/配置指引，不调用服务端。
- 缺少凭据：启动即失败并报配置错误，绝不静默切换到 mock 证明。
- 签名失败：展示服务端错误类别；不暴露 `appSecret` 或服务端原始环境。
- 模板/来源不匹配或来源不可达：展示实际配置的来源，并提供重试操作。
- 签名无效或 Attestation 过期：即使提取到的分数高于阈值，也拒绝该结果。
- 受控来源模式：所有成功结果都标记为测试数据；任何 UI 都不得称其为“芝麻分”或“真实信用”。

## 安全约束

- `appSecret` 只存在于服务端环境变量与服务端内存中。
- 任何密钥都不得提交进仓库、打包进扩展资源，或在 API 响应中返回。
- 服务端只对固定白名单形态的请求签名；客户端无法把签名器变成任意代理。
- 测试夹具使用合成数值，不包含任何用户身份或支付宝账号信息。
- 日志脱敏处理请求头、cookie、token，以及调试不需要的证明载荷字段。

## 验收标准

- 配置好的 **For DApp** Developer Hub 项目与模板，能够针对受控 HTTPS 来源生成真实的 Primus Attestation。
- 浏览器能本地校验有效 Attestation，并拒绝被篡改的载荷。
- 分数 `720` 通过、分数 `600` 不通过阈值规则。
- 浏览器产物与浏览器网络响应中都不含 `appSecret`。
- UI 能区分真实 Primus Attestation 与任何本地/mock 兜底。
- 针对 Developer Hub 无权限、缺少模板、来源不可达、扩展缺失、签名失败、证明无效，均有文档化的失败状态。
- MVP 不需要钱包、gas、链上 RPC、支付宝登录或芝麻信用 API。

## 风险与后续

- Primus 的包名、扩展安装流程与 Developer Hub UI 都可能变化；实现时必须锁定包版本，并链接到实际使用的具体配置步骤。
- 受控来源证明成功，并不能说明芝麻信用可访问。下一步实验需要一个浏览器可达、已获授权的支付宝端点，以及一个能合法且技术上访问它的 Primus 模板。
- 如果真实的支付宝流程只存在于移动 App 内，或使用绑定 App/设备的授权方式，本架构无法复用该会话；需要单独做可行性调研。
