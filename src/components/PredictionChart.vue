<!-- src/components/PredictionChart.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PredictionResult } from "../types/inference";

const props = defineProps<{
  prediction: PredictionResult | null;
  title?: string;
  maxBars?: number;
}>();

const maxBars = computed(() => props.maxBars ?? 10);

const rows = computed(() => {
  if (!props.prediction) return [];
  const dist = props.prediction.distribution ?? [];
  return dist.slice(0, Math.max(0, maxBars.value));
});

function pct(prob: number): string {
  const v = prob * 100;
  return v < 10 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`;
}

function widthPct(prob: number): string {
  const w = prob * 100;
  return `${Math.max(0, Math.min(100, w))}%`;
}

</script>

<template>
  <section class="chart">
    <header class="chart__header">
      <h4 v-if="title" class="chart__title">{{ title }}</h4>
      <p v-if="prediction && prediction.distributionIsTopK" class="chart__note">
        Best guess:
      </p>
    </header>

    <div v-if="!prediction" class="chart__empty">No prediction yet.</div>

    <div v-else>


      <ol class="bars">
        <li v-for="row in rows" :key="row.tokenId" class="bars__row">
          <div class="bars__label">
            <code class="bars__token">{{ row.token }}</code>
            <span class="bars__pct">{{ pct(row.probability) }}</span>
          </div>
          <div class="bars__track">
            <div class="bars__fill" :style="{ width: widthPct(row.probability) }" />
          </div>
        </li>
      </ol>
          <div class="chart__scale">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chart__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.chart__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.chart__note {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-muted, #666);
}

.chart__scale {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 0.7rem;
  color: var(--color-muted, #666);
}

.chart__empty {
  font-size: 0.875rem;
  color: var(--color-muted, #666);
}

.bars {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.bars__row {
  display: grid;
  gap: 0.25rem;
}

.bars__label {
  display: flex;
  justify-content: left;
  gap: 0.75rem;
  align-items: center;
}

.bars__token {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 0.85rem;
}

.bars__pct {
  font-size: 0.8rem;
  color: var(--color-muted, #666);
}

.bars__track {
  height: 10px;
  border-radius: 999px;
  background: var(--color-bar-track, #eee);
  overflow: hidden;
}

.bars__fill {
  height: 100%;
  background: var(--color-bar-fill, #1976d2);
}
</style>
