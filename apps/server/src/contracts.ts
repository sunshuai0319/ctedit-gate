export interface ServerConfig {
  primusAppId: string;
  primusAppSecret: string;
  primusTemplateId: string;
  demoCreditScore: number;
  port: number;
  allowedOrigin: string;
  publicSourceUrl: string;
}

export interface ScorePayload {
  data: {
    creditScore: number;
    source: 'CONTROLLED_TEST_SOURCE';
    issuedAt: number;
  };
}
