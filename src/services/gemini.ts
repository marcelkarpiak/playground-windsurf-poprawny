import { LLMOptions } from '../types/llm';

export const sendMessage = async (message: string, apiKey: string, options: LLMOptions = {}) => {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

    // Start with base instructions
    let prompt = options.instructions ? `${options.instructions}\n\n` : '';

    // Add conversation history first
    if (options.conversationHistory?.length) {
      prompt += options.conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      prompt += '\n\n';
    }

    // Add the current question
    prompt += `User: ${message}\n\n`;

    // Add any specific knowledge after the question
    if (options.knowledgeBase?.length) {
      prompt += `Note: You may find this additional information useful, but feel free to use your general knowledge as well:\n`;
      prompt += options.knowledgeBase
        .map(kb => kb.content)
        .join('\n');
    }



    // Log the prompt structure
    console.log('Prompt components:', {
      hasInstructions: !!options.instructions,
      hasKnowledgeBase: options.knowledgeBase?.length > 0,
      knowledgeBaseItems: options.knowledgeBase?.length || 0,
      hasConversationHistory: options.conversationHistory?.length > 0,
      historyMessages: options.conversationHistory?.length || 0
    });

    // Log a preview of the prompt
    console.log('Prompt preview:', prompt.substring(0, 500) + '...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}; 