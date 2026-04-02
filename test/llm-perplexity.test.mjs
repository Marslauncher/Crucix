// Perplexity provider — unit tests
// Uses Node.js built-in test runner (node:test) — no extra dependencies

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PerplexityProvider } from '../lib/llm/perplexity.mjs';
import { createLLMProvider } from '../lib/llm/index.mjs';

describe('PerplexityProvider', () => {
  it('should set defaults correctly', () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test' });
    assert.equal(provider.name, 'perplexity');
    assert.equal(provider.model, 'sonar-pro');
    assert.equal(provider.baseUrl, 'https://api.perplexity.ai');
    assert.equal(provider.isConfigured, true);
  });

  it('should accept custom model and baseUrl', () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test', model: 'sonar', baseUrl: 'https://api.perplexity.ai/' });
    assert.equal(provider.model, 'sonar');
    assert.equal(provider.baseUrl, 'https://api.perplexity.ai');
  });

  it('should report not configured without API key', () => {
    const provider = new PerplexityProvider({});
    assert.equal(provider.isConfigured, false);
  });

  it('should throw on API error', async () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test' });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() => Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') }));
    try {
      await assert.rejects(
        () => provider.complete('system', 'user'),
        (err) => {
          assert.match(err.message, /Perplexity API 401/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should parse successful response', async () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test' });
    const mockResponse = {
      choices: [{ message: { content: 'Hello from Perplexity' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      model: 'sonar-pro',
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));
    try {
      const result = await provider.complete('system', 'user');
      assert.equal(result.text, 'Hello from Perplexity');
      assert.equal(result.usage.inputTokens, 10);
      assert.equal(result.usage.outputTokens, 5);
      assert.equal(result.model, 'sonar-pro');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should send correct request format', async () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test-key', model: 'sonar-pro' });
    let capturedUrl, capturedOpts;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn((url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
          model: 'sonar-pro',
        }),
      });
    });
    try {
      await provider.complete('system prompt', 'user message', { maxTokens: 2048 });
      assert.equal(capturedUrl, 'https://api.perplexity.ai/chat/completions');
      assert.equal(capturedOpts.method, 'POST');
      const headers = capturedOpts.headers;
      assert.equal(headers['Content-Type'], 'application/json');
      assert.equal(headers.Authorization, 'Bearer pplx-test-key');
      const body = JSON.parse(capturedOpts.body);
      assert.equal(body.model, 'sonar-pro');
      assert.equal(body.max_tokens, 2048);
      assert.equal(body.stream, false);
      assert.equal(body.temperature, 0);
      assert.equal(body.messages[0].role, 'system');
      assert.equal(body.messages[0].content, 'system prompt');
      assert.equal(body.messages[1].role, 'user');
      assert.equal(body.messages[1].content, 'user message');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle empty response gracefully', async () => {
    const provider = new PerplexityProvider({ apiKey: 'pplx-test' });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [], usage: {} }) }));
    try {
      const result = await provider.complete('sys', 'user');
      assert.equal(result.text, '');
      assert.equal(result.usage.inputTokens, 0);
      assert.equal(result.usage.outputTokens, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createLLMProvider', () => {
  it('should create Perplexity provider', () => {
    const provider = createLLMProvider({ provider: 'perplexity', apiKey: 'pplx-test' });
    assert.ok(provider instanceof PerplexityProvider);
    assert.equal(provider.isConfigured, true);
  });
});
