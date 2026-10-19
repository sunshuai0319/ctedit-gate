/// <reference types="vite/client" />

export interface WebConfig {
  primusAppId: string;
  primusTemplateId: string;
  recipient: string;
  signingUrl: string;
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing required browser configuration: ${name}`);
  return value.trim();
}

export function loadWebConfig(env: Record<string, string | undefined> = import.meta.env): WebConfig {
  return {
    primusAppId: required('VITE_PRIMUS_APP_ID', env.VITE_PRIMUS_APP_ID),
    primusTemplateId: required('VITE_PRIMUS_TEMPLATE_ID', env.VITE_PRIMUS_TEMPLATE_ID),
    recipient: required('VITE_RECIPIENT', env.VITE_RECIPIENT),
    signingUrl: required('VITE_SIGNING_URL', env.VITE_SIGNING_URL),
  };
}
