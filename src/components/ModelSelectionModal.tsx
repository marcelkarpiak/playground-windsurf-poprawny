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
  const [apiConfig, setApiConfig] = useState<{
    apiKey?: string
    organizationId?: string
    version?: string
  }>({})
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedModel) {
      setApiConfig({
        apiKey: initialApiKey,
        organizationId: initialOrgId,
        version: initialVersion || selectedModel.versions?.[0]?.id
      })
    }
  }, [selectedModel, initialApiKey, initialOrgId, initialVersion])

  useEffect(() => {
    if (selectedModel) {
      const requiredFields = selectedModel.requires || []
      const hasAllRequired = requiredFields.every(field => !!apiConfig[field as keyof typeof apiConfig])
      setIsValid(hasAllRequired)
    }
  }, [selectedModel, apiConfig])

  const handleSave = () => {
    if (!selectedModel || !apiConfig.apiKey) {
      setError('API key is required')
      return
    }

    const modelWithConfig = {
      ...selectedModel,
      apiKey: apiConfig.apiKey,
      organizationId: apiConfig.organizationId
    }

    onSelectModel(modelWithConfig)
    onClose()
  }

  const renderConfigFields = () => {
    if (!selectedModel) return null

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
        {selectedModel.requires.includes('organizationId') && (
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

        {renderConfigFields()}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModelSelectionModal
