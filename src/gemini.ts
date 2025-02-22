// src/gemini.ts

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Wspólny interfejs dla wszystkich LLM
interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

export const sendMessage = async (apiKey: string, message: string, options: LLMOptions = {}) => {
  try {
    // Dodaj klucz API jako parametr URL
    const url = `${API_ENDPOINT}?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} - ${
          data.error?.message || 'Unknown error'
        }`
      );
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};
