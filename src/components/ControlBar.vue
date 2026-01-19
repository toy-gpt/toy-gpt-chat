<script setup lang="ts">
import { computed } from 'vue';
import type { CorpusConfig } from '../types/model';

const props = defineProps<{
  corpora: CorpusConfig[];
  selectedCorpus: string;
  prompt: string;
  suggestedPrompts: string[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedCorpus', value: string): void;
  (e: 'update:prompt', value: string): void;
  (e: 'submit'): void;
}>();

const currentCorpus = computed(() =>
  props.corpora.find((c) => c.id === props.selectedCorpus)
);

// TEMPORARY: only some are live
const AVAILABLE_CORPORA: readonly string[] = [
  "cat_dog",
 // "animals",
 // "llm_glossary",
];

function isAvailable(corpusId: string): boolean {
  return AVAILABLE_CORPORA.includes(corpusId);
}

function selectPrompt(p: string): void {
  emit('update:prompt', p);
  emit('submit');
}
</script>

<template>
  <div class="control-bar">
    <div class="corpus-selector">
      <label class="control-label">
        Select training text:
        <span v-if="currentCorpus" class="select-text-tooltip" tabindex="0" :aria-label="currentCorpus.description"
          :title="currentCorpus.description">
          ℹ️
        </span>
      </label>
      <div class="corpus-buttons">
        <button v-for="corpus in corpora" :key="corpus.id" type="button" class="corpus-button" :class="{
          active: corpus.id === selectedCorpus,
          disabled: !isAvailable(corpus.id)
        }" :disabled="!isAvailable(corpus.id)" @click="emit('update:selectedCorpus', corpus.id)">
          {{ corpus.name }}
        </button>
      </div>
    </div>
    <!--
    <p v-if="currentCorpus" class="corpus-description">
      {{ currentCorpus.description }}
    </p>
    <p v-if="currentCorpus" class="corpus-description">
      Click 'View Text' on a card below to view the training text.
    </p>-->

    <div class="prompt-input">
      <label class="control-label">
        Edit prompt:
        <span class="edit-prompt-tooltip" tabindex="1" aria-label="Results update as you type"
          title="Results update as you type">ℹ️
        </span>
      </label>
      <div class="input-row">
        <input id="prompt" type="text" :value="prompt"
          placeholder="Enter words (best guesses for next word will update)..."
          @input="emit('update:prompt', ($event.target as HTMLInputElement).value)" />
        <button type="button" class="submit-button" @click="emit('update:prompt', '')">Clear Prompt</button>
      </div>
    </div>

    <div v-if="suggestedPrompts.length" class="suggested-prompts">
      <span class="control-label">Try:</span>
      <button v-for="p in suggestedPrompts" :key="p" type="button" class="prompt-chip" @click="selectPrompt(p)">
        {{ p }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-control-bg, #fafafa);
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.control-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-muted, #666);
}

.corpus-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.corpus-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.corpus-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 4px;
  background: var(--color-card-bg, #ffffff);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.corpus-button:hover {
  border-color: var(--color-primary, #1976d2);
}

.corpus-button.active {
  background: var(--color-primary, #1976d2);
  color: white;
  border-color: var(--color-primary, #1976d2);
}

.corpus-button.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--color-card-bg, #fff);
  border-color: var(--color-border, #e0e0e0);
}

.corpus-button.disabled:hover {
  border-color: var(--color-border, #e0e0e0);
}


.prompt-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 4px;
  font-size: 1rem;
  font-family: monospace;
}

.input-row input:focus {
  outline: none;
  border-color: var(--color-primary, #1976d2);
}

.submit-button {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary, #1976d2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.2s ease;
}

.submit-button:hover {
  background: var(--color-primary-dark, #1565c0);
}

.suggested-prompts {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.prompt-chip {
  padding: 0.375rem 0.75rem;
  background: var(--color-chip-bg, #e3f2fd);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: monospace;
  transition: background 0.2s ease;
}

.prompt-chip:hover {
  background: var(--color-chip-hover, #bbdefb);
}

.corpus-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-muted, #666);
  font-style: italic;
}
</style>
