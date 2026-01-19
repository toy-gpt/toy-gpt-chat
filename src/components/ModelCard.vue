<!-- src/components/ModelCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { LoadedModel, ModelConfig } from "../types/model";
import type { PredictionResult } from '../types/inference';
import PredictionChart from './PredictionChart.vue';

const props = defineProps<{
  model: LoadedModel | null;
  config: ModelConfig;
  prediction: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
}>();

const cfg = computed(() => props.model?.config ?? props.config);


const sourceTextUrl = computed(() => {
  if (!props.model) return null;
  // meta.corpus.path may be Windows-style, normalize it
  const rawPath = props.model.meta.corpus.path.replace(/\\/g, "/");
  return `https://raw.githubusercontent.com/${cfg.value.repo}/${cfg.value.branch}/${rawPath}`;
});

function openSourceText(): void {
  if (!sourceTextUrl.value) return;
  window.open(sourceTextUrl.value, "_blank", "noopener,noreferrer");
}

const title = computed(() => cfg.value.id);

const subtitle = computed(() => {
  const ctx = cfg.value.contextWindow;
  const parts = [
    Number.isFinite(ctx) ? `Words used to predict = ${ctx}` : ""
  ].filter((v) => String(v).trim().length > 0);
  return parts.join(" · ");
});

</script>

<template>
  <article class="model-card" :data-state="isLoading ? 'loading' : error ? 'error' : 'ready'">
    <header class="model-card__header">
      <div class="model-card__titles">
        <h3 class="model-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="model-card__subtitle">{{ subtitle }}</p>
      </div>

      <div class="model-card__status">
        <button type="button" class="badge badge--view" :disabled="!sourceTextUrl || isLoading" @click="openSourceText">
          View Training Text
        </button>
      </div>
    </header>

    <section class="model-card__body">
      <div v-if="error" class="callout callout--error">
        <p class="callout__title">Model error</p>
        <p class="callout__text">{{ error }}</p>
      </div>

      <div v-else-if="isLoading" class="skeleton">
        <div class="skeleton__line" />
        <div class="skeleton__line" />
        <div class="skeleton__bar" />
        <div class="skeleton__bar" />
        <div class="skeleton__bar" />
      </div>

      <div v-else class="prediction">
        <!--
        <div class="prediction__top">
          <div class="prediction__label">Top prediction</div>
          <div v-if="top1" class="prediction__value">
            <code class="prediction__token">{{ top1.token }}</code>
            <span class="prediction__conf">{{ confidenceText }}</span>
          </div>
          <div v-else class="prediction__empty">No prediction yet.</div>
        </div>
-->
        <PredictionChart :prediction="prediction" :title="''" :max-bars="10" />
      </div>
    </section>

    <footer class="model-card__footer">
      <div class="meta">
        <span class="meta__item">
          <span v-if="isLoading" class="meta__v">  Loading</span>
          <span v-else-if="error" class="meta__v">  Error</span>
        </span>
      </div>
    </footer>

  </article>
</template>

<style scoped>
.model-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 12px;
  background: var(--color-surface, #ffffff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    /* Mobile default: take the available width */
  width: 90%;
  max-width: 90%;
}
/* Tablet+ / laptop: card becomes a "tile" width */
@media (min-width: 768px) {
  .model-card {
    /* min, preferred, max */
    width: clamp(180px, 30vw, 220px);
    max-width: none;
  }
}

.model-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.model-card__titles {
  min-width: 0;
}

.model-card__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-on-surface, #212121);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta__item{
  justify-content: space-between;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.badge--view {
  background: var(--color-success, #28a745);
  color: #ffffff;
}

.badge--view:hover:not(:disabled) {
  filter: brightness(0.95);
}

.badge--view:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
