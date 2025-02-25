import React, { useState, useEffect } from 'react'
import './index.css'
import ChatInterface from './components/ChatInterface'
import AssistantConfigurationPanel from './components/AssistantConfigurationPanel'
import AssistantLibrary from './components/AssistantLibrary'
import Toast from './components/Toast'
import { supabase } from './config/supabase'
import AuthProvider, { useAuth } from './components/AuthProvider'
import AuthForm from './components/AuthForm'
import Header from './components/Header'

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

// Ten komponent zawiera główną logikę aplikacji
const AppContent: React.FC = () => {
  const { user } = useAuth()
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

  // Przenieś useEffect tutaj, przed jakimkolwiek wczesnym returnem
  useEffect(() => {
    if (user) {
      fetchAssistants()
    }
  }, [user])

  // Jeśli użytkownik nie jest zalogowany, wyświetl formularz logowania
  if (!user) {
    return <AuthForm />
  }

  const fetchAssistants = async () => {
    console.log('Fetching assistants from Supabase...')
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching assistants:', error)
      return
    }
    
    console.log('Fetched assistants:', data)
    setAssistants(data || [])
  }

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
    }

    console.log('Creating new assistant:', newAssistant)
    setCurrentAssistant(newAssistant)
    setTimeout(() => {
      setView('assistant')
    }, 0)
  }

  const handleSelectAssistant = (assistant: AssistantDB) => {
    console.log('Selecting assistant:', {
      welcome_message: assistant.welcome_message,
      name: assistant.name
    })
    
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
    }
    setCurrentAssistant(selectedAssistant)
    setView('assistant')
  }

  const handleSaveAssistant = async () => {
    if (!currentAssistant) return

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
        user_id: user.id, // Dodaj ID użytkownika do asystenta
      }

      const { error } = await supabase.from('assistants').insert([assistantData])

      if (error) throw error

      await fetchAssistants()
      setView('library')
      setToast({
        show: true,
        message: 'Assistant saved successfully',
        type: 'success',
      })
    } catch (error: any) {
      setToast({
        show: true,
        message: `Failed to save assistant: ${error.message || 'Unknown error'}`,
        type: 'error',
      })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-hidden bg-gray-900">
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
                apiKey: currentAssistant.api_key,
                organizationId: currentAssistant.organization_id,
                maxTokens: currentAssistant.max_tokens,
                temperature: currentAssistant.temperature,
                knowledge: knowledgeBase,
                modelVersion: currentAssistant.model_version,
                welcomeMessage: currentAssistant.welcome_message,
              }}
              onAssistantChange={(updatedAssistant) => {
                console.log('Assistant updated:', updatedAssistant)
                setCurrentAssistant({
                  ...currentAssistant,
                  api_key: updatedAssistant.apiKey,
                  organization_id: updatedAssistant.organizationId,
                  max_tokens: updatedAssistant.maxTokens,
                  model_version: updatedAssistant.modelVersion,
                  welcome_message: updatedAssistant.welcomeMessage,
                  knowledge_base: updatedAssistant.knowledge || [],
                  name: updatedAssistant.name,
                  instructions: updatedAssistant.instructions,
                  model: updatedAssistant.model,
                  temperature: updatedAssistant.temperature,
                })
              }}
              onKnowledgeBaseChange={(newKnowledgeBase) => {
                console.log('Knowledge base changed:', newKnowledgeBase)
                setKnowledgeBase(newKnowledgeBase)
                setCurrentAssistant(current => current ? {
                  ...current,
                  knowledge_base: newKnowledgeBase
                } : null)
              }}
              onSave={handleSaveAssistant}
              onBack={() => setView('library')}
            />
            <ChatInterface
              assistantName={currentAssistant.name}
              instructions={currentAssistant.instructions}
              apiKey={currentAssistant.api_key}
              knowledgeBase={knowledgeBase}
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
      
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
