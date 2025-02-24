import React, { useState, useEffect, useRef } from 'react'
import { sendMessage as geminiSendMessage } from '../services/gemini'
import { sendMessage as openaiSendMessage } from '../openai'
import { sendMessage as anthropicSendMessage } from '../anthropic'
import { TypingIndicator } from './TypingIndicator'
import { LLMOptions } from '../types/llm'

interface ChatInterfaceProps {
  assistantName: string
  instructions: string
  apiKey: string
  knowledgeBase: { name: string; content: string }[];
  onSaveInstructions: (instructions: string) => void
  maxTokens: number
  temperature: number
  model: string
  modelVersion: string
  welcomeMessage?: string;
}

// Dodaj typ dla odpowiedzi z API
interface ApiResponse {
  response?: string;
  message?: string;
  choices?: Array<{message: {content: string}}>;
  completion?: string;
  error?: string;
}

// Dodajmy też interfejs dla konfiguracji
interface APIConfig {
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  assistantName,
  instructions,
  apiKey,
  knowledgeBase,
  onSaveInstructions,
  maxTokens,
  temperature,
  model,
  modelVersion,
  welcomeMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentContext, setCurrentContext] = useState<{
    entities: string[];
    lastTopic?: string;
    lastEntityMentioned?: string;
  }>({ entities: [] })
  const [localKnowledgeBase, setLocalKnowledgeBase] = useState(knowledgeBase)

  // Keep local knowledge base in sync with props
  useEffect(() => {
    console.log('Knowledge base prop changed:', knowledgeBase);
    setLocalKnowledgeBase(knowledgeBase);
  }, [knowledgeBase])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  useEffect(() => {
    if (welcomeMessage) {
      setMessages([{
        role: 'assistant',
        content: welcomeMessage
      }]);
    }
  }, [welcomeMessage]);

  const sendMessageToSelectedAPI = async (message: string, options: LLMOptions) => {
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    console.log('Sending message to API:', {
      model,
      hasKey: !!apiKey,
      keyLength: apiKey.length,
      knowledgeBaseSize: options.knowledgeBase?.length || 0,
      knowledgeBase: options.knowledgeBase?.map(kb => ({
        name: kb.name,
        contentLength: kb.content.length,
        preview: kb.content.substring(0, 100) + '...'
      })),
      instructions: options.instructions?.substring(0, 100) + '...'
    });

    let response;
    if (model === 'gemini') {
      response = await geminiSendMessage(message, apiKey, options);
    } else if (model === 'openai') {
      response = await openaiSendMessage(apiKey, message, options);
    } else if (model === 'anthropic') {
      response = await anthropicSendMessage(apiKey, message, options);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }



    return response;

    throw new Error(`Unsupported model: ${model}`);
  };

  // Function to extract entities from text
  const extractEntities = (text: string): string[] => {
    const words = text.split(/\s+/);
    return words
      .filter(word => word.match(/^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*$/))
      .filter(word => word.length > 1); // Filter out single letters
  };

  // Function to update context based on message
  const updateContext = (message: string) => {
    const newEntities = extractEntities(message);
    setCurrentContext(prev => ({
      entities: [...new Set([...prev.entities, ...newEntities])],
      lastTopic: newEntities.length > 0 ? newEntities[newEntities.length - 1] : prev.lastTopic,
      lastEntityMentioned: newEntities.length > 0 ? newEntities[newEntities.length - 1] : prev.lastEntityMentioned
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
      setError('API key is missing. Please configure the model first.');
      return;
    }

    // Create simple user message
    const userMessage: Message = { 
      role: 'user', 
      content: input
    };

    // Update messages state with new message
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      // Validate and format knowledge base
      const formattedKnowledgeBase = Array.isArray(localKnowledgeBase) 
        ? localKnowledgeBase.filter(kb => kb?.name && kb?.content)
        : [];

      console.log('Knowledge base:', {
        size: formattedKnowledgeBase.length,
        items: formattedKnowledgeBase
      });

      // Prepare base instructions
      const baseInstructions = `${instructions}\n\nYou have extensive knowledge about basketball, including players, teams, history, and statistics. You should freely use this knowledge to answer questions.\n\nIf any additional context is provided and relevant to the question, you can incorporate it into your answer. But don't feel constrained by this context - your general knowledge is equally valuable.`;

      // Prepare options
      const options: LLMOptions = {
        maxTokens,
        temperature,
        modelVersion: modelVersion || 'gpt-3.5-turbo',
        instructions: baseInstructions,
        knowledgeBase: formattedKnowledgeBase,
        conversationHistory: messages
      };

      const response = await sendMessageToSelectedAPI(input, options);
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessage = (content: string) => {
    // Podziel tekst na paragrafy
    const paragraphs = content.split('\n').filter(p => p.trim() !== '');
    
    return (
      <>
        {paragraphs.map((paragraph, index) => {
          // Sprawdź czy to lista
          if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
            return (
              <li key={index} className="ml-4 mb-2">
                {paragraph.substring(2)}
              </li>
            );
          }
          // Sprawdź czy to nagłówek
          if (paragraph.startsWith('#')) {
            const level = paragraph.match(/^#+/)[0].length;
            const text = paragraph.replace(/^#+\s/, '');
            const className = `text-${['xl', 'lg', 'md'][level - 1] || 'base'} font-bold mb-2`;
            return <h3 key={index} className={className}>{text}</h3>;
          }
          // Zwykły paragraf
          return (
            <p key={index} className="mb-2">
              {paragraph}
            </p>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex-1 p-4 flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            <div className="font-bold mb-2">
              {message.role === 'user' ? 'You: ' : `${assistantName}: `}
            </div>
            <div className="text-base leading-relaxed">
              {formatMessage(message.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-4 p-4 rounded-lg bg-gray-800 text-gray-200">
            <div className="font-bold mb-2">{assistantName}: </div>
            <div className="flex items-center h-8">
              <TypingIndicator />
            </div>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-700 text-white">
            <strong>Error: </strong> {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex">
        <textarea
          className="flex-1 p-2 border rounded-l-md bg-gray-700 text-white focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-md"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatInterface
