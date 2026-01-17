<script setup lang="ts">
defineProps<{
  repoUrl: string;
  appLastUpdated?: string;
}>();
</script>

<template>
  <footer class="footer-meta">
    <div class="footer-links">
      <a :href="repoUrl" target="_blank" rel="noopener">GitHub</a>
      <span class="separator">·</span>
      <a href="https://github.com/toy-gpt" target="_blank" rel="noopener">Project</a>
    </div>
    <div v-if="appLastUpdated" class="last-updated">
      Last updated: {{ appLastUpdated }}
    </div>
  </footer>
</template>

<style scoped>
.footer-meta {
  padding: 1rem;
  border-top: 1px solid var(--color-border, #e0e0e0);
  background: var(--color-footer-bg, #fafafa);
  font-size: 0.75rem;
  color: var(--color-muted, #666);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.footer-links {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.footer-links a {
  color: var(--color-link, #1976d2);
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

.separator {
  color: var(--color-border, #e0e0e0);
}

.last-updated {
  font-style: italic;
}
</style>
