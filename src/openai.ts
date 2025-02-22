import { LLMOptions, LLMResponse } from './types/llm';

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const sendMessage = async (
  apiKey: string, 
  message: string, 
  options: LLMOptions = {},
  organizationId?: string
): Promise<string> => {
  const requestBody = {
    model: "gpt-4", // To będzie nadpisane przez modelVersion
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(organizationId && { 'OpenAI-Organization': organizationId }),
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Error sending message to OpenAI API:', error);
    throw error;
  }
}; 