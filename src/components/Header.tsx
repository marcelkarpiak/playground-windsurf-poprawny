import React from 'react';
import { useAuth } from './AuthProvider';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  
  return (
    <header className="bg-gray-900 p-4 flex justify-between items-center">
      <h1 className="text-white text-xl font-bold">AI Assistant Platform</h1>
      
      {user && (
        <div className="flex items-center">
          <span className="text-gray-300 mr-4">{user.email}</span>
          <button
            onClick={signOut}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Wyloguj
          </button>
        </div>
      )}
    </header>
  );
};

export default Header; 