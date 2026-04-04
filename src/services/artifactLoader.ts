// src/services/artifactLoader.ts

import type {
  ArtifactDefaults,
  LayoutPoint,
  LoadedModel,
  ModelConfig,
  ModelMeta,
  StateVocab,
  Vocabulary,
} from "../types/model";
import { toRawGitHubUrl } from "./githubRaw";

type TokenRow = {
  token: string;
  tokenId: number;
  freq?: number;
};

const fetchCache = new Map<string, string>();

function parseCsv(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => line.split(",").map((c) => c.trim()));
}

function toInt(s: string): number {
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n)) throw new Error(`Expected int, got: ${s}`);
  return n;
}

function toFloat(s: string): number {
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) throw new Error(`Expected float, got: ${s}`);
  return n;
}

function buildStateVocab(stateLabels: string[]): StateVocab {
  const stateToId = new Map<string, number>();
  const idToState = new Map<number, string>();

  for (let i = 0; i < stateLabels.length; i += 1) {
    const label = stateLabels[i];
    if (!stateToId.has(label)) {
      const id = stateToId.size;
      stateToId.set(label, id);
      idToState.set(id, label);
    }
  }

  return { stateToId, idToState };
}

function buildVocabulary(rows: TokenRow[]): Vocabulary {
  const tokenToId = new Map<string, number>();
  const idToToken = new Map<number, string>();
  const tokenFreq = new Map<string, number>();

  for (const r of rows) {
    tokenToId.set(r.token, r.tokenId);
    idToToken.set(r.tokenId, r.token);
    tokenFreq.set(r.token, r.freq ?? 0);
  }

  return { tokenToId, idToToken, tokenFreq };
}

function parseLayoutCsv(text: string): Map<string, LayoutPoint> {
  const table = parseCsv(text);
  if (table.length < 2) return new Map();

  const header = table[0].map((h) => h.toLowerCase());
  const rowIdx = header.indexOf("row");
  const labelIdx = header.indexOf("label");
  const xIdx = header.indexOf("x");
  const yIdx = header.indexOf("y");

  if (rowIdx < 0 || labelIdx < 0 || xIdx < 0 || yIdx < 0) {
    throw new Error(
      `Layout CSV must have header: row,label,x,y (got: ${table[0].join(",")})`,
    );
  }

  const out = new Map<string, LayoutPoint>();

  for (const r of table.slice(1)) {
    const label = r[labelIdx] ?? "";
    if (label.length === 0) continue;

    void toInt(r[rowIdx] ?? "0");

    const x = toFloat(r[xIdx] ?? "0");
    const y = toFloat(r[yIdx] ?? "0");

    out.set(label, { label, x, y });
  }

  return out;
}

// ============================================================
// N-gram weight table parser (100-400)
// ============================================================

function parseWeightsCsv(
  text: string,
  vocab: Vocabulary,
): { weights: number[][]; stateVocab: StateVocab } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { weights: [], stateVocab: buildStateVocab([]) };
  }

  const header = table[0].map((h) => h.trim());
  const firstCol = (header[0] ?? "").toLowerCase();

  if (firstCol !== "input_token") {
    throw new Error(
      `Weights CSV first column must be 'input_token' (got: ${header[0] ?? ""})`,
    );
  }

  const outputTokens = header.slice(1);
  if (outputTokens.length === 0) {
    throw new Error(
      "Weights CSV must include output token columns after input_token.",
    );
  }

  const outputIds: number[] = outputTokens.map((tok) => {
    const id = vocab.tokenToId.get(tok);
    if (id === undefined) {
      throw new Error(`Weights CSV output token not in vocabulary: ${tok}`);
    }
    return id;
  });

  const stateLabels: string[] = [];
  for (const row of table.slice(1)) {
    const label = (row[0] ?? "").trim();
    if (label.length === 0) continue;
    stateLabels.push(label);
  }

  const stateVocab = buildStateVocab(stateLabels);
  const vocabSize = vocab.idToToken.size;
  const numStates = stateVocab.idToState.size;

  const weights: number[][] = Array.from({ length: numStates }, () =>
    Array.from({ length: vocabSize }, () => 0),
  );

  for (const row of table.slice(1)) {
    const stateLabel = (row[0] ?? "").trim();
    if (stateLabel.length === 0) continue;

    const stateId = stateVocab.stateToId.get(stateLabel);
    if (stateId === undefined) continue;

    const values = row.slice(1);
    for (let j = 0; j < values.length; j += 1) {
      const outId = outputIds[j];
      weights[stateId][outId] = toFloat(values[j] ?? "0");
    }
  }

  return { weights, stateVocab };
}

