<template>
  <main class="learn">
    <header class="hero">
      <h1 class="hero__title">How do language models work?</h1>

      <p class="hero__lead">
        At their core, language models learn from text by doing one simple thing:
      </p>

      <p class="hero__emphasis">they try to predict the next word.</p>

      <p class="hero__tagline">Everything else is refinement.</p>
    </header>

    <hr class="rule" />

    <section class="section">
      <h2>Basic idea</h2>

      <p>
        A model reads text one word at a time and learns patterns like:
      </p>

      <ul>
        <li>After "the cat", the word "sat" often comes next.</li>
        <li>After "the dog", the word "lay" often comes next.</li>
        <li>After "on the", words like "mat" or "floor" are common.</li>
      </ul>

      <p class="question">
        After "the cat sat on the", what word usually comes next?
      </p>

      <p class="question">
        After "the dog lay on the", what word is likely?
      </p>

      <p>
        Some models make their guess by looking at just one previous word. Others
        look at two, three, or more words before guessing.
      </p>

      <p>
        Looking at more words gives the model more context, but only if that
        context actually helps.
      </p>
    </section>

    <section class="section">
      <h2>This demo application</h2>

      <p>
        Each card shows a different model trained on text, with one key
        difference: how <strong>many previous words</strong> it looks at before
        predicting the next one.
      </p>

      <ul>
        <li>If previous words = 1, it guesses using only the last word.</li>
        <li>If previous words = 2, it guesses using the last two words.</li>
        <li>If previous words = 3, it guesses using the last three words.</li>
      </ul>

      <p>
        All models predict over the same vocabulary. They differ only in how
        much nearby text they consider.
      </p>
    </section>

    <section class="section">
      <h2>Uncertainty and structure</h2>

      <p>
        If the training text has meaningful structure, models that look at more
        words often become more confident (lower uncertainty).
      </p>

      <p>
        If the text is deliberately flat or repetitive, looking at more words
        does not help, and the models stay equally uncertain.
      </p>
    </section>

    <p class="back">
      <a class="back__link" href="/toy-gpt-chat/">Back to models</a>
    </p>
  </main>
</template>

<style scoped>
.learn {
  max-width: 720px;
  margin: 3rem auto;
  padding: 0 1rem;
  line-height: 1.6;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hero__title {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
}

.hero__lead {
  margin: 0;
  color: var(--color-muted, #666);
}

.hero__emphasis {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 650;
}

.hero__tagline {
  margin: 0;
  color: var(--color-muted, #666);
}

.rule {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid var(--color-border, #e0e0e0);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.section h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}

.section p {
  margin: 0;
}

.section ul {
  margin: 0.25rem 0 0.25rem 1.25rem;
  padding: 0;
}

.question {
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--color-border, #e0e0e0);
  background: var(--color-control-bg, #fafafa);
  border-radius: 6px;
}

.back {
  margin-top: 2rem;
}

.back__link {
  color: var(--color-link, #1976d2);
  text-decoration: none;
}

.back__link:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .learn {
    margin: 1.5rem auto;
  }

  .hero__title {
    font-size: 1.65rem;
  }

  .hero__emphasis {
    font-size: 1.1rem;
  }
}
</style>
