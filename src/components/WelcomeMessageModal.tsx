import React, { useState } from 'react';

interface WelcomeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: string) => void;
}

const WelcomeMessageModal: React.FC<WelcomeMessageModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(message);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h2 className="text-xl text-gray-200 mb-4">Add Welcome Message</h2>
        <textarea
          className="w-full h-32 p-2 mb-4 rounded bg-gray-700 text-gray-200 border border-gray-600"
          placeholder="Enter your welcome message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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