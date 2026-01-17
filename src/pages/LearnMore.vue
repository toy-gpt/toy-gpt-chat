<template>
  <main class="learn">
    <h1>How do language models work?</h1>

    <p>
      At their core, language models learn from text by doing one simple thing:
    </p>

    <span class="emphasis">
      they try to predict the next word.
    </span>

    <span>
      Everything else is refinement.
    </span>


    <hr>
    <h2>Basic idea</h2>

    A model reads text one word at a time and learns patterns like:
    <ul>
      <li>After "the cat", the word "sat" often comes next.</li>
      <li>After "the dog", the word "lay" often comes next.</li>
      <li>After "on the", words like "mat" or "floor" are common.</li>
    </ul>

    <p>after "the cat sat on the", what word usually comes next?</p>

    <p>after "the dog lay on the", what word is likely?</p>

    <p>Some models make their guess by looking at just one previous word.
      Others look at two, three, or more words before guessing.</p>

    <p>Looking at more words gives the model more context — but only if that context actually helps.</p>

    <h2>This Demo Application</h2>
    Each card shows a different model trained on text, with one key difference:

    How <b>many previous words</b> it looks at before predicting the next one.

    <ul>
      <li>If previous words = 1, then it guesses using only the last word.</li>
      <li>If previous words = 2, then it guesses using the last two words.</li>
      <li>If previous words = 3, then it guesses using the last three words.</li>
    </ul>
    All models predict over the same vocabulary.
    They just differ in how much nearby text they consider.

    <h2>Creating a Geometry or Multidimensional Landscape</h2>

    If the training text has meaningful structure, models that look at more words often become more confident (lower
    uncertainty).

    If the text is deliberately flat or repetitive, looking at more words doesn’t help — and the models stay equally
    uncertain.


    <p class="back">
      <a href="/chat/">Back to models</a>
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

.emphasis {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem 0;
}

.back a {
  color: var(--color-link, #1976d2);
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}
</style>
