<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import ControlBar from './components/ControlBar.vue';
import ModelRibbon from './components/ModelRibbon.vue';
import InsightAnnotation from './components/InsightAnnotation.vue';
import FooterMeta from './components/FooterMeta.vue';
import { loadModelsRegistry, assertRegistryIsSane } from "./services/registry";
import { inferNextToken } from "./services/inference";
import type { ModelsRegistry, CorpusConfig, ModelConfig, LoadedModel } from './types/model';
import type { PredictionResult } from './types/inference';
import { loadModelFromArtifacts } from "./services/artifactLoader";
import type { ArtifactDefaults } from "./types/model";

type CorpusType = 'neutral' | 'structured';

const registry = ref<ModelsRegistry | null>(null);

const corpora = computed<CorpusConfig[]>(() => {
  const reg = registry.value;
  if (!reg) return [];
  const used = new Set(reg.models.map((m) => m.corpus));
  return (reg.corpora ?? []).filter((c) => used.has(c.id));
});

const loadedById = computed(() => {
  const m = new Map<string, LoadedModel>();
  for (const lm of loadedModels.value) m.set(lm.config.id, lm);
  return m;
});

const modelsConfig = computed<ModelConfig[]>(() => registry.value?.models ?? []);
const promptsByCorpus = computed<Record<string, string[]>>(
  () => registry.value?.prompts ?? {}
);
// UI state
const selectedCorpus = ref<string>('cat_dog');
const prompt = ref<string>('the cat sat on the');

// Loading/prediction state keyed by modelId
const loadedModels = ref<LoadedModel[]>([]);
const predictionsByModelId = ref<Map<string, PredictionResult | null>>(new Map());
const loadingModels = ref<Set<string>>(new Set());
const errorsByModelId = ref<Map<string, string>>(new Map());

const fallbackArtifactDefaults: ArtifactDefaults = {
  metaPath: "artifacts/00_meta.json",
  vocabPath: "artifacts/01_vocabulary.csv",
  weightsPath: "artifacts/02_model_weights.csv",
  layoutPath: "artifacts/03_token_embeddings.csv",
};

// Provide (optional; fine if other components inject instead of props)
provide('selectedCorpus', selectedCorpus);
provide('prompt', prompt);
provide('predictions', predictionsByModelId);

// Derived UI helpers
const suggestedPrompts = computed<string[]>(() => {
  const p = promptsByCorpus.value[selectedCorpus.value];
  return Array.isArray(p) ? p : [];
});

const corpusType = computed<CorpusType>(() => {
  // Minimal heuristic for now: you can replace with an explicit field in CorpusConfig later.
  const c = corpora.value.find((x) => x.id === selectedCorpus.value);
  if (!c) return 'neutral';
  const name = `${c.name ?? ''}`.toLowerCase();
  const desc = `${c.description ?? ''}`.toLowerCase();
  if (name.includes('structured') || desc.includes('structured')) return 'structured';
  return 'neutral';
});

const selectedModelConfigs = computed<ModelConfig[]>(() =>
  modelsConfig.value.filter((m) => m.corpus === selectedCorpus.value)
);

// ModelRibbon expects LoadedModel[]
const selectedLoadedModels = computed<LoadedModel[]>(() => {
  const ids = new Set(selectedModelConfigs.value.map((m) => m.id));
  return loadedModels.value.filter((m) => ids.has(m.config.id));
});

// ModelRibbon expects Map<string, PredictionResult | null> (we already have that)
const ribbonPredictions = computed(() => predictionsByModelId.value);
const ribbonLoadingModels = computed(() => loadingModels.value);
const ribbonErrors = computed(() => errorsByModelId.value);

// InsightAnnotation expects PredictionResult[]
const insightPredictions = computed<PredictionResult[]>(() => {
  const out: PredictionResult[] = [];
  for (const v of predictionsByModelId.value.values()) {
    if (v) out.push(v);
  }
  return out;
});

// FooterMeta props
const repoUrl = 'https://github.com/toy-gpt/toy-gpt-chat';
const appLastUpdated = undefined as string | undefined;

async function loadModelsForSelectedCorpus(): Promise<void> {
  const reg = registry.value;
  if (!reg) return;

  const defaults = reg.artifactDefaults ?? fallbackArtifactDefaults;

  // Determine which model configs belong to the selected corpus
  const wanted = reg.models.filter((m) => m.corpus === selectedCorpus.value);
  if (wanted.length === 0) {
    errorsByModelId.value.set(
      "__models__",
      `No models found for corpus '${selectedCorpus.value}'. Check models.json corpus ids.`
    );
  }

  // Reset state (first draft behavior)
  loadedModels.value = [];
  predictionsByModelId.value = new Map();
  errorsByModelId.value = new Map();
  loadingModels.value = new Set(wanted.map((m) => m.id));

  await Promise.all(
    wanted.map(async (cfg) => {
      try {
        const model = await loadModelFromArtifacts(cfg, defaults);
        loadedModels.value = [...loadedModels.value, model];
      } catch (e) {
        errorsByModelId.value.set(
          cfg.id,
          e instanceof Error ? e.message : String(e)
        );
      } finally {
        const next = new Set(loadingModels.value);
        next.delete(cfg.id);
        loadingModels.value = next;
      }
    })
  );
  if (loadedModels.value.length === 0 && wanted.length > 0) {
    errorsByModelId.value.set(
      "__models__",
      "Models were requested but none loaded. Check Network tab for raw.githubusercontent.com fetch failures."
    );
  }
  runInferenceForLoadedModels();
}

