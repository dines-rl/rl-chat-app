import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the openai package before importing the service under test
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    // Must use `function` so Vitest allows it as a `new`-able constructor
    default: vi.fn(function () {
      return { chat: { completions: { create: mockCreate } } };
    }),
  };
});

// Import after mocks are registered
import { initializeOpenAI, getChatCompletion } from '../openai';

describe('initializeOpenAI', () => {
  it('returns false for an empty API key', () => {
    expect(initializeOpenAI('')).toBe(false);
  });

  it('returns true for a non-empty API key', () => {
    expect(initializeOpenAI('sk-test-key')).toBe(true);
  });
});

describe('getChatCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when the client has not been initialized', async () => {
    // Reset the module to clear the in-module singleton
    // We call initializeOpenAI('') to set openaiClient to null
    initializeOpenAI('');
    await expect(getChatCompletion('hello')).rejects.toThrow(
      'OpenAI client not initialized'
    );
  });

  it('returns the assistant message on a successful call', async () => {
    initializeOpenAI('sk-test-key');

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello!' } }],
    });

    const result = await getChatCompletion('hi');
    expect(result).toBe('Hello!');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('falls back to default message when content is null', async () => {
    initializeOpenAI('sk-test-key');

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await getChatCompletion('hi');
    expect(result).toBe('Sorry, I could not process your request.');
  });

  it('throws "Invalid API key" error on 401 status', async () => {
    initializeOpenAI('sk-test-key');

    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow('Invalid API key');
  });

  it('rethrows other errors with their message', async () => {
    initializeOpenAI('sk-test-key');

    const err = new Error('network timeout');
    mockCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow('network timeout');
  });

  it('passes the user message to the API', async () => {
    initializeOpenAI('sk-test-key');

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'pong' } }],
    });

    await getChatCompletion('ping');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'ping' }),
        ]),
      })
    );
  });
});
