import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock function so it can be referenced inside vi.mock factory
// ---------------------------------------------------------------------------
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

// Import AFTER mocks are in place
import { initializeOpenAI, getChatCompletion } from '../openai';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// initializeOpenAI
// ---------------------------------------------------------------------------
describe('initializeOpenAI', () => {
  it('returns false and does not create client when apiKey is empty', () => {
    expect(initializeOpenAI('')).toBe(false);
  });

  it('returns true when a non-empty apiKey is provided', () => {
    expect(initializeOpenAI('sk-test')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion
// ---------------------------------------------------------------------------
describe('getChatCompletion', () => {
  it('throws when called before initializeOpenAI', async () => {
    // Force un-initialized state by initializing with an empty key
    initializeOpenAI('');

    await expect(getChatCompletion('Hello')).rejects.toThrow(
      'OpenAI client not initialized. Please set a valid API key.'
    );
  });

  it('returns assistant message content on success', async () => {
    initializeOpenAI('sk-test');
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello, world!' } }],
    });

    const result = await getChatCompletion('Hello');
    expect(result).toBe('Hello, world!');
  });

  it('falls back to default message when choices are empty', async () => {
    initializeOpenAI('sk-test');
    mockCreate.mockResolvedValueOnce({ choices: [] });

    const result = await getChatCompletion('Hello');
    expect(result).toBe('Sorry, I could not process your request.');
  });

  it('passes the user message in the request', async () => {
    initializeOpenAI('sk-test');
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    await getChatCompletion('What is TypeScript?');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'What is TypeScript?' }),
        ]),
      })
    );
  });

  it('throws "Invalid API key" error on 401', async () => {
    initializeOpenAI('sk-bad');
    const err: any = new Error('Unauthorized');
    err.status = 401;
    mockCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow(
      'Invalid API key. Please check your API key and try again.'
    );
  });

  it('throws a generic error with message for other failures', async () => {
    initializeOpenAI('sk-test');
    const err: any = new Error('Service unavailable');
    mockCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow('Service unavailable');
  });

  it('falls back to default message when message content is null', async () => {
    initializeOpenAI('sk-test');
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await getChatCompletion('Hello');
    expect(result).toBe('Sorry, I could not process your request.');
  });

  it('uses gpt-3.5-turbo as the model', async () => {
    initializeOpenAI('sk-test');
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    await getChatCompletion('Hello');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-3.5-turbo' })
    );
  });
});
