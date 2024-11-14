import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string): boolean => {
  try {
    if (!apiKey) {
      openaiClient = null;
      return false;
    }

    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    openaiClient = null;
    return false;
  }
};

export const getChatCompletion = async (message: string): Promise<string> => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please set a valid API key.');
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: 'gpt-3.5-turbo',
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';
  } catch (error: any) {
    console.error('Error calling OpenAI:', error);
    if (error?.status === 401) {
      throw new Error('Invalid API key. Please check your API key and try again.');
    }
    throw new Error(error?.message || 'Failed to get response from OpenAI.');
  }
};