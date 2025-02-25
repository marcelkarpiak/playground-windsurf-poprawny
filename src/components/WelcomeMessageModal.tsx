import React, { useState, useEffect } from 'react';

interface WelcomeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: string) => void;
  initialMessage?: string;
}

const WelcomeMessageModal: React.FC<WelcomeMessageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMessage = ''
}) => {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage, isOpen]);

  const handleSave = () => {
    if (!message.trim()) return;
    onSave(message);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Set Welcome Message</h3>
        <textarea
          className="w-full h-32 p-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter welcome message..."
        />
        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="px-4 py-2 text-gray-300 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessageModal; 