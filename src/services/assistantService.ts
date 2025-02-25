import { supabase } from '../config/supabase';
import { AssistantDB } from '../types/assistant';

export const assistantService = {
  async getAssistants() {
    console.log('Fetching assistants from Supabase');
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assistants:', error);
      throw error;
    }
    console.log('Fetched assistants:', data);
    return data as AssistantDB[];
  },

  async createAssistant(assistant: Omit<AssistantDB, 'id' | 'created_at'>) {
    console.log('Creating assistant:', {
      ...assistant,
      api_key: assistant.api_key ? '[PRESENT]' : '[MISSING]'
    });

    const { data, error } = await supabase
      .from('assistants')
      .insert([assistant])
      .select()
      .single();

    if (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }

    console.log('Created assistant:', {
      ...data,
      api_key: data.api_key ? '[PRESENT]' : '[MISSING]'
    });
    return data as AssistantDB;
  },

  async updateAssistant(id: string, assistant: Partial<AssistantDB>) {
    console.log('Updating assistant:', {
      id,
      ...assistant,
      api_key: assistant.api_key ? '[PRESENT]' : '[MISSING]'
    });

    const { data, error } = await supabase
      .from('assistants')
      .update(assistant)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating assistant:', error);
      throw error;
    }

    console.log('Updated assistant:', {
      ...data,
      api_key: data.api_key ? '[PRESENT]' : '[MISSING]'
    });
    return data as AssistantDB;
  },

  async deleteAssistant(id: string) {
    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}; 