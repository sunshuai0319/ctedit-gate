import { PrimusZKTLS } from '@primuslabs/zktls-js-sdk';
import type { WebConfig } from './config';

export interface Attestation { recipient: string; data: string; timestamp: number; [key: string]: unknown; }

export interface AttestationResult { attestation: Attestation; verified: boolean; }
export interface PrimusClient { createRequest(recipient: string): string; attest(recipient: string): Promise<AttestationResult>; }

class BrowserPrimusClient implements PrimusClient {
  private readonly sdk = new PrimusZKTLS();
  private initialized?: Promise<string | boolean>;
  constructor(private readonly config: WebConfig) {}
  private init(): Promise<string | boolean> { return this.initialized ??= this.sdk.init(this.config.primusAppId); }
  createRequest(recipient: string): string {
    return this.sdk.generateRequestParams(this.config.primusTemplateId, recipient).toJsonString();
  }
  async attest(recipient: string): Promise<AttestationResult> {
    try {
      await this.init();
      const signParams = this.createRequest(recipient);
      const response = await fetch(this.config.signingUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signParams, nonce: crypto.randomUUID() }) });
      if (!response.ok) throw new Error('signing service rejected request');
      const payload = await response.json() as { signResult?: string };
      if (!payload.signResult) throw new Error('missing sign result');
      const attestation = await this.sdk.startAttestation(payload.signResult);
      const verified = this.sdk.verifyAttestation(attestation);
      return { attestation, verified };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/install|extension/i.test(message)) throw new Error('EXTENSION_MISSING');
      if (/attestation/i.test(message)) throw new Error('ATTESTATION_FAILED');
      throw new Error('PRIMUS_ERROR');
    }
  }
}

export function createPrimusClient(config: WebConfig): PrimusClient { return new BrowserPrimusClient(config); }
