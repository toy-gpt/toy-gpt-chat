// src/components/InsightAnnotation.vue

<script setup lang="ts">
import { computed } from 'vue';
import type { PredictionResult } from '../types/inference';
import { useEntropy } from '../composables/useEntropy';

const props = defineProps<{
  predictions: PredictionResult[];
  corpusType: 'neutral' | 'structured';
}>();

const { compareEntropies } = useEntropy();

const analysis = computed(() => compareEntropies(props.predictions));

const insightClass = computed(() => {
  if (analysis.value.allSimilar) return 'insight-neutral';
  if (analysis.value.improvesWithContext) return 'insight-positive';
  return 'insight-mixed';
});
</script>

<template>
  <div class="insight-annotation" :class="insightClass">
    <p class="insight-text">{{ analysis.summary }}</p>
  </div>
</template>

<style scoped>
.insight-annotation {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin: 0 1rem;
  font-size: 0.875rem;
}

.insight-neutral {
  background: var(--color-insight-neutral-bg, #fff3e0);
  border-left: 4px solid var(--color-insight-neutral, #ff9800);
}

.insight-positive {
  background: var(--color-insight-positive-bg, #e8f5e9);
  border-left: 4px solid var(--color-insight-positive, #4caf50);
}

.insight-mixed {
  background: var(--color-insight-mixed-bg, #e3f2fd);
  border-left: 4px solid var(--color-insight-mixed, #2196f3);
}

.insight-text {
  margin: 0;
}
</style>
