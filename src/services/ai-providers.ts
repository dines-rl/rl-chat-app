import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { processImage } from './image-processor';

export type AIProvider = 'openai' | 'claude';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let config: AIConfig | null = null;
let openaiClient: OpenAI | null = null;
let claudeClient: Anthropic | null = null;
let messageHistory: ChatMessage[] = [];

const SYSTEM_PROMPT = `You are a helpful AI assistant specializing in software development and debugging. You can use special tools to enhance your responses:

1. To create diagrams, wrap Mermaid syntax in \`\`\`mermaid blocks
2. To create runnable code examples, use \`\`\`jsx live blocks
3. To highlight specific code, use regular \`\`\`language blocks
4. To create tables, use markdown table syntax
5. To create math equations, wrap them in $$ blocks

When analyzing images:
- Focus on identifying potential software bugs, UI/UX issues, and error messages
- Provide specific technical recommendations for fixes
- Consider both visual and functional aspects of the interface
- Reference specific elements and their states in the interface`;

export const initializeAI = (provider: AIProvider, apiKey: string): boolean => {
  try {
    if (!apiKey) return false;

    config = { provider, apiKey };
    messageHistory = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (provider === 'openai') {
      openaiClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    } else {
      claudeClient = new Anthropic({
        apiKey
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing AI client:', error);
    config = null;
    openaiClient = null;
    claudeClient = null;
    messageHistory = [];
    return false;
  }
};

const getClaudeCompletion = async (message: string, image?: File): Promise<string> => {
  if (!claudeClient) {
    throw new Error('Claude client not initialized');
  }

  try {
    const messages = messageHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    let content = message;
    if (image) {
      try {
        const imageAnalysis = await processImage(image);
        content = `${imageAnalysis}\n\nUser Message: ${message}`;
      } catch (error) {
        console.error('Image analysis failed:', error);
        content = `[Image analysis unavailable]\n\nUser Message: ${message}`;
      }
    }

    const response = await claudeClient.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [...messages, { role: 'user', content }]
    });

    const assistantResponse = response.content[0].text;
    messageHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantResponse }
    );

    return assistantResponse;
  } catch (error: any) {
    console.error('Claude API Error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid Claude API key');
    }
    
    if (error.status === 403) {
      throw new Error('Access denied. Please check your Claude API key permissions.');
    }

    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to Claude API. Please check your internet connection and try again.');
    }
    
    throw new Error(error.message || 'An unexpected error occurred while connecting to Claude API');
  }
};

const getOpenAICompletion = async (message: string, image?: File): Promise<string> => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    let messages: ChatMessage[] = [...messageHistory];
    
    if (image) {
      try {
        const imageAnalysis = await processImage(image);
        messages.push({ role: 'user', content: `${imageAnalysis}\n\nUser Message: ${message}` });
      } catch (error) {
        console.error('Image analysis failed:', error);
        messages.push({ role: 'user', content: `[Image analysis unavailable]\n\nUser Message: ${message}` });
      }
    } else {
      messages.push({ role: 'user', content: message });
    }

    const completion = await openaiClient.chat.completions.create({
      messages: messages as any,
      model: 'gpt-4-0125-preview',
      max_tokens: 4000,
    });

    const assistantResponse = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';
    messageHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantResponse }
    );

    return assistantResponse;
  } catch (error: any) {
    if (error?.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    throw new Error(error?.message || 'Failed to get response from OpenAI');
  }
};

export const getChatCompletion = async (message: string, image?: File): Promise<string> => {
  if (!config) {
    throw new Error('AI provider not initialized. Please set a valid API key.');
  }

  return config.provider === 'openai' 
    ? getOpenAICompletion(message, image)
    : getClaudeCompletion(message, image);
};