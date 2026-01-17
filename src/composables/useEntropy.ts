// src/composables/useEntropy.ts

import type { PredictionResult } from "../types/inference";

export interface EntropyAnalysis {
  /** True if all models have essentially the same entropy (no benefit from context). */
  allSimilar: boolean;

  /** True if entropy tends to go down as context window increases. */
  improvesWithContext: boolean;

  /** Short human-readable summary for the UI. */
  summary: string;

  /** Raw values for debugging or later UI. */
  entropies: Array<{ modelId: string; entropy: number; confidence: number }>;
}

/**
 * Lightweight entropy analysis for ModelRibbon results.
 *
 * This composable does NOT compute entropy; it assumes each PredictionResult
 * already includes `entropy` and `confidence`.
 *
 * WHY:
 * - Keep InsightAnnotation simple and declarative.
 * - Keep logic inspectable and testable as pure functions.
 */
export function useEntropy() {
  /**
   * Compare entropies across models.
   *
   * Current heuristic:
   * - "allSimilar" if max-min entropy is below a small tolerance
   * - "improvesWithContext" if the best (lowest entropy) is meaningfully lower than the worst
   *
   * Note: We do not infer contextWindow here because PredictionResult does not contain it.
   * If you want true "improves with context size", pass in (PredictionResult + contextWindow)
   * later. For now, this is still a useful signal.
   */
  function compareEntropies(predictions: PredictionResult[]): EntropyAnalysis {
    const entropies = predictions.map((p) => ({
      modelId: p.modelId,
      entropy: p.entropy,
      confidence: p.confidence
    }));

    if (entropies.length === 0) {
      return {
        allSimilar: true,
        improvesWithContext: false,
        summary: "No predictions yet.",
        entropies
      };
    }

    let min = entropies[0].entropy;
    let max = entropies[0].entropy;

    for (let i = 1; i < entropies.length; i += 1) {
      const h = entropies[i].entropy;
      if (h < min) min = h;
      if (h > max) max = h;
    }

    const spread = max - min;

    // Tolerance is intentionally small but not fragile.
    // Adjust after you see real values.
    const tol = 0.05;

    const allSimilar = spread <= tol;

    // "Improves" here means at least one model is substantially more certain than another.
    // This is not yet tied to contextWindow; it's a first-draft insight.
    const improvesWithContext = spread > 0.2;

    const summary = allSimilar
      ? "Models look similarly uncertain here (entropy is about the same)."
      : improvesWithContext
        ? "Some models are noticeably more certain here (lower entropy)."
        : "Models differ a bit, but not dramatically.";

    return {
      allSimilar,
      improvesWithContext,
      summary,
      entropies
    };
  }

  return { compareEntropies };
}
