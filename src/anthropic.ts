import { LLMOptions, LLMResponse } from './types/llm';

const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export const sendMessage = async (
  apiKey: string, 
  message: string, 
  options: LLMOptions = {}
): Promise<string> => {
  const requestBody = {
    model: "claude-3-opus-20240229", // To będzie nadpisane przez modelVersion
    messages: [
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    return data.content[0].text;
  } catch (error: any) {
    console.error('Error sending message to Anthropic API:', error);
    throw error;
  }
}; 