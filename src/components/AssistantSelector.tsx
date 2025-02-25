import React from 'react';

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

interface AssistantSelectorProps {
  assistants: Assistant[];
  selectedAssistant?: Assistant;
  onSelect: (assistant: Assistant) => void;
}

const AssistantSelector: React.FC<AssistantSelectorProps> = ({
  assistants,
  selectedAssistant,
  onSelect,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Assistant
      </label>
      <select
        className="w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        value={selectedAssistant?.id || ''}
        onChange={(e) => {
          const assistant = assistants.find(a => a.id === e.target.value);
          if (assistant) {
            onSelect(assistant);
          }
        }}
      >
        <option value="">Select an assistant...</option>
        {assistants.map((assistant) => (
          <option key={assistant.id} value={assistant.id}>
            {assistant.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AssistantSelector;
