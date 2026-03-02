import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock functions so they can be referenced inside vi.mock factories
// ---------------------------------------------------------------------------
const { mockOpenAICreate, mockClaudeCreate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
  mockClaudeCreate: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockOpenAICreate } };
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockClaudeCreate };
  },
}));

vi.mock('../image-processor', () => ({
  processImage: vi.fn().mockResolvedValue('Mocked image analysis'),
}));

// Import AFTER mocks are in place
import { initializeAI, getChatCompletion } from '../ai-providers';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// initializeAI
// ---------------------------------------------------------------------------
describe('initializeAI', () => {
  it('returns false when an empty apiKey is provided', () => {
    expect(initializeAI('openai', '')).toBe(false);
  });

  it('returns true for a valid OpenAI apiKey', () => {
    expect(initializeAI('openai', 'sk-test-key')).toBe(true);
  });

  it('returns true for a valid Claude apiKey', () => {
    expect(initializeAI('claude', 'sk-ant-test-key')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – not initialized
// ---------------------------------------------------------------------------
describe('getChatCompletion – not initialized', () => {
  it('throws when called on a freshly imported module with no initializeAI call', async () => {
    // Reset module registry so ai-providers starts with config = null
    vi.resetModules();
    const { getChatCompletion: freshGetChatCompletion } = await import('../ai-providers');

    await expect(freshGetChatCompletion('Hello')).rejects.toThrow(
      'AI provider not initialized. Please set a valid API key.'
    );
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – OpenAI path
// ---------------------------------------------------------------------------
describe('getChatCompletion – OpenAI', () => {
  beforeEach(() => {
    initializeAI('openai', 'sk-test-key');
  });

  it('returns the assistant message text from OpenAI', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello from OpenAI!' } }],
    });

    const result = await getChatCompletion('Hi');
    expect(result).toBe('Hello from OpenAI!');
  });

  it('falls back to default message when choices are empty', async () => {
    mockOpenAICreate.mockResolvedValueOnce({ choices: [] });

    const result = await getChatCompletion('Hi');
    expect(result).toBe('Sorry, I could not process your request.');
  });

  it('throws "Invalid OpenAI API key" on 401', async () => {
    const err: any = new Error('Unauthorized');
    err.status = 401;
    mockOpenAICreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow('Invalid OpenAI API key');
  });

  it('throws a generic error for other failures', async () => {
    const err: any = new Error('Rate limited');
    mockOpenAICreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow('Rate limited');
  });

  it('prepends image analysis when an image is provided', async () => {
    const { processImage } = await import('../image-processor');
    (processImage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Image data here');

    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Analyzed!' } }],
    });

    const fakeFile = new File(['data'], 'screenshot.png', { type: 'image/png' });
    const result = await getChatCompletion('Describe this', fakeFile);
    expect(result).toBe('Analyzed!');
    expect(processImage).toHaveBeenCalledWith(fakeFile);
  });

  it('uses gpt-4-0125-preview as the OpenAI model', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    await getChatCompletion('Hello');

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4-0125-preview' })
    );
  });

  it('falls back to [Image analysis unavailable] when processImage throws', async () => {
    const { processImage } = await import('../image-processor');
    (processImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Canvas error')
    );

    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    const fakeFile = new File(['data'], 'screenshot.png', { type: 'image/png' });
    await getChatCompletion('Describe this', fakeFile);

    const calledMessages: any[] = mockOpenAICreate.mock.calls[0][0].messages;
    const userMsg = calledMessages.find((m: any) => m.role === 'user');
    expect(userMsg.content).toContain('[Image analysis unavailable]');
  });
});

// ---------------------------------------------------------------------------
// getChatCompletion – Claude path
// ---------------------------------------------------------------------------
describe('getChatCompletion – Claude', () => {
  beforeEach(() => {
    initializeAI('claude', 'sk-ant-test-key');
  });

  it('returns the assistant message text from Claude', async () => {
    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ text: 'Hello from Claude!' }],
    });

    const result = await getChatCompletion('Hi');
    expect(result).toBe('Hello from Claude!');
  });

  it('throws "Invalid Claude API key" on 401', async () => {
    const err: any = new Error('Unauthorized');
    err.status = 401;
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow('Invalid Claude API key');
  });

  it('throws access denied message on 403', async () => {
    const err: any = new Error('Forbidden');
    err.status = 403;
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow(
      'Access denied. Please check your Claude API key permissions.'
    );
  });

  it('throws network error message when fetch fails', async () => {
    const err: any = new Error('Failed to fetch');
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow(
      'Unable to connect to Claude API'
    );
  });

  it('prepends image analysis when an image is provided', async () => {
    const { processImage } = await import('../image-processor');
    (processImage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Image data here');

    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ text: 'Claude analyzed it!' }],
    });

    const fakeFile = new File(['data'], 'screenshot.png', { type: 'image/png' });
    const result = await getChatCompletion('Describe this', fakeFile);
    expect(result).toBe('Claude analyzed it!');
    expect(processImage).toHaveBeenCalledWith(fakeFile);
  });

  it('uses claude-3-opus-20240229 as the Claude model', async () => {
    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ text: 'ok' }],
    });

    await getChatCompletion('Hello');

    expect(mockClaudeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-opus-20240229' })
    );
  });

  it('falls back to [Image analysis unavailable] when processImage throws', async () => {
    const { processImage } = await import('../image-processor');
    (processImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Canvas error')
    );

    mockClaudeCreate.mockResolvedValueOnce({ content: [{ text: 'ok' }] });

    const fakeFile = new File(['data'], 'screenshot.png', { type: 'image/png' });
    await getChatCompletion('Describe this', fakeFile);

    const calledMessages: any[] = mockClaudeCreate.mock.calls[0][0].messages;
    const userMsg = calledMessages[calledMessages.length - 1];
    expect(userMsg.content).toContain('[Image analysis unavailable]');
  });

  it('re-throws generic Claude errors with their original message', async () => {
    const err: any = new Error('Internal server error');
    // no .status property → falls through to the generic re-throw
    mockClaudeCreate.mockRejectedValueOnce(err);

    await expect(getChatCompletion('Hi')).rejects.toThrow('Internal server error');
  });

  it('accumulates message history across multiple turns', async () => {
    mockClaudeCreate
      .mockResolvedValueOnce({ content: [{ text: 'Reply A' }] })
      .mockResolvedValueOnce({ content: [{ text: 'Reply B' }] });

    await getChatCompletion('Turn 1');
    await getChatCompletion('Turn 2');

    // Second call should include the prior user+assistant exchange in messages
    const secondCallMessages: any[] = mockClaudeCreate.mock.calls[1][0].messages;
    const contents = secondCallMessages.map((m: any) => m.content);
    expect(contents).toContain('Turn 1');
    expect(contents).toContain('Reply A');
    expect(contents).toContain('Turn 2');
  });
});
