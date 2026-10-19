import { afterEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { ServerConfig } from '../src/contracts.js';
import { createServer } from '../src/server.js';

const config: ServerConfig = {
  primusAppId: 'app-id', primusAppSecret: 'secret-value', primusTemplateId: 'template-id',
  demoCreditScore: 720, port: 0, allowedOrigin: 'http://localhost:5173', publicSourceUrl: 'https://demo.example/score',
};
const servers: http.Server[] = [];
afterEach(() => servers.splice(0).forEach((server) => server.close()));

function request(server: http.Server, path: string, options: { method?: string; body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server is not listening');
  return new Promise((resolve, reject) => {
    const req = http.request({ port: address.port, path, method: options.method ?? 'GET', headers: options.body ? { 'content-type': 'application/json' } : undefined }, (res) => {
      let body = ''; res.setEncoding('utf8'); res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', reject); if (options.body) req.write(options.body); req.end();
  });
}

describe('HTTP server', () => {
  it('serves health, HTML, JSON, and restricted CORS', async () => {
    const server = createServer(config, { sign: async () => 'signed' });
    servers.push(server); await new Promise<void>((resolve) => server.listen(0, resolve));
    const health = await request(server, '/health');
    expect(health.status).toBe(200); expect(health.body).not.toContain('secret-value');
    expect((await request(server, '/score')).headers['content-type']).toMatch(/text\/html/);
    expect((await request(server, '/api/score')).headers['content-type']).toMatch(/application\/json/);
    const sign = await request(server, '/api/primus/sign', { method: 'POST', body: JSON.stringify({ signParams: '{}', nonce: 'x' }) });
    expect(sign.status).toBe(400);
    expect(sign.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it.each([720, 600])('serves the configured controlled score %s through the HTTP chain', async (score) => {
    const server = createServer({ ...config, demoCreditScore: score }, { sign: async () => 'signed' });
    servers.push(server); await new Promise<void>((resolve) => server.listen(0, resolve));
    const html = await request(server, '/score');
    const payload = await request(server, '/api/score');
    expect(html.body).toContain('/api/score');
    expect(JSON.parse(payload.body).data.creditScore).toBe(score);
  });
});
