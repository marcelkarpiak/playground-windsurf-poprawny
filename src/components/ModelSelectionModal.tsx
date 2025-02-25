import React, { useState, useEffect } from 'react'
import { ModelConfig, models } from './models'
import { Input } from './ui/Input'

// --- Custom Component Definitions ---
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => (
  <div className={className}>{children}</div>
)

const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="mb-4">{children}</div>

const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-bold text-white">{children}</h2>
)

const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-gray-400">{children}</p>
)

const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-end space-x-2 mt-4">{children}</div>
)

interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'outline'
  className?: string
  disabled?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  className = '',
  disabled = false
}) => {
  const variantClasses =
    variant === 'outline'
      ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
      : 'bg-blue-500 text-white hover:bg-blue-600'

  return (
    <button
      className={`px-4 py-2 rounded-md ${variantClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// --- End Custom Component Definitions ---

interface ModelSelectionModalProps {
  selectedModel: ModelConfig | null
  onSelectModel: (model: ModelConfig | null) => void
  onClose: () => void
  isVisible: boolean
  initialApiKey: string
  initialOrgId: string
  initialVersion: string
}

const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  selectedModel,
  onSelectModel,
  onClose,
  isVisible,
  initialApiKey,
  initialOrgId,
  initialVersion,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(selectedModel?.id || '')
  const [selectedVersion, setSelectedVersion] = useState<string>(selectedModel?.version || '')
  const [apiConfig, setApiConfig] = useState<{
    apiKey?: string
    organizationId?: string
    version?: string
  }>({
    apiKey: initialApiKey || '',
    organizationId: initialOrgId || '',
    version: initialVersion || ''
  })
  
  const currentModel = models.find(m => m.id === selectedModelId)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentModel) {
      setApiConfig(prev => ({
        ...prev,
        apiKey: initialApiKey || prev.apiKey || '',
        organizationId: initialOrgId || prev.organizationId || '',
        version: initialVersion || prev.version || currentModel.versions?.[0]?.id || ''
      }))
    }
  }, [currentModel, initialApiKey, initialOrgId, initialVersion])

  useEffect(() => {
    if (!currentModel) {
      setIsValid(false)
      return
    }

    const requiredFields = currentModel.requires || []
    const hasAllRequired = requiredFields.every(field => {
      const value = apiConfig[field as keyof typeof apiConfig]
      return value && value.trim() !== ''
    })

    setIsValid(hasAllRequired && selectedVersion !== '')
  }, [currentModel, apiConfig, selectedVersion])

  const handleSave = () => {
    if (!currentModel || !apiConfig.apiKey) {
      setError('API key is required')
      return
    }

    if (!selectedVersion) {
      setError('Please select a model version')
      return
    }

    const modelWithConfig = {
      ...currentModel,
      apiKey: apiConfig.apiKey,
      organizationId: apiConfig.organizationId,
      version: selectedVersion
    }

    // Test the connection before saving
    try {
      fetch(currentModel.testEndpoint, {
        method: currentModel.testMethod,
        headers: currentModel.getHeaders({
          apiKey: apiConfig.apiKey,
          organizationId: apiConfig.organizationId
        }),
        ...(currentModel.testMethod === 'POST' && { 
          body: JSON.stringify(currentModel.getBody()) 
        })
      }).then(response => {
        if (!response.ok) {
          throw new Error('Connection test failed')
        }
        onSelectModel(modelWithConfig)
        onClose()
      }).catch(err => {
        setError(err.message || 'Failed to connect to the model')
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to the model')
    }
  }

  const renderConfigFields = () => {
    if (!currentModel) return null

    return (
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">API Key</label>
          <Input
            type="password"
            value={apiConfig.apiKey || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))
            }}
            placeholder="Enter API Key"
          />
        </div>
        {currentModel.requires.includes('organizationId') && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Organization ID</label>
            <Input
              type="password"
              value={apiConfig.organizationId || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setApiConfig(prev => ({ ...prev, organizationId: e.target.value }))
              }
              placeholder="Enter Organization ID"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Language Model</DialogTitle>
          <DialogDescription>
            Select a language model and provide the required API configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Language Model</label>
            <select 
              value={selectedModelId} 
              onChange={(e) => {
                setSelectedModelId(e.target.value)
                setApiConfig({})
                setSelectedVersion('')
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>

          {currentModel?.versions && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Model Version</label>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a version</option>
                {currentModel.versions.map(version => (
                  <option key={version.id} value={version.id}>{version.name}</option>
                ))}
              </select>
            </div>
          )}

          {currentModel && renderConfigFields()}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || !selectedModelId || !selectedVersion}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModelSelectionModal
