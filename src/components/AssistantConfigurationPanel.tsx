import React, { useState, useEffect } from 'react'
import { XCircle } from 'lucide-react'
import ModelSelectionModal from './ModelSelectionModal'
import { ModelConfig as ImportedModelConfig, models } from './models'
import ModelVersionSelect from './ModelVersionSelect'
import WelcomeMessageModal from './WelcomeMessageModal'
import Toast from "./Toast"

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
        // Format knowledge base items
        const formattedKnowledgeBase: KnowledgeBaseItem[] = validFiles.map(file => ({
          name: file.name,
          content: file.content.replace(/\s+/g, ' ').trim() // Clean up whitespace
        }));

        console.log('Formatted knowledge base:', formattedKnowledgeBase);

        // First update the assistant to ensure persistence
        const updatedAssistant = {
          ...assistant,
          knowledge: formattedKnowledgeBase
        };
        onAssistantChange(updatedAssistant);

        // Then update local state and notify parent
        setKnowledgeBase(formattedKnowledgeBase);
        onKnowledgeBaseChange(formattedKnowledgeBase);
        
        // Log the final state
        console.log('Knowledge base state updated:', {
          localState: formattedKnowledgeBase,
          assistantKnowledge: formattedKnowledgeBase,
          firstItem: formattedKnowledgeBase[0]?.content
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
    }
  };

  const validateKnowledgeBase = (files: { name: string; content: string }[]) => {
    return files.every((file) => file.content.trim().length > 0);
  };



  // Initialize knowledge base from assistant
  useEffect(() => {
    console.log('Assistant knowledge changed:', assistant.knowledge);
    if (assistant.knowledge && Array.isArray(assistant.knowledge) && assistant.knowledge.length > 0) {
      const validKnowledge = assistant.knowledge.filter(kb => kb?.name && kb?.content);
      if (validKnowledge.length > 0) {
        console.log('Setting knowledge base from assistant:', validKnowledge);
        setKnowledgeBase(validKnowledge);
        onKnowledgeBaseChange(validKnowledge);
      }
    }
  }, [assistant.knowledge]);

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
    if (assistant.model) {
      handleSave();
    }
  }, [assistant.model, assistant.apiKey, assistant.organization_id, assistant.version]);

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
      const defaultVersion = model.versions?.[0]?.id || model.id;
      
      const updatedAssistant = {
        ...assistant,
        model: model.id,
        model_version: defaultVersion,
        api_key: model.apiKey,  // Changed from apiKey to api_key
        organization_id: model.organizationId
      };

      console.log('Saving assistant with API key:', {
        model: updatedAssistant.model,
        hasKey: !!updatedAssistant.api_key,
        keyLength: updatedAssistant.api_key?.length
      });

      // Update model connection state
      setModelConnection({
        isConnected: true,
        modelName: `${model.name} (${defaultVersion})`,
        error: ''
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

  const handleSaveAssistant = () => {
    // Walidacja przed zapisem
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

    if (!assistant.model || !assistant.model_version) {
      setToast({
        show: true,
        message: 'Please select a model and version',
        type: 'error',
      });
      return;
    }

    onSave();
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!selectedModel) {
        throw new Error('No model selected');
      }

      if (!assistant.api_key) {  // Changed from apiKey to api_key
        throw new Error('API key is required');
      }

      const config = {
        apiKey: assistant.api_key,  // Changed from apiKey to api_key
        organizationId: assistant.organization_id || '',
        version: assistant.model_version || '',
        baseUrl: selectedModel.baseUrl,
      };

      const isConnected = await testApiConnection(selectedModel.id, config);

      if (isConnected) {
        // Update assistant with the verified configuration
        const updatedAssistant = {
          ...assistant,
          api_key: config.apiKey,  // Changed from apiKey to api_key
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

        setToast({
          show: true,
          message: 'Failed to connect. Please check your credentials.',
          type: 'error'
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
    onAssistantChange({
      ...assistant,
      welcomeMessage: message,
    });
  };

  const handleRemoveWelcomeMessage = () => {
    onAssistantChange({
      ...assistant,
      welcomeMessage: undefined,
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
        selectedVersion={assistant.model_version}
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
        {assistant.welcomeMessage ? (
          <div className="mt-2 bg-gray-700 p-2 rounded">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-300">Welcome Message:</p>
              <button
                onClick={handleRemoveWelcomeMessage}
                className="text-red-500 hover:text-red-700"
              >
                <XCircle size={16} />
              </button>
            </div>
            <p className="text-gray-200 mt-1">{assistant.welcomeMessage}</p>
          </div>
        ) : (
          <button
            className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
            onClick={() => setShowWelcomeModal(true)}
          >
            + Add Welcome Message
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
        initialOrgId={assistant.organization_id || ''}
        initialVersion={assistant.version || ''}
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
