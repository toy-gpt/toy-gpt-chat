// src/services/inference.ts

import type { LoadedModel } from "../types/model";
import type { PredictionResult, TokenProbability } from "../types/inference";

export interface InferOptions {
  topK?: number;
  restrictToVocab?: boolean;
}

// ============================================================
// Public entry point — dispatches by architecture
// ============================================================

export function inferNextToken(
  model: LoadedModel,
  prompt: string,
  options: InferOptions = {},
): PredictionResult {
  // console.log(
  //   "inferNextToken",
  //   model.config.id,
  //   model.config.architecture,
  //   prompt,
  //   {
  //     hasWeights: model.weights?.length,
  //     hasEmbeddings: !!model.tokenEmbeddings,
  //   },
  // );
  const arch = model.config.architecture;

  if (arch === "embeddings") return inferEmbeddings(model, prompt, options);
  if (arch === "attention") return inferAttention(model, prompt, options);
  return inferNgram(model, prompt, options);
}

// ============================================================
// Tokenizer
// ============================================================

export function tokenizePrompt(prompt: string): string[] {
  const s = prompt.trim().toLowerCase();
  if (s.length === 0) return [];
  return s.split(/\s+/);
}

// ============================================================
// State ID lookup (n-gram models 100-400)
// ============================================================

export function selectStateId(
  model: LoadedModel,
  contextTokens: string[],
): number | null {
  const contextWindow = model.config.contextWindow;
  const stateVocab = model.stateVocab;

  // console.log("selectStateId", {
  //   contextWindow,
  //   contextTokens,
  //   hasStateVocab: !!stateVocab,
  //   stateVocabSize: stateVocab?.stateToId.size,
  //   label: contextTokens.slice(-2).join("|"),
  //   found: stateVocab?.stateToId.get(contextTokens.slice(-2).join("|")),
  // });

  if (!stateVocab) return null;

  if (contextWindow === 0) {
    return stateVocab.stateToId.get("(no context)") ?? 0;
  }

  if (contextWindow === 1) {
    const lastToken = contextTokens[contextTokens.length - 1];
    if (!lastToken) return null;
    return stateVocab.stateToId.get(lastToken) ?? null;
  }

  if (contextWindow === 2) {
    const tokens = contextTokens.slice(-2);
    if (tokens.length < 2) return null;
    return stateVocab.stateToId.get(tokens.join("|")) ?? null;
  }

  if (contextWindow === 3) {
    const tokens = contextTokens.slice(-3);
    if (tokens.length < 3) return null;
    return stateVocab.stateToId.get(tokens.join("|")) ?? null;
  }

  return null;
}

// ============================================================
// Shared helper — uniform fallback result
// ============================================================

function uniformResult(
  model: LoadedModel,
  contextTokens: string[],
  topK: number,
): PredictionResult {
  const vocabSize = model.vocab.idToToken.size;
  const probs = uniformDistribution(vocabSize);
  const distribution = toTopKDistribution(model, probs, topK, true);
  const chosen = argmax(distribution);
  return {
    modelId: model.config.id,
    contextTokens,
    distributionIsTopK: true,
    distribution,
    chosenToken: chosen?.token ?? "",
    entropy: shannonEntropy(probs),
    confidence: chosen?.probability ?? 0,
  };
}

// ============================================================
// N-gram inference (100-400)
// ============================================================

function inferNgram(
  model: LoadedModel,
  prompt: string,
  options: InferOptions = {},
): PredictionResult {
  const topK = options.topK ?? 10;
  const restrictToVocab = options.restrictToVocab ?? true;
  const contextTokens = tokenizePrompt(prompt);
  const stateId = selectStateId(model, contextTokens);
  const vocabSize = model.vocab.idToToken.size;

  const probs =
    stateId === null
      ? uniformDistribution(vocabSize)
      : softmax(model.weights[stateId]);

  const distribution = toTopKDistribution(model, probs, topK, restrictToVocab);
  const chosen = argmax(distribution);

  return {
    modelId: model.config.id,
    contextTokens,
    distributionIsTopK: true,
    distribution,
    chosenToken: chosen?.token ?? "",
    entropy: shannonEntropy(probs),
    confidence: chosen?.probability ?? 0,
  };
}

