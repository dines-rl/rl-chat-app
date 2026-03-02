import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────
// vi.hoisted lets us create variables that are accessible inside the
// hoisted vi.mock factory blocks (which run before module imports).
// ─────────────────────────────────────────────

const { mockOpenAICreate, mockAnthropicCreate, mockProcessImage } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
  mockAnthropicCreate: vi.fn(),
  mockProcessImage: vi.fn().mockResolvedValue('mock image analysis'),
}));

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: mockOpenAICreate } };
    constructor(_options: unknown) {}
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: mockAnthropicCreate };
    constructor(_options: unknown) {}
  },
}));

vi.mock('./image-processor', () => ({
  processImage: mockProcessImage,
}));

import { initializeAI, getChatCompletion } from './ai-providers';

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

// This test MUST run before any successful initializeAI call so that
// module-level state is still uninitialized.
describe('getChatCompletion (before initialization)', () => {
  it('throws when no provider has been initialized', async () => {
    await expect(getChatCompletion('hello')).rejects.toThrow(
      'AI provider not initialized'
    );
  });
});

describe('initializeAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessImage.mockResolvedValue('mock image analysis');
  });

  it('returns false when apiKey is empty', () => {
    expect(initializeAI('openai', '')).toBe(false);
    expect(initializeAI('claude', '')).toBe(false);
  });

  it('returns true for provider=openai with a non-empty key', () => {
    expect(initializeAI('openai', 'sk-test-openai')).toBe(true);
  });

  it('returns true for provider=claude with a non-empty key', () => {
    expect(initializeAI('claude', 'sk-test-anthropic')).toBe(true);
  });
});

describe('getChatCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessImage.mockResolvedValue('mock image analysis');
  });

  // ─────────────────────────────────────────
  // OpenAI provider
  // ─────────────────────────────────────────
  describe('OpenAI provider', () => {
    beforeEach(() => {
      initializeAI('openai', 'sk-openai');
    });

    it('returns the assistant message on success', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello from GPT' } }],
      });

      const reply = await getChatCompletion('Hi there');
      expect(reply).toBe('Hello from GPT');
    });

    it('returns fallback text when choices content is null', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const reply = await getChatCompletion('Hi');
      expect(reply).toBe('Sorry, I could not process your request.');
    });

    it('throws "Invalid OpenAI API key" on 401', async () => {
      const err: any = new Error('Unauthorized');
      err.status = 401;
      mockOpenAICreate.mockRejectedValueOnce(err);

      await expect(getChatCompletion('Hi')).rejects.toThrow('Invalid OpenAI API key');
    });

    it('propagates the error message on generic failure', async () => {
      const err: any = new Error('rate limited');
      mockOpenAICreate.mockRejectedValueOnce(err);

      await expect(getChatCompletion('Hi')).rejects.toThrow('rate limited');
    });

    it('includes image analysis in the message when an image is provided', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'GPT image response' } }],
      });

      const fakeFile = new File(['img'], 'test.png', { type: 'image/png' });
      const reply = await getChatCompletion('Describe this', fakeFile);

      expect(reply).toBe('GPT image response');
      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const messages: any[] = callArgs.messages;
      const userMsg = messages[messages.length - 1];
      expect(userMsg.content).toContain('mock image analysis');
      expect(userMsg.content).toContain('Describe this');
    });
  });

  // ─────────────────────────────────────────
  // Claude provider
  // ─────────────────────────────────────────
  describe('Claude provider', () => {
    beforeEach(() => {
      initializeAI('claude', 'sk-anthropic');
    });

    it('returns the assistant message on success', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ text: 'Hello from Claude' }],
      });

      const reply = await getChatCompletion('Hi there');
      expect(reply).toBe('Hello from Claude');
    });

    it('throws "Invalid Claude API key" on 401', async () => {
      const err: any = new Error('Unauthorized');
      err.status = 401;
      mockAnthropicCreate.mockRejectedValueOnce(err);

      await expect(getChatCompletion('Hi')).rejects.toThrow('Invalid Claude API key');
    });

    it('throws access denied message on 403', async () => {
      const err: any = new Error('Forbidden');
      err.status = 403;
      mockAnthropicCreate.mockRejectedValueOnce(err);

      await expect(getChatCompletion('Hi')).rejects.toThrow(
        'Access denied. Please check your Claude API key permissions.'
      );
    });

    it('throws connectivity message when fetch fails', async () => {
      const err: any = new Error('Failed to fetch');
      mockAnthropicCreate.mockRejectedValueOnce(err);

      await expect(getChatCompletion('Hi')).rejects.toThrow(
        'Unable to connect to Claude API'
      );
    });

    it('includes image analysis in message when image is provided', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ text: 'Analyzed image response' }],
      });

      const fakeFile = new File(['img'], 'test.png', { type: 'image/png' });
      const reply = await getChatCompletion('Describe this', fakeFile);

      expect(reply).toBe('Analyzed image response');
      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      const lastMessage = callArgs.messages[callArgs.messages.length - 1];
      expect(lastMessage.content).toContain('mock image analysis');
      expect(lastMessage.content).toContain('Describe this');
    });
  });
});
