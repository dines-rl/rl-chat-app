import React, { useState, useEffect } from 'react';
import { AIProvider } from '../services/ai-providers';

interface ApiKeyInputProps {
  onApiKeyChange: (provider: AIProvider, apiKey: string) => void;
  onRunloopKeyChange: (apiKey: string) => void;
  hasValidKey: boolean;
  hasValidRunloopKey?: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ 
  onApiKeyChange, 
  onRunloopKeyChange,
  hasValidKey,
  hasValidRunloopKey = false
}) => {
  const [aiApiKey, setAiApiKey] = useState('');
  const [runloopApiKey, setRunloopApiKey] = useState('');
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [isVisible, setIsVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runloopError, setRunloopError] = useState<string | null>(null);

  useEffect(() => {
    const savedAiKey = localStorage.getItem('ai_api_key');
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider;
    const savedRunloopKey = localStorage.getItem('runloop_api_key');

    if (savedAiKey && savedProvider) {
      setAiApiKey(savedAiKey);
      setProvider(savedProvider);
      onApiKeyChange(savedProvider, savedAiKey);
    }

    if (savedRunloopKey) {
      setRunloopApiKey(savedRunloopKey);
      onRunloopKeyChange(savedRunloopKey);
    }
  }, []);

  useEffect(() => {
    if (hasValidKey && hasValidRunloopKey) {
      setIsVisible(false);
    }
  }, [hasValidKey, hasValidRunloopKey]);

  const handleAiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value.trim();
    setAiApiKey(newKey);
    setError(null);

    if (newKey && provider === 'openai' && !newKey.startsWith('sk-')) {
      setError('OpenAI API key should start with "sk-"');
    }
  };

  const handleRunloopKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value.trim();
    setRunloopApiKey(newKey);
    setRunloopError(null);

    if (newKey && !newKey.match(/^ak_[a-zA-Z0-9]{21}$/)) {
      setRunloopError('Runloop API key should start with "ak_" followed by 21 characters');
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as AIProvider;
    setProvider(newProvider);
    setError(null);
    setAiApiKey('');
  };

  const handleSetKeys = () => {
    let hasErrors = false;

    if (!aiApiKey) {
      setError('AI API key is required');
      hasErrors = true;
    } else if (provider === 'openai' && !aiApiKey.startsWith('sk-')) {
      setError('OpenAI API key must start with "sk-"');
      hasErrors = true;
    }

    if (!runloopApiKey) {
      setRunloopError('Runloop API key is required');
      hasErrors = true;
    } else if (!runloopApiKey.match(/^ak_[a-zA-Z0-9]{21}$/)) {
      setRunloopError('Runloop API key should start with "ak_" followed by 21 characters');
      hasErrors = true;
    }

    if (hasErrors) return;

    localStorage.setItem('ai_api_key', aiApiKey);
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('runloop_api_key', runloopApiKey);
    
    onApiKeyChange(provider, aiApiKey);
    onRunloopKeyChange(runloopApiKey);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSetKeys();
  };

  if (!isVisible && hasValidKey && hasValidRunloopKey) {
    return (
      <div className="mb-8 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/60 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Connected</h2>
              <p className="text-xs text-gray-500 mt-1">
                Using {provider === 'openai' ? 'OpenAI' : 'Claude'} API and Runloop API
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(true)}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Change Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">API Settings</h2>
        {hasValidKey && hasValidRunloopKey && (
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Hide
          </button>
        )}
      </div>
      
      {/* AI API Settings */}
      <div className="mb-6 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/60 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">AI Provider Settings</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
              Select Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={handleProviderChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 bg-white"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div>
            <label htmlFor="aiApiKey" className="block text-sm font-medium text-gray-700 mb-1">
              AI API Key
            </label>
            <input
              type="password"
              id="aiApiKey"
              value={aiApiKey}
              onChange={handleAiKeyChange}
              placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Claude'} API key`}
              className={`w-full rounded-lg border ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500/20'
              } px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all duration-200 bg-white`}
            />
            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Runloop API Settings */}
      <div className="mb-6 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/60 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Runloop API Settings</h3>
        <div>
          <label htmlFor="runloopApiKey" className="block text-sm font-medium text-gray-700 mb-1">
            Runloop API Key
          </label>
          <input
            type="password"
            id="runloopApiKey"
            value={runloopApiKey}
            onChange={handleRunloopKeyChange}
            placeholder="Enter your Runloop API key"
            className={`w-full rounded-lg border ${
              runloopError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500/20'
            } px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all duration-200 bg-white`}
          />
          {runloopError && (
            <p className="mt-2 text-xs text-red-500">{runloopError}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Save Settings
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1">Your API keys are stored locally in your browser and never sent to our servers.</p>
        <p>
          Get your API keys from:{' '}
          {provider === 'openai' ? (
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              OpenAI's website
            </a>
          ) : (
            <a
              href="https://console.anthropic.com/account/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              Anthropic's Console
            </a>
          )}
          {' '}and{' '}
          <a
            href="https://runloop.ai/dashboard/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Runloop Dashboard
          </a>
        </p>
      </div>
    </form>
  );
};