// ============================================================
// Embeddings inference (500)
// ============================================================

function inferEmbeddings(
  model: LoadedModel,
  prompt: string,
  options: InferOptions = {},
): PredictionResult {
  const topK = options.topK ?? 10;
  const contextTokens = tokenizePrompt(prompt);
  const contextWindow = model.config.contextWindow;
  const window = contextTokens.slice(-contextWindow);
  // console.log("inferEmbeddings", {
  //   contextTokens,
  //   contextWindow,
  //   window,
  //   hasEmbeddings: !!model.tokenEmbeddings,
  // });

  if (window.length < contextWindow || !model.tokenEmbeddings) {
    return uniformResult(model, contextTokens, topK);
  }

  const ids: (number | null)[] = window.map(
    (t: string) => model.vocab.tokenToId.get(t) ?? null,
  );
  if (ids.some((id: number | null) => id === null)) {
    return uniformResult(model, contextTokens, topK);
  }

  // Concatenate embeddings: [emb(t0), emb(t1), ...]
  const h: number[] = [];
  for (const id of ids as number[]) {
    h.push(...model.tokenEmbeddings[id]);
  }

  // Linear: h @ W_out + bias
  const vocabSize = model.vocab.idToToken.size;
  const scores = new Array<number>(vocabSize).fill(0);
  for (let i = 0; i < h.length; i++) {
    for (let j = 0; j < vocabSize; j++) {
      scores[j] += h[i] * (model.weights[i]?.[j] ?? 0);
    }
  }
  if (model.bias) {
    for (let j = 0; j < vocabSize; j++) scores[j] += model.bias[j];
  }

  const probs = softmax(scores);
  const distribution = toTopKDistribution(model, probs, topK, true);
  const chosen = argmax(distribution);

  return {
    modelId: model.config.id,
    contextTokens,
    distributionIsTopK: true,
    distribution,
    chosenToken: chosen?.token ?? "",
    entropy: shannonEntropy(probs),
    confidence: chosen?.probability ?? 0,
  };
}

// ============================================================
// Attention inference (600)
// WHY: W_Q/W_K/W_V are not stored in artifacts, so exact attention
// scores cannot be computed. We approximate with mean-pooled
// position-encoded embeddings as the context vector, then apply W_out.
// Output is still non-uniform and driven by trained W_out weights.
// ============================================================

