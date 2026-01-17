// src/services/registry.ts

import type { ModelsRegistry } from "../types/model";

/**
 * Load the public model registry.
 *
 * The registry is a declarative index of:
 * - available corpora
 * - available models
 * - default artifact paths
 * - suggested prompts
 *
 * This function performs **no interpretation** of the registry contents.
 * It only fetches and returns the parsed JSON.
 *
 * WHY:
 * - Keeps App.vue focused on orchestration, not I/O
 * - Provides a single, inspectable entry point for registry loading
 * - Allows future reuse (tests, CLI, static analysis)
 *
 * ASSUMPTIONS:
 * - The registry is served from `/models.json` (Vite public asset)
 * - The JSON shape matches `ModelsRegistry`
 *
 * FAILS FAST IF:
 * - Network request fails
 * - Response is not valid JSON
 */
export async function loadModelsRegistry(): Promise<ModelsRegistry> {
  const url = `${import.meta.env.BASE_URL}models.json`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Failed to load models registry: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ModelsRegistry;

  return data;
}

/**
 * Optional helper: assert minimal registry sanity.
 *
 * This is intentionally lightweight:
 * - no deep validation
 * - no schema enforcement
 *
 * WHY:
 * - Catch obvious misconfigurations early
 * - Avoid silent UI failures
 *
 * You may call this immediately after loading the registry.
 */
export function assertRegistryIsSane(registry: ModelsRegistry): void {
  if (!Array.isArray(registry.corpora)) {
    throw new Error("Registry missing 'corpora' array.");
  }

  if (!Array.isArray(registry.models)) {
    throw new Error("Registry missing 'models' array.");
  }

  if (typeof registry.prompts !== "object") {
    throw new Error("Registry missing 'prompts' object.");
  }
}
