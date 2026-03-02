import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks – registered before the module under test is imported
// ---------------------------------------------------------------------------
const mockOpenAICreate = vi.fn();
const mockClaudeCreate = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return { chat: { completions: { create: mockOpenAICreate } } };
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockClaudeCreate } };
  }),
}));

vi.mock('../image-processor', () => ({
  processImage: vi.fn().mockResolvedValue('[image analysis result]'),
}));

import { initializeAI, getChatCompletion } from '../ai-providers';
import { processImage } from '../image-processor';

// ---------------------------------------------------------------------------
// initializeAI
// ---------------------------------------------------------------------------

describe('initializeAI', () => {
  it('returns false for an empty API key', () => {
    expect(initializeAI('openai', '')).toBe(false);
    expect(initializeAI('claude', '')).toBe(false);
  });

  it('returns true for a valid OpenAI key', () => {
    expect(initializeAI('openai', 'sk-test')).toBe(true);
  });

  it('returns true for a valid Claude key', () => {
    expect(initializeAI('claude', 'sk-ant-test')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – shared
// ---------------------------------------------------------------------------

describe('getChatCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when AI provider has not been initialized', async () => {
    // Reset module registry so config singleton starts as null in the fresh import
    vi.resetModules();
    const { getChatCompletion: freshGet } = await import('../ai-providers');
    await expect(freshGet('hi')).rejects.toThrow('AI provider not initialized');
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – OpenAI provider
// ---------------------------------------------------------------------------

describe('getChatCompletion (openai)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeAI('openai', 'sk-test');
  });

  it('returns assistant message', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello from OpenAI' } }],
    });

    const result = await getChatCompletion('ping');
    expect(result).toBe('Hello from OpenAI');
  });

  it('falls back to default message when content is null', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await getChatCompletion('ping');
    expect(result).toBe('Sorry, I could not process your request.');
  });

  it('throws "Invalid OpenAI API key" on 401', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockOpenAICreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow('Invalid OpenAI API key');
  });

  it('prepends image analysis to message when image is provided', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    const fakeImage = new File(['data'], 'test.png', { type: 'image/png' });
    await getChatCompletion('describe this', fakeImage);

    expect(processImage).toHaveBeenCalledWith(fakeImage);
    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('[image analysis result]'),
          }),
        ]),
      })
    );
  });

  it('falls back to unavailable message when image processing fails', async () => {
    (processImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('canvas unavailable')
    );
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    const fakeImage = new File(['data'], 'test.png', { type: 'image/png' });
    await getChatCompletion('describe this', fakeImage);

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('[Image analysis unavailable]'),
          }),
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – Claude provider
// ---------------------------------------------------------------------------

describe('getChatCompletion (claude)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeAI('claude', 'sk-ant-test');
  });

  it('returns assistant message from Claude', async () => {
    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ text: 'Hello from Claude' }],
    });

    const result = await getChatCompletion('ping');
    expect(result).toBe('Hello from Claude');
  });

  it('throws "Invalid Claude API key" on 401', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow('Invalid Claude API key');
  });

  it('throws access denied message on 403', async () => {
    const err = Object.assign(new Error('Forbidden'), { status: 403 });
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow(
      'Access denied'
    );
  });

  it('throws connectivity message when "Failed to fetch" appears in error', async () => {
    const err = Object.assign(new Error('Failed to fetch'), { status: 0 });
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('hi')).rejects.toThrow(
      'Unable to connect to Claude API'
    );
  });

  it('prepends image analysis to Claude message when image is provided', async () => {
    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ text: 'image described' }],
    });

    const fakeImage = new File(['data'], 'test.png', { type: 'image/png' });
    await getChatCompletion('describe this', fakeImage);

    expect(processImage).toHaveBeenCalledWith(fakeImage);
    expect(mockClaudeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('[image analysis result]'),
          }),
        ]),
      })
    );
  });
});