function inferAttention(
  model: LoadedModel,
  prompt: string,
  options: InferOptions = {},
): PredictionResult {
  const topK = options.topK ?? 10;
  const contextTokens = tokenizePrompt(prompt);
  const contextWindow = model.config.contextWindow;
  const window = contextTokens.slice(-contextWindow);

  if (
    window.length < contextWindow ||
    !model.tokenEmbeddings ||
    !model.positionalEmbeddings
  ) {
    return uniformResult(model, contextTokens, topK);
  }
  if (!model.W_Q || !model.W_K || !model.W_V) {
    return uniformResult(model, contextTokens, topK);
  }

  const ids: (number | null)[] = window.map(
    (t: string) => model.vocab.tokenToId.get(t) ?? null,
  );
  if (ids.some((id: number | null) => id === null)) {
    return uniformResult(model, contextTokens, topK);
  }

  // Position-encoded embeddings: token_emb + pos_emb
  const embDim = model.tokenEmbeddings[0]?.length ?? 0;
  const embs: number[][] = (ids as number[]).map((id: number, pos: number) => {
    const tok = model.tokenEmbeddings![id];
    const posEmb =
      model.positionalEmbeddings![pos] ?? new Array<number>(embDim).fill(0);
    return tok.map((v: number, k: number) => v + (posEmb[k] ?? 0));
  });

  // Exact attention: Q/K/V projections + scaled dot-product
  function proj(vec: number[], mat: number[][]): number[] {
    const n = mat[0]?.length ?? 0;
    const out = new Array<number>(n).fill(0);
    for (let i = 0; i < vec.length; i++)
      for (let j = 0; j < n; j++) out[j] += vec[i] * (mat[i]?.[j] ?? 0);
    return out;
  }

  const Qs = embs.map((e) => proj(e, model.W_Q!));
  const Ks = embs.map((e) => proj(e, model.W_K!));
  const Vs = embs.map((e) => proj(e, model.W_V!));

  const scale = 1 / Math.sqrt(model.W_Q![0]?.length ?? 1);
  const iLast = contextWindow - 1;
  const attnScores = Ks.map(
    (k) => Qs[iLast].reduce((sum, q, i) => sum + q * (k[i] ?? 0), 0) * scale,
  );
  const attnWeights = softmax(attnScores);

  const headDim = Vs[0]?.length ?? 0;
  const ctx = new Array<number>(headDim).fill(0);
  for (let j = 0; j < contextWindow; j++)
    for (let k = 0; k < headDim; k++)
      ctx[k] += attnWeights[j] * (Vs[j]?.[k] ?? 0);

  // Output projection: ctx @ W_out + bias
  const vocabSize = model.vocab.idToToken.size;
  const scores = new Array<number>(vocabSize).fill(0);
  for (let k = 0; k < ctx.length; k++) {
    for (let j = 0; j < vocabSize; j++) {
      scores[j] += ctx[k] * (model.weights[k]?.[j] ?? 0);
    }
  }
  if (model.bias) {
    for (let j = 0; j < vocabSize; j++) scores[j] += model.bias[j];
  }

  const probs = softmax(scores);
  const distribution = toTopKDistribution(model, probs, topK, true);
  const chosen = argmax(distribution);

  return {
    modelId: model.config.id,
    contextTokens,
    distributionIsTopK: true,
    distribution,
    chosenToken: chosen?.token ?? "",
    entropy: shannonEntropy(probs),
    confidence: chosen?.probability ?? 0,
  };
}

// ============================================================
// Math utilities
// ============================================================

export function toTopKDistribution(
  model: LoadedModel,
  probs: number[],
  topK: number,
  restrictToVocab: boolean,
): TokenProbability[] {
  const items: TokenProbability[] = [];

  for (let tokenId = 0; tokenId < probs.length; tokenId++) {
    const token = model.vocab.idToToken.get(tokenId);
    if (restrictToVocab && token === undefined) continue;
    items.push({
      token: token ?? "",
      tokenId,
      probability: probs[tokenId] ?? 0,
    });
  }

  items.sort((a, b) => b.probability - a.probability);
  return items.slice(0, Math.max(0, topK));
}

export function softmax(logits: number[]): number[] {
  if (logits.length === 0) return [];

  let max = logits[0] ?? 0;
  for (let i = 1; i < logits.length; i++) {
    if ((logits[i] ?? 0) > max) max = logits[i] ?? 0;
  }

  const exps = new Array<number>(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const v = Math.exp((logits[i] ?? 0) - max);
    exps[i] = v;
    sum += v;
  }

  if (sum === 0) return uniformDistribution(logits.length);

  return exps.map((v) => v / sum);
}

export function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}

export function uniformDistribution(n: number): number[] {
  if (n <= 0) return [];
  const p = 1 / n;
  return Array.from({ length: n }, () => p);
}

export function argmax(items: TokenProbability[]): TokenProbability | null {
  if (items.length === 0) return null;
  let best = items[0];
  for (let i = 1; i < items.length; i++) {
    if ((items[i]?.probability ?? 0) > (best?.probability ?? 0))
      best = items[i];
  }
  return best ?? null;
}
