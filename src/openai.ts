import { LLMOptions, LLMResponse } from './types/llm';

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const sendMessage = async (
  apiKey: string, 
  message: string, 
  options: LLMOptions = {},
  organizationId?: string
): Promise<string> => {
  console.log('OpenAI received options:', {
    hasInstructions: !!options.instructions,
    hasKnowledgeBase: options.knowledgeBase?.length > 0,
    knowledgeBaseSize: options.knowledgeBase?.length || 0,
    knowledgeBasePreview: options.knowledgeBase?.[0]?.content?.substring(0, 100)
  });

  // Prepare simple system message
  let systemMessage = `${options.instructions || "You are a helpful assistant."}\n\nIMPORTANT: You are having a conversation. You must maintain context between messages. When you see pronouns like 'he', 'she', 'it', 'they', refer to the most recently discussed subject.\n\n`;
  
  // Add knowledge base with strong emphasis
  if (options.knowledgeBase && options.knowledgeBase.length > 0) {
    systemMessage += "KNOWLEDGE BASE (YOU MUST USE THIS INFORMATION):\n";
    
    options.knowledgeBase.forEach(kb => {
      systemMessage += `\n=== START OF DOCUMENT: ${kb.name} ===\n${kb.content}\n=== END OF DOCUMENT: ${kb.name} ===\n`;
    });
    
    systemMessage += `\nKNOWLEDGE BASE USAGE RULES:\n` +
      `1. You MUST check the knowledge base FIRST before answering any question.\n` +
      `2. If the knowledge base contains relevant information, you MUST use it.\n` +
      `3. Only use your general knowledge if the knowledge base does not contain the answer.\n` +
      `4. When using knowledge base information, cite it clearly.\n`;
  }

  const enhancedSystemMessage = systemMessage;

  // Prepare messages array with enhanced context management
  const messages = [
    {
      role: "system",
      content: enhancedSystemMessage
    }
  ];

  // Add the complete conversation history
  if (options.conversationHistory) {
    messages.push(...options.conversationHistory);
  }

  // Add the current message
  messages.push({
    role: "user",
    content: message
  });

  const requestBody = {
    model: options.modelVersion || "gpt-4",
    messages: messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
  };

  console.log('OpenAI request preview:', {
    model: requestBody.model,
    messageCount: messages.length,
    systemMessagePreview: messages[0].content.substring(0, 200) + '...',
    lastUserMessage: messages[messages.length - 1].content
  });

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