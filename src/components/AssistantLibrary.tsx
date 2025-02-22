import React from 'react';
import { PlusCircle, ArrowRight } from 'lucide-react';

interface Assistant {
  id: string;
  name: string;
  instructions: string;
  model: string;
  modelVersion: string;
  apiKey: string;
  organizationId?: string;
  maxTokens: number;
  temperature: number;
  welcomeMessage?: string;
  knowledge: File[];
}

interface AssistantLibraryProps {
  assistants: Assistant[];
  onAddAssistant: () => void;
  onSelectAssistant: (assistant: Assistant) => void;
}

const AssistantLibrary: React.FC<AssistantLibraryProps> = ({
  assistants,
  onAddAssistant,
  onSelectAssistant,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">AI Assistants Library</h1>
          <button
            onClick={onAddAssistant}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <PlusCircle size={20} />
            Add Assistant
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <div
              key={assistant.id}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-white">{assistant.name}</h2>
                <button
                  onClick={() => onSelectAssistant(assistant)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {assistant.instructions}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="bg-gray-700 px-2 py-1 rounded">
                  {assistant.model}
                </span>
                <span className="bg-gray-700 px-2 py-1 rounded">
                  {assistant.modelVersion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantLibrary; 