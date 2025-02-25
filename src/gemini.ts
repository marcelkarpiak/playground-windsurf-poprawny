import { LLMOptions } from './types/llm';

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const sendMessage = async (apiKey: string, message: string, options: LLMOptions = {}) => {
  try {
    const url = `${API_ENDPOINT}?key=${apiKey}`;
    
    // Prepare system message with instructions and knowledge base
    let systemMessage = `${options.instructions || "You are a helpful assistant."}\n\n`;
    
    // If there's a knowledge base, format it as a structured reference document
    if (options.knowledgeBase && options.knowledgeBase.length > 0) {
      systemMessage += "You have access to the following knowledge base documents:\n";
      
      options.knowledgeBase.forEach(kb => {
        systemMessage += `\n=== START OF DOCUMENT: ${kb.name} ===\n${kb.content}\n=== END OF DOCUMENT: ${kb.name} ===\n`;
      });
      
      systemMessage += `\n\nIMPORTANT INSTRUCTIONS FOR USING KNOWLEDGE BASE:\n
1. ALWAYS use the information from the knowledge base documents when answering questions
2. If a question can be answered using the knowledge base, provide a detailed answer based on that information
3. Maintain context between messages - if a follow-up question refers to something mentioned earlier, use that context
4. If you can't find relevant information in the knowledge base, use your general knowledge but clearly indicate this
5. If you're using information from a specific document, mention which document you're referencing
6. Format your responses in a clear and structured way`;
    }

    // Process conversation history to extract context and entities
    let conversationContext = "";
    let contextEntities = new Set<string>();
    
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      // Get last 10 messages for better context
      const recentMessages = options.conversationHistory.slice(-10);
      
      // Extract potential entities (proper nouns) from conversation
      recentMessages.forEach(msg => {
        const words = msg.content.split(' ');
        words.forEach(word => {
          if (word.match(/^[A-Z][a-z]+/)) {
            contextEntities.add(word);
          }
        });
      });
      
      conversationContext = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      // Enhance system message with context and entities
      systemMessage = `${systemMessage}\n\n` +
        `Recent conversation context:\n${conversationContext}\n\n` +
        `Current context entities: ${Array.from(contextEntities).join(', ')}\n\n` +
        `CRITICAL INSTRUCTIONS FOR MAINTAINING CONTEXT:\n` +
        `1. You MUST maintain conversation context. When you see pronouns like 'he', 'she', 'they', 'it', always refer to the most recently discussed entities.\n` +
        `2. The current conversation involves these key entities: ${Array.from(contextEntities).join(', ')}. Use this context for resolving pronouns.\n` +
        `3. For questions like 'What about X?' or 'What did they do?', always reference the context from previous messages.\n` +
        `4. If a question seems incomplete, look at the previous messages to understand what it's referring to.\n` +
        `5. Be concise but informative in your responses.\n` +
        `6. When using the knowledge base, explicitly mention which document you're referencing.\n` +
        `7. Use the knowledge base as your primary source of information`;
    }

    // Prepare request with enhanced context management
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${systemMessage}\n\nCurrent question: ${message}\n\nRemember to:\n1. Answer based on the knowledge base when possible\n2. Maintain conversation context\n3. Be specific about which document you're referencing`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        topP: 0.8, // Add some randomness while maintaining coherence
        topK: 40,  // Limit vocabulary diversity for more focused responses
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
