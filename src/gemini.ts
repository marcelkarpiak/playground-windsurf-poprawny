import { LLMOptions } from './types/llm';

const generateUrl = (version: string, model: string, apiKey: string) => 
  `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessage = async (apiKey: string, message: string, options: LLMOptions = {}) => {
  const versions = ['v1', 'v1beta'];
  const models = ['gemini-pro', 'gemini-1.5-pro'];
  let lastError = null;

  for (const version of versions) {
    for (const model of models) {
      let retries = 0;
      
      while (retries < MAX_RETRIES) {
        try {
          const url = generateUrl(version, model, apiKey);
          console.log(`Trying Gemini API with ${version}/${model} (attempt ${retries + 1}/${MAX_RETRIES})`);

          // Prepare system message with instructions and knowledge base
          let systemMessage = `${options.instructions || "You are a helpful assistant."}\n\n`;
          
          const knowledgeBase = options.knowledgeBase || [];
          if (knowledgeBase.length > 0) {
            systemMessage += "You have access to the following knowledge base documents:\n";
            knowledgeBase.forEach(kb => {
              systemMessage += `\n=== START OF DOCUMENT: ${kb.name} ===\n${kb.content}\n=== END OF DOCUMENT: ${kb.name} ===\n`;
            });
          }

          // Prepare request body
          const requestBody = {
            contents: [{
              parts: [{
                text: `${systemMessage}\n\nCurrent question: ${message}`
              }]
            }],
            generationConfig: {
              maxOutputTokens: options.maxTokens || 1000,
              temperature: options.temperature || 0.7,
              topP: 0.8,
              topK: 40
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
            const error = new Error(
              `Gemini API error: ${response.status} - ${
                data.error?.message || 'Unknown error'
              }`
            ) as Error & { status?: number };
            error.status = response.status;
            throw error;
          }

          // Jeśli zapytanie się powiodło, zwróć wynik
          return data.candidates[0].content.parts[0].text;
        } catch (error: any) {
          console.warn(`Failed with ${version}/${model} (attempt ${retries + 1}):`, error);
          
          // Sprawdź czy warto ponawiać próbę
          if (error.status === 503 && retries < MAX_RETRIES - 1) {
            retries++;
            const delay = RETRY_DELAY * retries;
            console.log(`Service unavailable, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          
          // Zapisz błąd i spróbuj następnej kombinacji wersji/modelu
          lastError = error;
          break;
        }
      }
    }
  }

  // Jeśli wszystkie próby zawiodły, rzuć ostatni błąd
  console.error('All Gemini API attempts failed:', lastError);
  throw lastError || new Error('Failed to connect to Gemini API');
};