// ============================================================
// W_out parser (500 embeddings, 600 attention)
// Rows are labeled input_dim_N or head_dim_N — not context labels.
// Returns a plain number[][] of shape (numRows x vocabSize).
// ============================================================

function parseWOutCsv(text: string, vocab: Vocabulary): number[][] {
  const table = parseCsv(text);
  if (table.length < 2) return [];

  const header = table[0].map((h) => h.trim());
  const outputTokens = header.slice(1);

  const outputIds: number[] = outputTokens.map((tok) => {
    const id = vocab.tokenToId.get(tok);
    if (id === undefined) {
      throw new Error(`W_out CSV output token not in vocabulary: ${tok}`);
    }
    return id;
  });

  const vocabSize = vocab.idToToken.size;
  const weights: number[][] = [];

  for (const row of table.slice(1)) {
    const values = row.slice(1);
    const wRow = new Array<number>(vocabSize).fill(0);
    for (let j = 0; j < values.length; j++) {
      wRow[outputIds[j]] = toFloat(values[j] ?? "0");
    }
    weights.push(wRow);
  }

  return weights;
}

// ============================================================
// Token embeddings parser (500+)
// Header: token_id, token, dim_0, dim_1, ...
// Returns number[][] of shape (vocabSize x embeddingDim).
// ============================================================

function parseTokenEmbeddingsCsv(text: string): number[][] {
  const table = parseCsv(text);
  if (table.length < 2) return [];

  const header = table[0].map((h) => h.toLowerCase().trim());
  const dimCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.startsWith("dim_"))
    .map(({ i }) => i);

  if (dimCols.length === 0) {
    throw new Error("Token embeddings CSV has no dim_ columns.");
  }

  const embeddings: number[][] = [];
  for (const row of table.slice(1)) {
    embeddings.push(dimCols.map((i) => toFloat(row[i] ?? "0")));
  }

  return embeddings;
}

// ============================================================
// Positional embeddings parser (600 attention)
// Header: position, dim_0, dim_1, ...
// Returns number[][] of shape (contextSize x embeddingDim).
// ============================================================

function parsePositionalEmbeddingsCsv(text: string): number[][] {
  const table = parseCsv(text);
  if (table.length < 2) return [];

  const header = table[0].map((h) => h.toLowerCase().trim());
  const dimCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.startsWith("dim_"))
    .map(({ i }) => i);

  if (dimCols.length === 0) {
    throw new Error("Positional embeddings CSV has no dim_ columns.");
  }

  const embeddings: number[][] = [];
  for (const row of table.slice(1)) {
    embeddings.push(dimCols.map((i) => toFloat(row[i] ?? "0")));
  }

  return embeddings;
}

function parseProjectionCsv(text: string): number[][] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0].map((h) => h.toLowerCase().trim());
  const dimCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.startsWith("dim_"))
    .map(({ i }) => i);
  if (dimCols.length === 0) return [];
  return table
    .slice(1)
    .map((row) => dimCols.map((i) => toFloat(row[i] ?? "0")));
}

function parseVocabularyCsv(text: string): TokenRow[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];

  const header = table[0].map((h) => h.toLowerCase());
  const idIdx = header.indexOf("token_id");
  const tokenIdx = header.indexOf("token");
  const freqIdx = header.indexOf("frequency");

  if (idIdx < 0 || tokenIdx < 0 || freqIdx < 0) {
    throw new Error(
      `Vocabulary CSV must have header: token_id,token,frequency (got: ${table[0].join(",")})`,
    );
  }

  const out: TokenRow[] = [];
  for (const row of table.slice(1)) {
    out.push({
      tokenId: toInt(row[idIdx]),
      token: row[tokenIdx],
      freq: toInt(row[freqIdx]),
    });
  }

  return out;
}

