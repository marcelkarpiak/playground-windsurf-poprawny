export interface ModelConfig {
  id: string
  name: string
  requires: string[]
  baseUrl: string
  apiKey?: string // Make apiKey optional
  organizationId?: string // Make organizationId optional
  version?: string // Make version optional
  versions?: { id: string; name: string }[] // Add versions array
  testEndpoint?: string
  testMethod?: string
  getHeaders?: (config: any) => any
  getBody?: () => any
}

export const models: ModelConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    requires: ['apiKey'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    versions: [
      { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2-pro', name: 'Gemini 2.0 Pro' },
      { id: 'gemini-2-flash-experimental', name: 'Gemini 2.0 Flash Thinking Experimental' },
      { id: 'gemma-2', name: 'Gemma 2' }
    ],
    testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    testMethod: 'POST',
    getHeaders: (config) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey
    }),
    getBody: () => ({
      contents: [
        {
          parts: [
            {
              text: "Hello",
            },
          ],
        },
      ]
    }),
  },
  {
    id: 'openai',
    name: 'OpenAI',
    requires: ['apiKey', 'organizationId'],
    baseUrl: 'https://api.openai.com',
    versions: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' }
    ],
    testEndpoint: 'https://api.openai.com/v1/models',
    testMethod: 'GET',
    getHeaders: (config) => ({
      'Authorization': `Bearer ${config.apiKey}`,
      'OpenAI-Organization': config.organizationId
    }),
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    requires: ['apiKey'],
    baseUrl: 'https://api.anthropic.com',
    versions: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku' }
    ],
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    testMethod: 'POST',
    getHeaders: (config) => ({
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }),
    getBody: () => ({
      model: "claude-3-opus-20240229",
      messages: [{ role: "user", content: "Hello" }]
    }),
  }
];
