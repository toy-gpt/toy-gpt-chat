// src/types/model.ts

export interface ArtifactDefaults {
  metaPath: string;    // e.g., "artifacts/00_meta.json"
  vocabPath: string;   // e.g., "artifacts/01_vocabulary.csv"
  weightsPath: string; // e.g., "artifacts/02_model_weights.csv"
  layoutPath?: string; // optional default, e.g., "artifacts/03_token_embeddings.csv"
}

export interface CorpusConfig {
  id: string;
  name: string;
  description: string;
  file: string; // e.g., "000_cat_dog.txt"
}

export interface CorpusMeta {
  description: string;
  filename: string;
  num_chars: number;
  num_lines: number;
  /** Stored path inside the training repo; may be Windows-style */
  path: string;
  sha256: string;
}

export interface TrainingMeta {
  epoch_definition: string;
  epochs: number;
  learning_rate: number;
}

/**
 * Mirrors artifacts/00_meta.json "artifacts" section.
 * These are filenames (not full paths).
 */
export interface ModelArtifactIndex {
  "00_meta.json": string;
  "01_vocabulary.csv": string;
  "02_model_weights.csv": string;
  "03_token_embeddings.csv": string;
}

export interface ModelMeta {
  artifacts: ModelArtifactIndex;
  concepts: Record<string, string>;
  corpus: CorpusMeta;
  model_kind: string;
  notes: string[];
  repo_name: string;
  training: TrainingMeta;
  vocab_size: number;
}

export interface ModelConfig {
  id: string;
  corpus: string;
  architecture: string;
  contextWindow: number;
  repo: string;
  branch: string;

  /**
   * Optional per-model artifact overrides.
   * WHY: Use this if a model repo stores embeddings in a different location,
   * or if embeddings do not exist for that model.
   */
  artifacts?: {
    layoutPath?: string; // e.g., "artifacts/03_token_embeddings.csv"
  };
}

export interface ModelsRegistry {
  artifactDefaults?: ArtifactDefaults;
  corpora: CorpusConfig[];
  models: ModelConfig[];
  prompts: Record<string, string[]>;
}

export interface StateVocab {
  stateToId: Map<string, number>;
  idToState: Map<number, string>;
}

export interface Vocabulary {
  tokenToId: Map<string, number>;
  idToToken: Map<number, string>;
  tokenFreq: Map<string, number>;
}

export interface LayoutPoint {
  label: string;
  x: number;
  y: number;
}

export interface LoadedModel {
  config: ModelConfig;
  meta: ModelMeta;
  vocab: Vocabulary;
  weights: number[][];
  stateLayout?: Map<string, LayoutPoint>;
  stateVocab?: StateVocab;
}
