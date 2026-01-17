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

  // outputTokens must all exist in token vocabulary
  const outputIds: number[] = outputTokens.map((tok) => {
    const id = vocab.tokenToId.get(tok);
    if (id === undefined) {
      throw new Error(`Weights CSV output token not in vocabulary: ${tok}`);
    }
    return id;
  });

  // Collect state labels from first column of each data row
  const stateLabels: string[] = [];
  for (const row of table.slice(1)) {
    const label = (row[0] ?? "").trim();
    if (label.length === 0) continue;
    stateLabels.push(label);
  }

  const stateVocab = buildStateVocab(stateLabels);

  const vocabSize = vocab.idToToken.size;
  const numStates = stateVocab.idToState.size;

  // Initialize [state][token] matrix
  const weights: number[][] = Array.from({ length: numStates }, () =>
    Array.from({ length: vocabSize }, () => 0),
  );

  for (const row of table.slice(1)) {
    const stateLabel = (row[0] ?? "").trim();
    if (stateLabel.length === 0) continue;

    const stateId = stateVocab.stateToId.get(stateLabel);
    if (stateId === undefined) continue;

    const values = row.slice(1);
    if (values.length !== outputIds.length) {
      throw new Error(
        `Weights row for '${stateLabel}' has ${values.length} values, expected ${outputIds.length}.`,
      );
    }

    for (let j = 0; j < values.length; j += 1) {
      const outId = outputIds[j];
      weights[stateId][outId] = toFloat(values[j]);
    }
  }

  return { weights, stateVocab };
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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok)
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
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
