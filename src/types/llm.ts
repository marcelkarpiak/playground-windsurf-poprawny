export interface Message {
  role: string;
  content: string;
  timestamp?: string;
  contextRef?: string;
  entities?: string[];
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  modelVersion?: string;
  instructions?: string;
  knowledgeBase?: {
    name: string;
    content: string;
  }[];
  conversationHistory?: Message[];
  currentContext?: {
    entities: string[];
    lastTopic?: string;
    lastEntityMentioned?: string;
  };
}

export interface LLMResponse {
  content: string;
  error?: string;
} 