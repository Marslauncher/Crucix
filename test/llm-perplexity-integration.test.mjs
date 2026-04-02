// Perplexity provider — optional live integration test

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PerplexityProvider } from '../lib/llm/perplexity.mjs';

const apiKey = process.env.PERPLEXITY_API_KEY || process.env.LLM_API_KEY;
const shouldRun = !!apiKey;
const testFn = shouldRun ? it : it.skip;

describe('PerplexityProvider integration', () => {
  testFn('should complete a simple prompt with live API', async () => {
    const provider = new PerplexityProvider({ apiKey, model: process.env.PERPLEXITY_MODEL || 'sonar-pro' });
    const result = await provider.complete('You are concise.', 'Reply with exactly: pong', { maxTokens: 32, timeout: 90000 });
    assert.equal(typeof result.text, 'string');
    assert.ok(result.text.length > 0);
    assert.equal(typeof result.usage.inputTokens, 'number');
    assert.equal(typeof result.usage.outputTokens, 'number');
    assert.equal(typeof result.model, 'string');
  });
});
