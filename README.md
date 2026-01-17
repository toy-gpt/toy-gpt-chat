# toy-gpt-chat

[![toy-gpt-train](https://img.shields.io/pypi/v/toy-gpt-train?label=toy-gpt-train)](https://pypi.org/project/toy-gpt-train/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/license/MIT)

> Demonstrates how a trained language model is used to answer a prompt.

Minimal chat interface demonstrating inference only - no learning happens here.

Loads pretrained artifacts from `toy-gpt-train` repositories and runs forward passes to generate **next-token predictions**.

## Key Idea

Large language models (LLM) are about language - but have nothing to do with semantics or what words mean.

LLMs work on **structure**, that is, how words (tokens) appear in relationship to each other.

LLMs build a geometry based on **proximity**.

## Quick Start

```shell
git clone https://github.com/toy-gpt/toy-gpt-chat.git
cd toy-gpt-chat
npm install
npm run dev
```

Enter a prompt, and see the best guesses (with probabilities) as different models try to predict the next word.

## Two-Part Architecture

- **Training** (completed earlier): Updates model parameters via gradient descent (minimizing error).
- **Inference** (shown here): Computes `softmax(weights @ input)` -> sample -> repeat.

## Process

- Load vocabulary and weight matrices from pre-trained CSV artifacts
- Convert prompt tokens to IDs
- Complete a forward pass: logits -> softmax -> probabilities
- Use greedy or top-k token selection
- Autoregressive generation loop

## Insights

The initial training text is intentionally neutral.

- Neutral corpus (cat_dog): Increasing context doesn't help, no structure to exploit.

Later additions will be more structured.

- Structured corpus (animals): Increasing context will help, and there are patterns that emerge that the models can exploit to improve predictions.

See how probability distributions begin indicate clear favorites for the "predicted next word".

## What GPT means (Generative Pre-trained Transformer)

GPT stands for:

- **Generative**: it generates text
- **Pre-trained**: trained before being used
- **Transformer**: the neural network architecture used in modern systems

The chat interface is not GPT. GPT is the model underneath.

ChatGPT got its name from using a Generative Pre-trained Transformer (GPT).

During usage, we **run the GPT forward to generate predictions**.

- "train" explains how the landscape is formed
- "chat" explains how we move through it

**Training**
- happens offline
- changes model parameters
- requires large datasets and compute
- is done infrequently
- builds a complex, multidimensional "landscape"

**Chat (usage/inference)**
- happens when a question is asked
- does NOT change parameters
- reuses existing infrastructure
- is fast and repeatable

## This Demo is Not a GPT

This repository demonstrates usage only.

- It is NOT a transformer (no attention, no embeddings beyond the weight matrix).
- There is NO semantic understanding, beyond the structural/statistical meaning that arises from proximity.
- These is no training taking place - all training data is read from pre-trained projects.

## Training Data for each Model Card

Training data is stored in different repositories in the [Toy-GPT Project](https://github.com/toy-gpt).

For example, given this [simple training data](https://github.com/toy-gpt/train-100-unigram/blob/main/corpus/000_cat_dog.txt):

```text
the cat sat on the mat
the dog sat on the rug
the cat lay on the rug
the dog lay on the mat
```

A simple "unigram" model (it only looks at one word to predict the next), created the following artifacts:

| File                                                                                                                      | Purpose                      |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| [`artifacts/01_vocabulary.csv`](https://github.com/toy-gpt/train-100-unigram/blob/main/artifacts/01_vocabulary.csv)       | ID, token, frequency (count) |
| [`artifacts/02_model_weights.csv`](https://github.com/toy-gpt/train-100-unigram/blob/main/artifacts/02_model_weights.csv) | Learned weight matrix        |

The first shows the vocabulary and the frequency of each word in the corpus (training set).

| token_id | token | frequency |
| -------- | ----- | --------- |
| 0        | cat   | 2         |
| 1        | dog   | 2         |
| 2        | lay   | 2         |
| 3        | mat   | 2         |
| 4        | on    | 4         |
| 5        | rug   | 2         |
| 6        | sat   | 2         |
| 7        | the   | 8         |

The second shows the model weights after iteratively training to get the least possible error (using gradient descent).

![Example 02_model_weights.csv](./images/02_model_weights.png)


## How To Use

Look at the training text.

Enter a prompt based on the training text.

As you type, the cards will show the "best guess" for the next word based on differnt methods of training.

Each model:
- computes probabilities for the next word
- selects a "most likely" completion
- does not learn from the interaction

## What happens during a query

When you ask a question:

1. The prompt is converted to vectors.
2. The model computes next-token probabilities.
3. A token is selected.
4. The process repeats.

## Note

- The model does not understand language.
- It does not claim correctness or truth.

This demo illustrates the foundations of generative LLM models.

## License

[MIT](./LICENSE)

## SE Manifest

[SE_MANIFEST.toml](./SE_MANIFEST.toml) - project intent, scope, and role
