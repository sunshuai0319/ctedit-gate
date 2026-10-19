import http from 'node:http';
import { buildScorePayload, renderScorePage } from './source.js';
import type { ServerConfig } from './contracts.js';
import { SignValidationError, type PrimusSigner, validateSignParams } from './signer.js';

function json(res: http.ServerResponse, status: number, value: unknown, origin: string): void { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('access-control-allow-origin', origin); res.end(JSON.stringify(value)); }
async function readBody(req: http.IncomingMessage): Promise<string> { let body = ''; for await (const chunk of req) body += chunk; return body; }
export function createServer(config: ServerConfig, signer: PrimusSigner): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    try {
      if (req.method === 'OPTIONS') { res.setHeader('access-control-allow-origin', config.allowedOrigin); res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS'); res.statusCode = 204; return res.end(); }
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok' }, config.allowedOrigin);
      if (req.method === 'GET' && url.pathname === '/score') { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(renderScorePage('/score')); return; }
      if (req.method === 'GET' && url.pathname === '/api/score') return json(res, 200, buildScorePayload(config.demoCreditScore, Date.now()), config.allowedOrigin);
      if (req.method === 'POST' && url.pathname === '/api/primus/sign') {
        const payload = JSON.parse(await readBody(req)) as { signParams?: unknown; nonce?: unknown };
        if (typeof payload.signParams !== 'string' || typeof payload.nonce !== 'string' || !payload.nonce) throw new SignValidationError('INVALID_SIGN_PARAMS', 'Sign parameters and nonce are required');
        const validated = validateSignParams(payload.signParams, config); const signResult = await signer.sign(validated.serialized);
        return json(res, 200, { signResult, requestId: payload.nonce }, config.allowedOrigin);
      }
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } }, config.allowedOrigin);
    } catch (error) {
      const code = error instanceof SignValidationError ? error.code : 'INVALID_REQUEST'; const message = error instanceof SignValidationError ? error.message : 'Request could not be processed';
      return json(res, 400, { error: { code, message } }, config.allowedOrigin);
    }
  });
}
if (process.env.NODE_ENV !== 'test' && process.argv[1]?.endsWith('/server.ts')) {
  try { process.loadEnvFile?.(); } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const { loadServerConfig } = await import('./config.js'); const { PrimusSignerImpl } = await import('./signer.js'); const config = loadServerConfig(process.env); createServer(config, new PrimusSignerImpl(config)).listen(config.port);
}
