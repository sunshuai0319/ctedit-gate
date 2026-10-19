import type { ServerConfig } from './contracts.js';

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function integer(env: NodeJS.ProcessEnv, name: string, fallback?: number): number {
  const raw = env[name] ?? (fallback === undefined ? undefined : String(fallback));
  if (raw === undefined || !/^\d+$/.test(raw)) {
    throw new Error(`Invalid integer configuration: ${name}`);
  }
  return Number(raw);
}

export function loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
  return {
    primusAppId: required(env, 'PRIMUS_APP_ID'),
    primusAppSecret: required(env, 'PRIMUS_APP_SECRET'),
    primusTemplateId: required(env, 'PRIMUS_TEMPLATE_ID'),
    demoCreditScore: integer(env, 'DEMO_CREDIT_SCORE', 720),
    port: integer(env, 'PORT', 8787),
    allowedOrigin: required(env, 'ALLOWED_ORIGIN'),
    publicSourceUrl: required(env, 'PUBLIC_SOURCE_URL'),
  };
}
