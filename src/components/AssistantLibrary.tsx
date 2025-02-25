import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthProvider';

interface KnowledgeItem {
  name: string;
  content: string;
}

interface Assistant {
  id: string;
  name: string;
  instructions: string;
  model: string;
  model_version: string;
  api_key: string;
  organization_id?: string;
  max_tokens: number;
  temperature: number;
  welcome_message?: string;
  knowledge_base: KnowledgeItem[];
}

interface AssistantLibraryProps {
  assistants: Assistant[];
  onAddAssistant: () => void;
  onSelectAssistant: (assistant: Assistant) => void;
}

const AssistantLibrary: React.FC<AssistantLibraryProps> = ({
  assistants: propAssistants,
  onAddAssistant,
  onSelectAssistant,
}) => {
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user) return;
        
        // Pobierz asystentów dla zalogowanego użytkownika
        const { data, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        // Pobierz wiedzę dla każdego asystenta
        const assistantsWithKnowledge = await Promise.all(
          data.map(async (assistant) => {
            const { data: knowledgeData, error: knowledgeError } = await supabase
              .from('knowledge_items')
              .select('name, content')
              .eq('assistant_id', assistant.id);
              
            if (knowledgeError) throw knowledgeError;
            
            return {
              ...assistant,
              knowledge_base: knowledgeData || []
            };
          })
        );
        
        setAssistants(assistantsWithKnowledge);
      } catch (error: any) {
        console.error('Error fetching assistants:', error);
        setError(error.message || 'Failed to load assistants');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssistants();
  }, [user]);

  // Funkcja do usuwania asystenta
  const handleDeleteAssistant = async (id: string) => {
    try {
      // Najpierw usuń powiązane elementy bazy wiedzy
      await supabase
        .from('knowledge_items')
        .delete()
        .eq('assistant_id', id);
        
      // Następnie usuń asystenta
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Odśwież listę
      setAssistants(assistants.filter(assistant => assistant.id !== id));
    } catch (error: any) {
      console.error('Error deleting assistant:', error);
      setError(error.message || 'Failed to delete assistant');
    }
  };

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

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-2">Loading assistants...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-300 p-4 rounded-lg">
            <p>{error}</p>
          </div>
        ) : assistants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">You don't have any assistants yet.</p>
            <button
              onClick={onAddAssistant}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Create your first assistant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-white">{assistant.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteAssistant(assistant.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete assistant"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() => onSelectAssistant(assistant)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Open assistant"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {assistant.instructions}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="bg-gray-700 px-2 py-1 rounded">
                    {assistant.model}
                  </span>
                  <span className="bg-gray-700 px-2 py-1 rounded">
                    {assistant.model_version}
                  </span>
                  {assistant.knowledge_base?.length > 0 && (
                    <span className="bg-green-900/30 text-green-300 px-2 py-1 rounded">
                      {assistant.knowledge_base.length} knowledge items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantLibrary; 