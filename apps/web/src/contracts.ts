export interface ParsedCreditData {
  creditScore: number;
  source: 'CONTROLLED_TEST_SOURCE';
  issuedAt?: number;
}

export interface ThresholdResult {
  passed: boolean;
  score: number;
  threshold: number;
  status: 'threshold passed' | 'threshold failed';
}