async function fetchText(url: string): Promise<string> {
  if (fetchCache.has(url)) return fetchCache.get(url)!;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
  const text = await res.text();
  fetchCache.set(url, text);
  return text;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

function folderOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

function joinFolder(folder: string, filename: string): string {
  if (!folder) return filename;
  return `${folder}/${filename}`;
}

function resolveMetaPath(defaults: ArtifactDefaults): string {
  return defaults.metaPath;
}

function resolveVocabPath(defaults: ArtifactDefaults, meta: ModelMeta): string {
  const folder = folderOf(defaults.vocabPath);
  return joinFolder(folder, meta.artifacts["01_vocabulary.csv"]);
}

function resolveWeightsPath(
  defaults: ArtifactDefaults,
  meta: ModelMeta,
): string {
  const folder = folderOf(defaults.weightsPath);
  return joinFolder(folder, meta.artifacts["02_model_weights.csv"]);
}

function resolveLayoutPath(
  config: ModelConfig,
  defaults: ArtifactDefaults,
  meta: ModelMeta,
): string | null {
  const override = config.artifacts?.layoutPath;
  if (override && override.trim().length > 0) return override;

  const dflt = defaults.layoutPath;
  if (!dflt || dflt.trim().length === 0) return null;

  const folder = folderOf(dflt);
  return joinFolder(folder, meta.artifacts["03_token_embeddings.csv"]);
}

// ============================================================
// Main loader — dispatches by architecture
// ============================================================

export async function loadModelFromArtifacts(
  config: ModelConfig,
  defaults: ArtifactDefaults,
): Promise<LoadedModel> {
  const metaUrl = toRawGitHubUrl(
    config.repo,
    config.branch,
    resolveMetaPath(defaults),
  );
  const meta = await fetchJson<ModelMeta>(metaUrl);

  const vocabPath = resolveVocabPath(defaults, meta);
  const vocabUrl = toRawGitHubUrl(config.repo, config.branch, vocabPath);
  const vocabCsv = await fetchText(vocabUrl);
  const vocabRows = parseVocabularyCsv(vocabCsv);
  const vocab = buildVocabulary(vocabRows);

  const weightsPath = resolveWeightsPath(defaults, meta);
  const weightsUrl = toRawGitHubUrl(config.repo, config.branch, weightsPath);
  const weightsCsv = await fetchText(weightsUrl);

  const arch = config.architecture;

  // ============================================================
  // Embeddings model (500)
  // ============================================================
  if (arch === "embeddings") {
    const weights = parseWOutCsv(weightsCsv, vocab);

    // Load token embeddings (03_token_embeddings.csv)
    const tokenEmbPath =
      config.artifacts?.tokenEmbeddingsPath ??
      "artifacts/03_token_embeddings.csv";
    const tokenEmbUrl = toRawGitHubUrl(
      config.repo,
      config.branch,
      tokenEmbPath,
    );
    const tokenEmbCsv = await fetchText(tokenEmbUrl);
    const tokenEmbeddings = parseTokenEmbeddingsCsv(tokenEmbCsv);

    return {
      config,
      meta,
      vocab,
      weights,
      tokenEmbeddings,
    };
  }

  // ============================================================
  // Attention model (600)
  // ============================================================
  if (arch === "attention") {
  const weights = parseWOutCsv(weightsCsv, vocab);

  const tokenEmbPath =
    config.artifacts?.tokenEmbeddingsPath ??
    "artifacts/03_token_embeddings.csv";
  const posEmbPath =
    config.artifacts?.positionalEmbeddingsPath ??
    "artifacts/04_positional_embeddings.csv";

  const [tokenEmbCsv, posEmbCsv, wqCsv, wkCsv, wvCsv] = await Promise.all([
    fetchText(toRawGitHubUrl(config.repo, config.branch, tokenEmbPath)),
    fetchText(toRawGitHubUrl(config.repo, config.branch, posEmbPath)),
    fetchText(toRawGitHubUrl(config.repo, config.branch, "artifacts/05_W_Q.csv")),
    fetchText(toRawGitHubUrl(config.repo, config.branch, "artifacts/06_W_K.csv")),
    fetchText(toRawGitHubUrl(config.repo, config.branch, "artifacts/07_W_V.csv")),
  ]);

  return {
    config,
    meta,
    vocab,
    weights,
    tokenEmbeddings: parseTokenEmbeddingsCsv(tokenEmbCsv),
    positionalEmbeddings: parsePositionalEmbeddingsCsv(posEmbCsv),
    W_Q: parseProjectionCsv(wqCsv),
    W_K: parseProjectionCsv(wkCsv),
    W_V: parseProjectionCsv(wvCsv),
  };
}

  // ============================================================
  // N-gram models (100-400) — existing path unchanged
  // ============================================================
  const parsed = parseWeightsCsv(weightsCsv, vocab);
  const weights = parsed.weights;
  const stateVocab = parsed.stateVocab;

  const layoutPath = resolveLayoutPath(config, defaults, meta);
  let stateLayout: Map<string, LayoutPoint> | undefined;

  if (layoutPath) {
    const layoutUrl = toRawGitHubUrl(config.repo, config.branch, layoutPath);
    const layoutCsv = await fetchText(layoutUrl);
    stateLayout = parseLayoutCsv(layoutCsv);
  }

  return {
    config,
    meta,
    vocab,
    weights,
    stateLayout,
    stateVocab,
  };
}
