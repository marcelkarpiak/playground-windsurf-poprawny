import React, { useState, useEffect, useRef } from 'react'
import { XCircle } from 'lucide-react'
import ModelSelectionModal from './ModelSelectionModal'
import { ModelConfig as ImportedModelConfig, models } from './models'
import ModelVersionSelect from './ModelVersionSelect'
import WelcomeMessageModal from './WelcomeMessageModal'
import Toast from "./Toast"
import { supabase } from '../config/supabase'
import { useAuth } from './AuthProvider'

// Usuń import pdfjs i dodaj deklarację typów dla window
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface KnowledgeItem {
  name: string;
  content: string;
}

interface KnowledgeBaseItem {
  name: string;
  content: string;
}

interface AssistantConfigurationPanelProps {
  assistant: {
    id?: string;
    name: string;
    instructions: string;
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
    knowledge: KnowledgeBaseItem[];
    modelVersion: string;
    organizationId?: string;
    welcomeMessage?: string;
  };
  onAssistantChange: (assistant: any) => void;
  onKnowledgeBaseChange: (knowledgeBase: KnowledgeBaseItem[]) => void;
  onSave: () => void;
  onBack: () => void;
}

interface ModelConfig {
  id: string;
  name: string;
  testEndpoint: string; // Upewnij się, że to nie jest opcjonalne
  testMethod: string;   // Upewnij się, że to nie jest opcjonalne
  getHeaders: (config: any) => Record<string, string>;
  getBody: () => any;
  versions?: { id: string; name: string }[];
  baseUrl: string;
  requires: string[];
  apiKey?: string;
  organizationId?: string;
}

interface Assistant {
  model: string;
  model_version: string;
  api_key: string;
  organization_id?: string;
  version?: string;
  instructions?: string;
  knowledge?: any[];
  // ... inne pola
}

