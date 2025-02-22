export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  error?: string;
} 