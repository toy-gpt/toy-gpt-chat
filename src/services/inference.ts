// src/services/inference.ts

import type { LoadedModel } from "../types/model";
import type { PredictionResult, TokenProbability } from "../types/inference";

/**
 * Inference for the inspectable n-gram style models (levels 100-400).
 *
 * Given a LoadedModel and a prompt, this computes:
 * - a next-token probability distribution (top-k)
 * - the chosen token (argmax)
 * - entropy of the distribution
 * - confidence (probability of the chosen token)
 *
 * IMPORTANT:
 * - This does not train or update weights.
 * - It only uses already-published artifacts (vocabulary + weights).
 *
 * ASSUMPTIONS (for this phase):
 * - weights is a 2D table: weights[inputTokenId][outputTokenId]
 * - input for unigram/bigram in these levels is represented by the *last token* of the context
 *   (i.e., a single input token selects one weight row).
 * - If the prompt has no known tokens, fall back to a uniform distribution.
 *
 * If you later introduce true multi-token context rows (e.g., bigram as token-pair states),
 * we will adjust `selectInputTokenId` to map context -> state id.
 */

export interface InferOptions {
  /**
   * How many highest-probability tokens to return in `distribution`.
   * The full distribution exists conceptually, but returning top-k keeps UI responsive.
   */
  topK?: number;

  /**
   * If true, restrict output tokens to those present in the vocabulary (always true here).
   * Kept as an explicit option to make the intent inspectable.
   */
  restrictToVocab?: boolean;
}

/**
 * Run inference for a prompt string.
 *
 * This uses a simple whitespace tokenizer (split on one or more spaces).
 * That matches your corpus style (word tokens).
 *
 * If you later have a tokenizer artifact, swap `tokenizePrompt`.
 */
export function inferNextToken(
  model: LoadedModel,
  prompt: string,
  options: InferOptions = {}
): PredictionResult {
  const topK = options.topK ?? 10;
  const restrictToVocab = options.restrictToVocab ?? true;

  const contextTokens = tokenizePrompt(prompt);

  const inputTokenId = selectInputTokenId(model, contextTokens);
  const vocabSize = model.vocab.idToToken.size;

  const probs =
    inputTokenId === null
      ? uniformDistribution(vocabSize)
      : softmax(model.weights[inputTokenId]);

  const distribution = toTopKDistribution(model, probs, topK, restrictToVocab);
  const chosen = argmax(distribution);

  const entropy = shannonEntropy(probs);
  const confidence = chosen ? chosen.probability : 0;

  return {
    modelId: model.config.id,
    contextTokens,
    distributionIsTopK: true,
    distribution,
    chosenToken: chosen ? chosen.token : "",
    entropy,
    confidence
  };
}

/**
 * Tokenize a prompt into tokens compatible with your published vocabulary.
 *
 * Current behavior:
 * - trim
 * - split by whitespace
 *
 * WHY:
 * - Inspectable
 * - Deterministic
 * - Matches your simple word-level corpora
 */
export function tokenizePrompt(prompt: string): string[] {
  const s = prompt.trim();
  if (s.length === 0) return [];
  return s.split(/\s+/);
}

/**
 * Select the input token id used to pick the row of the weights matrix.
 *
 * For the early models, this is "last token in context that exists in vocab".
 *
 * If the prompt has no known tokens, returns null.
 */
export function selectInputTokenId(
  model: LoadedModel,
  contextTokens: string[]
): number | null {
  for (let i = contextTokens.length - 1; i >= 0; i -= 1) {
    const tok = contextTokens[i];
    const id = model.vocab.tokenToId.get(tok);
    if (id !== undefined) return id;
  }
  return null;
}

/**
 * Convert a full probability vector into a top-k token distribution for UI.
 *
 * The output is sorted descending by probability.
 */
export function toTopKDistribution(
  model: LoadedModel,
  probs: number[],
  topK: number,
  restrictToVocab: boolean
): TokenProbability[] {
  const items: TokenProbability[] = [];

  // probs is indexed by output tokenId
  for (let tokenId = 0; tokenId < probs.length; tokenId += 1) {
    const token = model.vocab.idToToken.get(tokenId);
    if (restrictToVocab && token === undefined) continue;

    items.push({
      token: token ?? "",
      tokenId,
      probability: probs[tokenId] ?? 0
    });
  }

  items.sort((a, b) => b.probability - a.probability);
  return items.slice(0, Math.max(0, topK));
}

/**
 * Softmax over a vector of logits.
 *
 * Uses a max-shift for numerical stability.
 */
export function softmax(logits: number[]): number[] {
  if (logits.length === 0) return [];

  let max = logits[0];
  for (let i = 1; i < logits.length; i += 1) {
    if (logits[i] > max) max = logits[i];
  }

  const exps: number[] = new Array(logits.length);
  let sum = 0;

  for (let i = 0; i < logits.length; i += 1) {
    const v = Math.exp(logits[i] - max);
    exps[i] = v;
    sum += v;
  }

  if (sum === 0) return uniformDistribution(logits.length);

  const probs: number[] = new Array(logits.length);
  for (let i = 0; i < logits.length; i += 1) {
    probs[i] = exps[i] / sum;
  }

  return probs;
}

/**
 * Shannon entropy (natural log) of a probability distribution.
 *
 * Returns 0 for empty or degenerate inputs.
 */
export function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (let i = 0; i < probs.length; i += 1) {
    const p = probs[i];
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}

/**
 * Return a uniform probability distribution of length n.
 */
export function uniformDistribution(n: number): number[] {
  if (n <= 0) return [];
  const p = 1 / n;
  return Array.from({ length: n }, () => p);
}

/**
 * Return the highest-probability item from a TokenProbability list.
 * Assumes list is non-empty; works even if unsorted.
 */
export function argmax(items: TokenProbability[]): TokenProbability | null {
  if (items.length === 0) return null;

  let best = items[0];
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].probability > best.probability) best = items[i];
  }
  return best;
}
