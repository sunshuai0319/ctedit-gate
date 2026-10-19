import { PrimusZKTLS } from '@primuslabs/zktls-js-sdk';
import type { ServerConfig } from './contracts.js';

export interface ValidatedSignParams { templateId: string; recipient: string; serialized: string; }
export interface PrimusSigner { sign(signParams: string): Promise<string>; }
export class SignValidationError extends Error {
  constructor(public readonly code: 'INVALID_SIGN_PARAMS' | 'NONCE_EXPIRED', message: string) { super(`${code}: ${message}`); }
}
export function validateSignParams(signParams: string, config: ServerConfig): ValidatedSignParams {
  let parsed: unknown;
  try { parsed = JSON.parse(signParams); } catch { throw new SignValidationError('INVALID_SIGN_PARAMS', 'Malformed sign parameters'); }
  if (!parsed || typeof parsed !== 'object') throw new SignValidationError('INVALID_SIGN_PARAMS', 'Invalid sign parameters');
  const value = parsed as Record<string, unknown>;
  if (value.attTemplateID !== config.primusTemplateId || typeof value.userAddress !== 'string' || !value.userAddress.trim()) throw new SignValidationError('INVALID_SIGN_PARAMS', 'Fixed template and recipient are required');
  if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) throw new SignValidationError('INVALID_SIGN_PARAMS', 'Timestamp is required');
  if (Math.abs(Date.now() - value.timestamp) > 300_000) throw new SignValidationError('NONCE_EXPIRED', 'Sign request expired');
  if ('url' in value || 'sourceUrl' in value) throw new SignValidationError('INVALID_SIGN_PARAMS', 'Source URL is fixed by template');
  return { templateId: value.attTemplateID, recipient: value.userAddress, serialized: signParams };
}
export class PrimusSignerImpl implements PrimusSigner {
  private readonly client = new PrimusZKTLS(); private initialized?: Promise<string | boolean>;
  constructor(private readonly config: ServerConfig) {}
  async sign(signParams: string): Promise<string> {
    this.initialized ??= this.client.init(this.config.primusAppId, this.config.primusAppSecret);
    await this.initialized; return this.client.sign(signParams);
  }
}
