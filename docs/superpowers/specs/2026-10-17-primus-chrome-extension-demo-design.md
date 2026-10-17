# Primus Chrome Extension zkTLS Demo Design

## Status

Approved direction in conversation; implementation has not started. The Developer Hub screenshots clarify that this demo uses a **For DApp** project and a template-driven browser SDK.

## Goal

Build the smallest end-to-end demo that proves whether Primus can generate and verify a zkTLS attestation in a PC Chrome environment. The demo uses a developer-controlled HTTPS JSON endpoint first, not Alipay or Sesame Credit, so failures can be attributed to integration, credentials, network reachability, or template configuration rather than an unavailable Alipay data source.

The demo must demonstrate a threshold decision such as `creditScore >= 650` without treating mock data as real Sesame Credit data.

## Non-goals

- Accessing or scraping an Alipay mobile-app session.
- Claiming that the demo proves Sesame Credit availability.
- Storing Alipay credentials or personal financial data.
- Deploying a blockchain contract, wallet flow, or on-chain verifier.
- Building an Alipay mini-program or mobile client in this iteration.

## Primus credentials and onboarding

1. Create a project in [Primus Developer Hub](https://dev.primuslabs.xyz/) using **For DApp**.
2. Obtain the paired `appId` and `appSecret` from that project.
3. Create or select a Data Verification Template for the controlled HTTPS webpage and record its template ID.
4. Keep `appSecret` in the server environment only. The browser/extension receives `appId` and an unsigned request; the server signs the request with `appSecret` and returns the signed payload.
5. If the Developer Hub account does not expose project credentials or template creation, the demo stops with an onboarding blocker; no Alipay credential or arbitrary replacement secret is accepted.

The current DApp integration uses `@primuslabs/zktls-js-sdk`: the browser needs the Primus extension, the request references a template ID, and production signing keeps `appSecret` on the server. The Backend project is a different flow for server-side proof generation and is not used in this Chrome-extension demo. The exact Developer Hub labels may change, but the credential contract remains `appId` plus `appSecret`.

## Choosing the project type

- **For DApp — choose this one.** The user operates Chrome, the Primus extension performs the browser-side flow, and the frontend requests a pre-defined template by ID. The Enterprise DApp SDK does not require a wallet or gas transaction to generate an attestation.
- **For Backend — not this iteration.** The server performs the proof flow without the browser extension and must hold/configure the credentials needed to access the target data source. It is appropriate for an automated service or agent, not for testing a user-operated Chrome flow.

## What to enter as Data source URL

The template wizard's first field should be a **public HTTPS webpage URL that contains or loads the data to be verified**, not a Primus URL, Developer Hub URL, `localhost`, or `file://` URL. For the controlled demo, deploy a small page such as:

```text
https://creditgate-demo.example.com/score
```

That page should visibly render synthetic data and issue a deterministic request such as:

```text
GET https://creditgate-demo.example.com/api/score
```

The wizard flow is then:

1. Enter and open the webpage URL.
2. In **Select request**, choose the page's JSON `fetch`/XHR request (`/api/score`).
3. In **Select data**, select the response field `data.creditScore` (or its JSONPath equivalent).
4. Save the template and use its template ID in the DApp.

For the first real proof, the host must be reachable over public HTTPS by Primus; do not rely on a URL that only exists on the local machine. A temporary HTTPS tunnel can be used for development, but a stable deployed endpoint is preferred.

## Recommended architecture

```text
Chrome test page
    │ templateId + appId + recipient
    ▼
Local Node server ── appSecret ── Primus signing/attestation service
    │ signed request
    ▼
Primus DApp SDK + Primus Chrome extension
    │ zkTLS protocol
    ▼
Primus Attestor network ── HTTPS ── controlled JSON source
    │ signed Attestation
    ▼
Browser + local/server verifyAttestation()
    │
    └── business rule: creditScore >= 650
```

The browser page is responsible for user interaction and result display. The extension is responsible for the browser-side Primus runtime and proof flow. The local server owns `appSecret`, request signing, and the controlled test endpoint. No blockchain transaction is required for the MVP's result verification.

## Components

### Chrome demo page

- Vite + TypeScript.
- Shows configuration state, extension detection, start button, progress, attestation metadata, verification result, threshold result, and explicit source label (`CONTROLLED_TEST_SOURCE`).
- Never embeds `appSecret` or logs it.

### Browser DApp and Primus extension

- Vite + TypeScript page uses `@primuslabs/zktls-js-sdk`.
- Initializes the SDK with `appId`; production signing is delegated to the local server.
- Calls `generateRequestParams(templateId, recipient)` and then starts attestation through the installed Primus Chrome extension.
- We do not build or bundle a replacement Primus extension in this iteration.

### Local server

- Node.js HTTP server with a signing route.
- Reads `PRIMUS_APP_ID` and `PRIMUS_APP_SECRET` from environment variables.
- Signs only structured request parameters generated by the client; it does not accept an arbitrary URL from the browser.
- Exposes a deterministic controlled JSON endpoint with a configurable score for pass/fail testing.
- Validates request origin and applies a short-lived request nonce to prevent accidental replay in the demo.

### Verification adapter

- Verifies the returned Attestation with the Primus SDK locally or through a server verification endpoint.
- Checks source URL/template identity, proof timestamp freshness, response field extraction, and `creditScore >= 650`.
- Reports separate states for `attestation invalid`, `source/template mismatch`, `stale proof`, `threshold failed`, and `mock/test source`.

## Data flow

1. User opens the Chrome demo page and confirms the Primus extension is installed.
2. Page builds a request from the fixed template ID and a recipient identifier.
3. Page sends the serialized unsigned request to the local server.
4. Server signs it with `appSecret` and returns the signed request.
5. DApp SDK starts the Primus attestation flow through the installed Primus extension, using proxy TLS by default.
6. Primus Attestor verifies the target HTTPS exchange and returns a signed Attestation.
7. Extension/page verifies the Attestation and extracts `creditScore`.
8. Demo evaluates `creditScore >= 650` and displays the complete audit metadata without exposing unrelated response data.

## Error handling

- Missing Primus extension: show installation/setup guidance and do not call the server.
- Missing credentials: fail at startup with a configuration error, never silently switch to mock proof.
- Signing failure: show server error category; do not expose `appSecret` or raw server environment.
- Template/source mismatch or unreachable source: show the exact configured source and a retry action.
- Invalid signature or stale Attestation: reject the result even if the extracted score is above the threshold.
- Controlled source mode: mark all successful results as test data; no UI may call it “芝麻分” or “真实信用”。

## Security constraints

- `appSecret` exists only in server environment variables and server memory.
- No secret is committed, bundled into extension assets, or returned in API responses.
- The server signs a fixed allowlisted request shape; the client cannot turn the signer into an arbitrary proxy.
- Test fixtures use synthetic values and contain no user identity or Alipay account information.
- Logs redact request headers, cookies, tokens, and proof payload fields not needed for debugging.

## Acceptance criteria

- A configured **For DApp** Developer Hub project and template can produce a real Primus Attestation against the controlled HTTPS source.
- The browser can locally verify a valid Attestation and reject a tampered payload.
- A score of `720` passes and a score of `600` fails the threshold rule.
- The browser bundle and browser network responses contain no `appSecret`.
- The UI distinguishes a real Primus Attestation from any local/mock fallback.
- A documented failure state exists for missing Developer Hub access, missing template, unreachable source, extension absence, signing failure, and invalid proof.
- No wallet, gas, chain RPC, Alipay login, or Sesame Credit API is required for the MVP.

## Risks and follow-up

- Primus package names, extension install flow, and Developer Hub UI may change; implementation must pin the package version and link the exact setup steps used.
- A successful controlled-source proof does not establish that Sesame Credit is accessible. The next experiment requires a browser-reachable, authorized Alipay endpoint and a Primus template that can legally and technically access it.
- If the real Alipay flow exists only inside the mobile app or uses app-bound/device-bound authorization, this architecture cannot reuse that session; a separate feasibility investigation is required.
