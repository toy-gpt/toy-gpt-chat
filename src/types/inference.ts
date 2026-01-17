// types/inference.ts

export interface TokenProbability {
  token: string;
  tokenId: number;
  probability: number;
}

export interface PredictionResult {
  modelId: string;
  contextTokens: string[];
  distributionIsTopK: boolean;
    /** Typically top-k entries, sorted by probability desc */
  distribution: TokenProbability[];
  chosenToken: string;
  entropy: number;
  confidence: number;
}
