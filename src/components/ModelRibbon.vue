<!-- src/components/ModelRibbon.vue -->
<script setup lang="ts">
import type { LoadedModel, ModelConfig } from "../types/model";
import type { PredictionResult } from "../types/inference";
import ModelCard from "./ModelCard.vue";

defineProps<{
  modelConfigs: ModelConfig[];
  loadedById: Map<string, LoadedModel>;
  predictions: Map<string, PredictionResult | null>;
  loadingModels: Set<string>;
  errors: Map<string, string>;
}>();
</script>

<template>
  <div class="model-ribbon">
    <ModelCard v-for="cfg in modelConfigs" :key="cfg.id" :model="loadedById.get(cfg.id) ?? null" :config="cfg"
      :prediction="predictions.get(cfg.id) ?? null" :is-loading="loadingModels.has(cfg.id)"
      :error="errors.get(cfg.id) ?? null" />
  </div>
</template>

<style scoped>
.model-ribbon {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
}

/* Mobile: vertical stack, scroll down */
@media (max-width: 768px) {
  .model-ribbon {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .model-ribbon :deep(.model-card) {
    max-width: none;
  }
}

/* Desktop: horizontal ribbon, scroll right */
@media (min-width: 769px) {
  .model-ribbon {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    align-items: stretch;
  }

  .model-ribbon :deep(.model-card) {
    flex: 0 0 auto;
    width: 420px;
    /* tweak as you like */
    max-width: 420px;
  }
}
</style>
