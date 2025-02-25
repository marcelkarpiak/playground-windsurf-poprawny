import React, { useState, useEffect } from 'react'
import './index.css'
import ChatInterface from './components/ChatInterface'
import AssistantConfigurationPanel from './components/AssistantConfigurationPanel'
import AssistantLibrary from './components/AssistantLibrary'
import Toast from './components/Toast'
import { assistantService } from './services/assistantService'
import { supabase } from './config/supabase'

interface AssistantDB {
  id: string
  created_at: string
  name: string
  instructions: string
  model: string
  model_version: string
  api_key: string
  organization_id?: string
  max_tokens: number
  temperature: number
  knowledge_base: { name: string; content: string }[]
  welcome_message?: string
}

interface Assistant {
  id: string
  name: string
  instructions: string
  model: string
  model_version: string
  api_key: string
  organization_id?: string
  max_tokens: number
  temperature: number
  knowledge_base: { name: string; content: string }[]
  welcome_message?: string
}

const App: React.FC = () => {
  const [view, setView] = useState<'library' | 'assistant'>('library')
  const [assistants, setAssistants] = useState<AssistantDB[]>([])
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null)
  const [knowledgeBase, setKnowledgeBase] = useState<{ name: string; content: string }[]>([])
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAssistants()
  }, [])

  const fetchAssistants = async () => {
    console.log('Fetching assistants from Supabase...');
    const { data, error } = await supabase.from('assistants').select('*');
    
    if (error) {
      console.error('Error fetching assistants:', error);
      return;
    }
    
    console.log('Fetched assistants:', data);
    setAssistants(data || []);
  }

  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('assistants').select('*').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful:', data);
    }
  };

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const handleAddAssistant = () => {
    const newAssistant: Assistant = {
      id: String(Date.now()),
      name: '',
      instructions: '',
      model: '',
      model_version: '',
      api_key: '',
      organization_id: '',
      max_tokens: 1024,
      temperature: 0.7,
      knowledge_base: [],
      welcome_message: '',
    };

    console.log('Creating new assistant:', newAssistant);
    setCurrentAssistant(newAssistant);
    setTimeout(() => {
      setView('assistant');
    }, 0);
  };

  const handleSelectAssistant = (assistant: AssistantDB) => {
    const selectedAssistant: Assistant = {
      id: assistant.id,
      name: assistant.name,
      instructions: assistant.instructions,
      model: assistant.model,
      model_version: assistant.model_version,
      api_key: assistant.api_key,
      organization_id: assistant.organization_id,
      max_tokens: assistant.max_tokens,
      temperature: assistant.temperature,
      knowledge_base: assistant.knowledge_base || [],
      welcome_message: assistant.welcome_message,
    };
    setCurrentAssistant(selectedAssistant);
    setView('assistant');
  };

  const handleSaveAssistant = async () => {
    if (!currentAssistant) return;

    try {
      const assistantData = {
        id: currentAssistant.id,
        name: currentAssistant.name,
        instructions: currentAssistant.instructions,
        model: currentAssistant.model,
        model_version: currentAssistant.model_version,
        api_key: currentAssistant.api_key,
        organization_id: currentAssistant.organization_id,
        max_tokens: currentAssistant.max_tokens,
        temperature: currentAssistant.temperature,
        knowledge_base: knowledgeBase,
        welcome_message: currentAssistant.welcome_message,
      };

      const { error } = await supabase.from('assistants').insert([assistantData]);

      if (error) throw error;

      await fetchAssistants();
      setView('library');
      setToast({
        show: true,
        message: 'Assistant saved successfully',
        type: 'success',
      });
    } catch (error: any) {
      setToast({
        show: true,
        message: `Failed to save assistant: ${error.message || 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  return (
    <div className="h-screen bg-gray-900">
      {view === 'library' ? (
        <AssistantLibrary
          assistants={assistants}
          onAddAssistant={handleAddAssistant}
          onSelectAssistant={handleSelectAssistant}
        />
      ) : view === 'assistant' && currentAssistant ? (
        <div className="flex h-full">
          <AssistantConfigurationPanel
            assistant={{
              id: currentAssistant.id,
              name: currentAssistant.name,
              instructions: currentAssistant.instructions,
              model: currentAssistant.model,
              api_key: currentAssistant.api_key,
              organization_id: currentAssistant.organization_id,
              max_tokens: currentAssistant.max_tokens,
              temperature: currentAssistant.temperature,
              knowledge: knowledgeBase, // Use the state instead of currentAssistant.knowledge_base
              model_version: currentAssistant.model_version,
              welcome_message: currentAssistant.welcome_message,
            }}
            onAssistantChange={(updatedAssistant) => {
              console.log('Assistant updated:', updatedAssistant);
              setCurrentAssistant({
                ...updatedAssistant,
                knowledge_base: updatedAssistant.knowledge || [] // Sync knowledge to knowledge_base
              });
            }}
            onKnowledgeBaseChange={(newKnowledgeBase) => {
              console.log('Knowledge base changed:', newKnowledgeBase);
              setKnowledgeBase(newKnowledgeBase);
              setCurrentAssistant(current => current ? {
                ...current,
                knowledge_base: newKnowledgeBase // Update knowledge_base in currentAssistant
              } : null);
            }}
            onSave={handleSaveAssistant}
            onBack={() => setView('library')}
          />
          <ChatInterface
            assistantName={currentAssistant.name}
            instructions={currentAssistant.instructions}
            apiKey={currentAssistant.api_key}
            knowledgeBase={knowledgeBase} // Use the state instead of currentAssistant.knowledge_base
            maxTokens={currentAssistant.max_tokens}
            temperature={currentAssistant.temperature}
            model={currentAssistant.model}
            modelVersion={currentAssistant.model_version}
            welcomeMessage={currentAssistant.welcome_message}
            onSaveInstructions={(instructions) =>
              setCurrentAssistant({ ...currentAssistant, instructions })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export default App
