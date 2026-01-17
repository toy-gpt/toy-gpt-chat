// src/composables/useArtifacts.ts

import type { ArtifactDefaults, LoadedModel, ModelConfig } from "../types/model";
import { loadModelFromArtifacts } from "../services/artifactLoader";

/**
 * Composable wrapper around artifact loading.
 *
 * WHY:
 * - Keeps Vue-facing code (composables) thin
 * - Centralizes parsing + URL logic in services/artifactLoader.ts
 *
 * This file should NOT re-implement CSV parsing.
 */
export async function loadModel(
  model: ModelConfig,
  defaults: ArtifactDefaults
): Promise<LoadedModel> {
  return await loadModelFromArtifacts(model, defaults);
}
