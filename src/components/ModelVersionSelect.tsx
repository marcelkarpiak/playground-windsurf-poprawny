import React from 'react';
import { models } from './models';

interface ModelVersionSelectProps {
  selectedProvider: string;
  selectedVersion: string;
  onVersionChange: (version: string) => void;
  isConnected: boolean;
}

const ModelVersionSelect: React.FC<ModelVersionSelectProps> = ({
  selectedProvider,
  selectedVersion,
  onVersionChange,
  isConnected
}) => {
  if (!isConnected) return null;

  const selectedModel = models.find(m => m.id === selectedProvider);
  if (!selectedModel?.versions?.length) return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300">
        Model Version
      </label>
      <select
        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        value={selectedVersion}
        onChange={(e) => onVersionChange(e.target.value)}
      >
        {selectedModel.versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelVersionSelect; 