function runInferenceForLoadedModels(): void {
  const models = selectedLoadedModels.value;

  // Reset predictions for currently selected models
  const next = new Map<string, PredictionResult | null>();

  for (const m of models) {
    try {
      const pred = inferNextToken(m, prompt.value, { topK: 10 });
      next.set(m.config.id, pred);
    } catch (e) {
      // If inference fails, keep null prediction and surface the error on the card
      next.set(m.config.id, null);
      errorsByModelId.value.set(
        m.config.id,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  predictionsByModelId.value = next;
}

function onSubmit(): void {
  runInferenceForLoadedModels();
}

onMounted(async () => {
  try {
    const reg = await loadModelsRegistry();
    assertRegistryIsSane(reg);
    registry.value = reg;

    if (suggestedPrompts.value.length > 0) {
      prompt.value = suggestedPrompts.value[0];
    }

    await loadModelsForSelectedCorpus();
  } catch (err) {
    errorsByModelId.value.set(
      "__registry__",
      err instanceof Error ? err.message : String(err)
    );
  }
});

watch(
  () => selectedLoadedModels.value.map((m) => m.config.id).join(","),
  () => {
    if (!registry.value) return;
    runInferenceForLoadedModels();
  }
);

watch(
  () => prompt.value,
  () => {
    if (!registry.value) return;
    runInferenceForLoadedModels();
  }
);

// Keep prompt aligned when corpus changes (reasonable default for a first draft)
watch(
  () => selectedCorpus.value,
  () => {
    if (!registry.value) return;

    const list = suggestedPrompts.value;
    if (list.length > 0) prompt.value = list[0];

    void loadModelsForSelectedCorpus();
  }
);
</script>

<template>
  <div class="app">

    <section class="hero">
      <div class="hero__inner">
        <h1 class="hero__title">How do language models work?</h1>

        <p class="hero__lead">
          Modern language models (like ChatGPT) learn from text by doing one thing:
          <span class="hero__bold">they try to predict the next word.</span>
        </p>

        <div class="model-card__status">
          <router-link to="/learn-more" class="badge badge--view">
            Learn more
          </router-link>
        </div>

      </div>
    </section>


    <ControlBar :corpora="corpora" :selected-corpus="selectedCorpus" :prompt="prompt"
      :suggested-prompts="suggestedPrompts" @update:selectedCorpus="selectedCorpus = $event"
      @update:prompt="prompt = $event" @submit="onSubmit" />

    <section class="model-explainer">
      <p>
        Different models are shown below; each tries to predict the next word.
        One difference is <b>how many words</b> it looks at before making a guess.
      </p>
    </section>

    <ModelRibbon :model-configs="selectedModelConfigs" :loaded-by-id="loadedById" :predictions="ribbonPredictions"
      :loading-models="ribbonLoadingModels" :errors="ribbonErrors" />

    <InsightAnnotation :predictions="insightPredictions" :corpus-type="corpusType" />

    <FooterMeta :repo-url="repoUrl" :app-last-updated="appLastUpdated" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.hero {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  background: var(--color-control-bg, #fafafa);
  text-align: center;
}

.hero__inner {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  gap: 0.5rem;
}

.hero__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface, #212121);
}

.hero__lead {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-muted, #666);
}

.hero__bold {
  font-weight: 700;
}

.hero__link {
  width: fit-content;
  margin-top: 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-link, #28a745);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.4rem 0.75rem;
}

.hero__link:hover {
  text-decoration: underline;
  border-color: var(--color-border, #e0e0e0);
  background: var(--color-surface, #ffffff);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  text-decoration: none;
  user-select: none;
  white-space: nowrap;
}

/* Green action badge */
.badge--view {
  background: var(--success-color, #28a745);
  color: #ffffff;
  border: none;
}

.badge--view:hover {
  background: #218838;
  text-decoration: none;
}

/* Disabled / inactive state */
.badge--view.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Slightly tighter on small screens */
@media (max-width: 768px) {
  .hero__title {
    font-size: 1.2rem;
  }

  .hero__big {
    font-size: 1rem;
  }
}


.model-explainer {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  color: var(--color-muted, #666);
  background: var(--color-control-bg, #fafafa);
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}
</style>
