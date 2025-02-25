import React, { useState } from 'react';
import { supabase } from '../config/supabase';

type AuthMode = 'signin' | 'signup' | 'reset';

const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Sprawdź e-mail, aby dokończyć rejestrację.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('Sprawdź e-mail z instrukcją resetowania hasła.');
      }
    } catch (error: any) {
      setError(error.message || 'Wystąpił błąd podczas autoryzacji.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'signin' ? 'Zaloguj się' : mode === 'signup' ? 'Zarejestruj się' : 'Resetuj hasło'}
        </h2>
        
        {message && <div className="mb-4 p-3 bg-green-800 text-white rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-800 text-white rounded">{error}</div>}
        
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
              required
            />
          </div>
          
          {mode !== 'reset' && (
            <div className="mb-6">
              <label className="block text-gray-300 mb-2" htmlFor="password">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                required={mode !== 'reset'}
              />
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? 'Przetwarzanie...' : mode === 'signin' ? 'Zaloguj' : mode === 'signup' ? 'Zarejestruj' : 'Wyślij link'}
          </button>
        </form>
        
        <div className="mt-4 text-sm text-gray-400 flex justify-between">
          {mode !== 'signin' && (
            <button
              onClick={() => setMode('signin')}
              className="text-blue-400 hover:text-blue-300"
            >
              Zaloguj się
            </button>
          )}
          
          {mode !== 'signup' && (
            <button
              onClick={() => setMode('signup')}
              className="text-blue-400 hover:text-blue-300"
            >
              Zarejestruj się
            </button>
          )}
          
          {mode !== 'reset' && (
            <button
              onClick={() => setMode('reset')}
              className="text-blue-400 hover:text-blue-300"
            >
              Zapomniałem hasła
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 