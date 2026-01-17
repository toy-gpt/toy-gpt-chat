// src/services/modelLoader.ts

import type { ModelConfig, LoadedModel, ArtifactDefaults } from "../types/model";
import { loadModelFromArtifacts } from "./artifactLoader";

/**
 * Loads a model given its configuration and artifact defaults.
 *
 * @param model - The model configuration.
 * @param defaults - The artifact defaults.
 * @returns A promise that resolves to the loaded model.
 */
export async function loadModel(
  model: ModelConfig,
  defaults: ArtifactDefaults
): Promise<LoadedModel> {
  return await loadModelFromArtifacts(model, defaults);
}
