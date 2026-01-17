<!-- src/components/ProbabilityChart.vue -->
<script setup lang="ts">
import { computed } from 'vue';

export type ProbabilityDatum = {
  token: string;
  prob: number; // 0..1
};

const props = defineProps<{
  data: ProbabilityDatum[];
  title?: string;
  maxBars?: number; // defaults to data length
  showPercent?: boolean; // defaults true
}>();

const maxBars = computed(() => props.maxBars ?? props.data.length);
const showPercent = computed(() => props.showPercent ?? true);

const rows = computed(() => {
  const sorted = [...props.data].sort((a, b) => b.prob - a.prob);
  return sorted.slice(0, Math.max(0, maxBars.value));
});

const maxProb = computed(() => {
  const m = rows.value.reduce((acc, r) => Math.max(acc, r.prob), 0);
  return m > 0 ? m : 1;
});

function fmtPercent(p: number): string {
  const v = p * 100;
  // show 1 decimal for small-ish values, else whole percent
  if (v < 10) return `${v.toFixed(1)}%`;
  return `${Math.round(v)}%`;
}
</script>

<template>
  <section class="prob-chart" aria-label="Probability chart">
    <header v-if="title" class="prob-chart__header">
      <h4 class="prob-chart__title">{{ title }}</h4>
    </header>

    <ul class="prob-chart__list" role="list">
      <li v-for="row in rows" :key="row.token" class="prob-chart__row">
        <div class="prob-chart__label" :title="row.token">
          <code class="prob-chart__token">{{ row.token }}</code>
        </div>

        <div class="prob-chart__barWrap" aria-hidden="true">
          <div
            class="prob-chart__bar"
            :style="{ width: `${(row.prob / maxProb) * 100}%` }"
          />
        </div>

        <div class="prob-chart__value">
          <span v-if="showPercent">{{ fmtPercent(row.prob) }}</span>
          <span v-else>{{ row.prob.toFixed(4) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.prob-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prob-chart__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.prob-chart__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.prob-chart__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.prob-chart__row {
  display: grid;
  grid-template-columns: minmax(8rem, 14rem) 1fr minmax(3.5rem, 4.5rem);
  align-items: center;
  gap: 0.75rem;
}

.prob-chart__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prob-chart__token {
  font-size: 0.8125rem;
}

.prob-chart__barWrap {
  height: 0.75rem;
  border-radius: 999px;
  background: var(--color-bar-bg, #eeeeee);
  overflow: hidden;
}

.prob-chart__bar {
  height: 100%;
  border-radius: 999px;
  background: var(--color-bar-fill, #1976d2);
}

.prob-chart__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-muted, #666);
  font-size: 0.8125rem;
}

/* Mobile: stack label/value around the bar */
@media (max-width: 768px) {
  .prob-chart__row {
    grid-template-columns: 1fr 4.5rem;
    grid-template-rows: auto auto;
  }

  .prob-chart__barWrap {
    grid-column: 1 / -1;
  }
}
</style>
