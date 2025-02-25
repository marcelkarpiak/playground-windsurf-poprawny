export interface AssistantDB {
  id: string;
  created_at: string;
  name: string;
  instructions: string;
  model: string;
  model_version: string;
  api_key: string;
  organization_id?: string;
  max_tokens: number;
  temperature: number;
  welcome_message?: string;
  knowledge_base?: {
    name: string;
    content: string;
  }[];
} 