const AssistantConfigurationPanel: React.FC<AssistantConfigurationPanelProps> = ({
  assistant,
  onAssistantChange,
  onKnowledgeBaseChange,
  onSave,
  onBack,
}) => {
  console.log('Rendering AssistantConfigurationPanel with assistant:', assistant);

  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ImportedModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInstructions, setUserInstructions] = useState(assistant.instructions);
  const [isInstructionsSaved, setIsInstructionsSaved] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const [modelConnection, setModelConnection] = useState({
    isConnected: false,
    modelName: '',
    error: '',
  });

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Dodaj ref do śledzenia stanu aktualizacji
  const isUpdatingRef = useRef(false);

  // Dodaj hook useAuth
  const { user } = useAuth();

  // Przenieś useEffect tutaj, na początek komponentu
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // --- Knowledge Base Handling ---
  // Temporarily comment out processFile and use a placeholder for handleFileUpload:
  const processFile = async (file: File): Promise<KnowledgeItem | { name: string, error: string }> => {
    console.log('Processing file:', file.name, 'type:', file.type);

    try {
      if (file.type === 'application/pdf') {
        console.log('Starting PDF processing');
        const arrayBuffer = await file.arrayBuffer();
        console.log('Array buffer created, size:', arrayBuffer.byteLength);
        
        try {
          if (!window.pdfjsLib) {
            throw new Error('PDF.js library not loaded');
          }

          console.log('Creating PDF loading task');
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          console.log('PDF loaded successfully, pages:', pdf.numPages);
          
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`Processing page ${i}/${pdf.numPages}`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }

          console.log(`PDF fully processed: ${file.name}, content length: ${fullText.length}`);
          return {
            name: file.name,
            content: fullText.trim()
          };
        } catch (pdfError) {
          console.error('PDF processing error:', pdfError);
          throw pdfError;
        }
      } else {
        const text = await file.text();
        console.log(`Text file processed: ${file.name}, content length: ${text.length}`);
        return {
          name: file.name,
          content: text.trim()
        };
      }
    } catch (error) {
      console.error('Error processing file:', file.name, error);
      return { name: file.name, error: `Error processing file: ${error}` };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('handleFileUpload triggered', { files });
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    try {
      isUpdatingRef.current = true; // Ustaw flagę przed przetwarzaniem
      
      console.log(`Processing ${files.length} files...`);
      const fileArray = Array.from(files);
      
      // Sprawdź typy plików
      fileArray.forEach(file => {
        console.log(`File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
      });

      const processedFiles = await Promise.all(fileArray.map(async (file) => {
        try {
          const result = await processFile(file);
          console.log(`Processed file result:`, result);
          return result;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return { name: file.name, error: String(error) };
        }
      }));

      const validFiles = processedFiles.filter((file): file is KnowledgeItem => {
        if ('error' in file) {
          console.error(`Skipping file ${file.name} due to error:`, file.error);
          return false;
        }
        return true;
      });

      console.log('Valid processed files:', validFiles);
      
      if (validFiles.length > 0) {
        const newKnowledgeBase = [...knowledgeBase, ...validFiles];
        setKnowledgeBase(newKnowledgeBase);
        onKnowledgeBaseChange(newKnowledgeBase);
        
        // Log the final state
        console.log('Knowledge base state updated:', {
          localState: newKnowledgeBase,
          assistantKnowledge: newKnowledgeBase,
          firstItem: newKnowledgeBase[0]?.content
        });
      } else {
        console.error('No valid files were processed');
        setToast({
          show: true,
          message: 'Failed to process knowledge base files',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
    } finally {
      // Zresetuj flagę po zakończeniu
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  const validateKnowledgeBase = (files: { name: string; content: string }[]) => {
    return files.every((file) => file.content.trim().length > 0);
  };

  useEffect(() => {
    // Jeśli aktualizacja jest już w toku, przerwij cykl
    if (isUpdatingRef.current) return;
    
    console.log('Assistant knowledge changed:', assistant.knowledge);
    
    if (
      assistant.knowledge && 
      Array.isArray(assistant.knowledge) && 
      assistant.knowledge.length > 0
    ) {
      // Porównaj tylko nazwy plików dla wydajności
      const currentNames = new Set(knowledgeBase.map(kb => kb.name));
      const incomingNames = new Set(assistant.knowledge.map(kb => kb.name));
      
      const hasChanges = [...incomingNames].some(name => !currentNames.has(name)) || 
                        [...currentNames].some(name => !incomingNames.has(name));
      
      if (hasChanges) {
        // Ustaw flagę aktualizacji przed modyfikacją stanu
        isUpdatingRef.current = true;
        
        const validKnowledge = assistant.knowledge.filter(kb => kb?.name && kb?.content);
        setKnowledgeBase(validKnowledge);
        
        // Zresetuj flagę po zakończeniu
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [assistant.knowledge, knowledgeBase]);

  useEffect(() => {
    setUserInstructions(assistant.instructions);
    setIsInstructionsSaved(false); // Reset save state when instructions prop changes
  }, [assistant.instructions]);

  useEffect(() => {
    const model = models.find((m) => m.id === assistant.model);
    if (model) {
      setSelectedModel(model);
    }
  }, [assistant.model]);

  useEffect(() => {
    if (assistant.model && assistant.apiKey) {
      handleSave();
    }
  }, [assistant.model, assistant.apiKey, assistant.organizationId, assistant.modelVersion]);

  const testApiConnection = async (modelId: string, config: any) => {
    try {
      const selectedModel = models.find((m) => m.id === modelId);
      if (!selectedModel || !selectedModel.testEndpoint) return false;

      // Handle Gemini
      if (modelId === 'gemini') {
        const response = await fetch(selectedModel.testEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.apiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: "Hello" }]
            }]
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Connection test failed');
        }
        return true;
      }

      // Specjalna obsługa dla OpenAI
      if (modelId === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'OpenAI-Organization': config.organizationId || ''
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'OpenAI connection failed');
        }
        return true;
      }

      // Standardowa obsługa dla innych modeli
      if (selectedModel.getHeaders && selectedModel.getBody) {
        const response = await fetch(selectedModel.testEndpoint, {
          method: selectedModel.testMethod || 'POST',
          headers: selectedModel.getHeaders(config),
          body: selectedModel.testMethod === 'POST' ? JSON.stringify(selectedModel.getBody()) : undefined,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Connection test failed');
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('API connection test error:', error);
      throw error;
    }
  };

  const handleModelSelect = (model: ImportedModelConfig | null) => {
    if (model) {
      const updatedAssistant = {
        ...assistant,
        model: model.id,
        modelVersion: model.versions?.[0]?.id || model.id,
        apiKey: model.apiKey,
        organizationId: model.organizationId
      };

      console.log('Updating assistant with model:', {
        modelId: model.id,
        hasApiKey: !!updatedAssistant.apiKey
      });

      onAssistantChange(updatedAssistant);
      setSelectedModel(model);
      setShowModelModal(false);
    }
  };

  const handleVersionChange = (version: string) => {
    console.log('Selected version:', version);
    const updatedAssistant = {
      ...assistant,
      model_version: version,
    };
    console.log('Updating assistant with version:', updatedAssistant);
    onAssistantChange(updatedAssistant);
  };

  const closeDialog = () => {
    setShowModelModal(false);
  };

  const validateInstructions = (instructions: string) => {
    if (!instructions.trim()) {
      return 'Instructions cannot be empty';
    }
    if (instructions.length < 10) {
      return 'Instructions must be more detailed';
    }
    return null;
  };

  const handleSaveInstructions = () => {
    const validationError = validateInstructions(userInstructions);
    if (validationError) {
      setError(validationError);
      return;
    }

    onAssistantChange({ ...assistant, instructions: userInstructions });
    setIsInstructionsSaved(true); // Set saved state
    setError('');
  };

  const handleSaveAssistant = async () => {
    // Validation before saving
    if (!assistant.name) {
      setToast({
        show: true,
        message: 'Assistant name is required',
        type: 'error',
      });
      return;
    }

    if (!assistant.instructions) {
      setToast({
        show: true,
        message: 'Instructions are required',
        type: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. Prepare assistant data
      const assistantData = {
        ...(assistant.id && { id: assistant.id }), // Dodaj ID tylko jeśli już istnieje
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        model_version: assistant.modelVersion,
        api_key: assistant.apiKey,
        max_tokens: assistant.maxTokens,
        temperature: assistant.temperature,
        organization_id: assistant.organizationId,
        welcome_message: assistant.welcomeMessage,
        user_id: user?.id  // User from AuthContext
      };
      
      console.log("Assistant data to save:", assistantData);
      
      // 2. Save the assistant
      let assistantId = assistant.id;
      
      if (assistantId) {
        // Update existing assistant
        const { error } = await supabase
          .from('assistants')
          .update(assistantData)
          .eq('id', assistantId);
          
        if (error) {
          console.error("Error while updating assistant:", error);
          throw error;
        }
        
        console.log("Assistant updated successfully, ID:", assistantId);
      } else {
        // Create new assistant - let Supabase generate the ID
        const { data, error } = await supabase
          .from('assistants')
          .insert(assistantData)
          .select();
          
        if (error) {
          console.error("Error while saving assistant:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error("Failed to create assistant - no data returned");
        }
        
        assistantId = data[0].id;
        console.log("New assistant saved successfully, ID:", assistantId);
      }
      
      // 3. If the assistant was saved, handle the knowledge base
      if (assistantId) {
        // First delete existing knowledge base items for this assistant
        const { error: deleteError } = await supabase
          .from('knowledge_items')
          .delete()
          .eq('assistant_id', assistantId);
          
        if (deleteError) {
          console.error("Error while deleting old knowledge base:", deleteError);
          throw deleteError;
        }
        
        // Then add new knowledge base items
        if (knowledgeBase.length > 0) {
          const knowledgeItems = knowledgeBase.map(item => ({
            assistant_id: assistantId,
            name: item.name,
            content: item.content
          }));
          
          console.log("Knowledge base items to save:", knowledgeItems.length);
          
          const { error: knowledgeError } = await supabase
            .from('knowledge_items')
            .insert(knowledgeItems);
            
          if (knowledgeError) {
            console.error("Error while saving knowledge base:", knowledgeError);
            throw knowledgeError;
          }
          
          console.log("Knowledge base saved successfully");
        }
      }
      
      setToast({
        show: true,
        message: 'Assistant saved successfully!',
        type: 'success'
      });
      
      onSave();
    } catch (error: any) {
      console.error('Save error:', error);
      setToast({
        show: true,
        message: error.message || 'Error while saving assistant',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!selectedModel) {
        console.log('No model selected, skipping API test');
        return;
      }

      if (!assistant.apiKey) {
        console.log('No API key provided, skipping API test');
        return;
      }

      const config = {
        apiKey: assistant.apiKey,
        organizationId: assistant.organizationId || '',
        version: assistant.modelVersion || '',
        baseUrl: selectedModel.baseUrl,
      };

      console.log('Testing API connection with config:', {
        model: selectedModel.id,
        hasApiKey: !!config.apiKey,
        hasOrgId: !!config.organizationId,
        version: config.version
      });

      const isConnected = await testApiConnection(selectedModel.id, config);

      if (isConnected) {
        const updatedAssistant = {
          ...assistant,
          api_key: config.apiKey,
          organization_id: config.organizationId,
          model_version: config.version
        };
        onAssistantChange(updatedAssistant);

        setModelConnection({
          isConnected: true,
          modelName: `${selectedModel.name} (${config.version})`,
          error: '',
        });

        setToast({
          show: true,
          message: 'Model configuration saved successfully!',
          type: 'success'
        });
      } else {
        setModelConnection({
          isConnected: false,
          modelName: '',
          error: 'Failed to connect. Please check your credentials.',
        });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setModelConnection({
        isConnected: false,
        modelName: '',
        error: error.message || 'Connection failed. Please try again.',
      });

      setToast({
        show: true,
        message: error.message || 'Connection failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ModelDisplay = () => {
    const openDialog = () => setShowModelModal(true);

    if (!modelConnection.isConnected) {
      return (
        <button
          className="w-full p-4 text-center text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700"
          onClick={openDialog}
        >
          Choose Language Model
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="flex justify-between items-center w-full bg-gray-800 p-2 rounded-md">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${modelConnection.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-white">{modelConnection.modelName}</span>
          </div>
          <button className="text-xs text-gray-400 hover:text-white" onClick={openDialog}>
            Change
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    console.log('Knowledge base updated:',
      knowledgeBase.map(item => ({
        name: item.name,
        contentLength: item.content.length,
        preview: item.content.substring(0, 100)
      }))
    );
  }, [knowledgeBase]);

  const handleWelcomeMessageSave = (message: string) => {
    if (!message.trim()) return;
    
    const updatedAssistant = {
      ...assistant,
      welcomeMessage: message.trim()
    };
    
    onAssistantChange(updatedAssistant);
    setShowWelcomeModal(false);
    
    // Pokaż toast z potwierdzeniem
    setToast({
      show: true,
      message: 'Welcome message saved successfully!',
      type: 'success'
    });

    // Dodaj log do debugowania
    console.log('Saving welcome message:', {
      message: message.trim(),
      updatedAssistant
    });
  };

  const handleRemoveWelcomeMessage = () => {
    const updatedAssistant = {
      ...assistant,
      welcomeMessage: undefined
    };
    
    onAssistantChange(updatedAssistant);
    
    // Dodaj log do debugowania
    console.log('Removing welcome message:', {
      updatedAssistant
    });
  };

  return (
    <div className="w-1/4 bg-gray-800 p-4 shadow-md h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-100">Assistant Configuration</h2>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-300"
        >
          Back to Library
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="assistant-name" className="block text-sm font-medium text-gray-300">
          Assistant Name
        </label>
        <input
          type="text"
          id="assistant-name"
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Type assistant name"
          value={assistant.name}
          onChange={(e) => onAssistantChange({ ...assistant, name: e.target.value })}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-300">
          Instructions
        </label>
        <textarea
          id="instructions"
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32"
          placeholder="Enter assistant instructions"
          value={userInstructions}
          onChange={(e) => {
            setUserInstructions(e.target.value);
            setIsInstructionsSaved(false); // Reset saved state on change
            setError('');
          }}
        ></textarea>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {isInstructionsSaved ? (
          <div className="flex items-center mt-2 text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            <span>Instructions Saved</span>
          </div>
        ) : (
          <button
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
            onClick={handleSaveInstructions}
          >
            Save Instructions
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300">Language Model</label>
        <ModelDisplay />
        {modelConnection.error && <p className="text-red-500 text-sm mt-1">{modelConnection.error}</p>}
      </div>

      <ModelVersionSelect
        selectedProvider={assistant.model}
        selectedVersion={assistant.modelVersion}
        onVersionChange={handleVersionChange}
        isConnected={modelConnection.isConnected}
      />

      <div className="mb-4">
        <label htmlFor="knowledge" className="block text-sm font-medium text-gray-300">
          Knowledge Base
        </label>
        <div className="mt-1 flex items-center">
          <input
            type="file"
            id="knowledge"
            multiple
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileUpload}
            onClick={(e) => {
              // Reset value to allow selecting the same file again
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <label
            htmlFor="knowledge"
            className="cursor-pointer bg-gray-700 rounded-md border border-gray-600 px-3 py-2 text-sm font-medium leading-4 text-gray-300 hover:bg-gray-600"
          >
            Upload Files
          </label>
        </div>

        {/* Display uploaded files */}
        <div className="mt-2 space-y-2">
          {knowledgeBase.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
              <span className="text-sm text-gray-300">{file.name}</span>
              <button
                onClick={() => {
                  setKnowledgeBase(prev => prev.filter((_, i) => i !== index));
                  console.log(`Removed file: ${file.name}`);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <XCircle size={16} />
              </button>
            </div>
          ))}
        </div>

        {knowledgeBase.length > 0 && (
          <p className="mt-2 text-sm text-green-500">
            {knowledgeBase.length} file(s) uploaded
          </p>
        )}
      </div>

      <div>
        <label htmlFor="max-tokens" className="block text-sm font-medium text-gray-300">
          Max Tokens
        </label>
        <input
          type="number"
          id="max-tokens"
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={assistant.maxTokens}
          onChange={(e) =>
            onAssistantChange({
              ...assistant,
              maxTokens: parseInt(e.target.value, 10),
            })
          }
        />
      </div>
      <div className="mt-4">
        <label htmlFor="temperature" className="block text-sm font-medium text-gray-300">
          Temperature
        </label>
        <input
          type="number"
          id="temperature"
          min="0"
          max="1"
          step="0.1"
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={assistant.temperature}
          onChange={(e) =>
            onAssistantChange({
              ...assistant,
              temperature: parseFloat(e.target.value),
            })
          }
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Welcome Message
        </label>
        {assistant.welcomeMessage ? (
          <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-300">{assistant.welcomeMessage}</p>
              <button
                onClick={handleRemoveWelcomeMessage}
                className="text-gray-400 hover:text-gray-300 ml-2"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="w-full p-4 text-center text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700"
          >
            Add Welcome Message
          </button>
        )}
      </div>

      <WelcomeMessageModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onSave={handleWelcomeMessageSave}
      />

      <ModelSelectionModal
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
        onClose={closeDialog}
        isVisible={showModelModal}
        initialApiKey={assistant.apiKey || ''}
        initialOrgId={assistant.organizationId || ''}
        initialVersion={assistant.modelVersion || ''}
      />

      <div className="mt-8">
        <button
          onClick={handleSaveAssistant}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
        >
          Save Assistant
        </button>
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default AssistantConfigurationPanel;
