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
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">API Settings</h2>
            <p className="text-xs text-gray-500 mt-1">
              Using {provider === 'openai' ? 'OpenAI' : 'Claude'} API and Runloop API
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(true)}
            className="text-xs text-blue-500 hover:text-blue-600"
          >
            Change Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold text-gray-700">API Settings</h2>
        {hasValidKey && hasValidRunloopKey && (
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-xs text-blue-500 hover:text-blue-600"
          >
            Hide
          </button>
        )}
      </div>
      
      {/* AI API Settings */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">AI Provider Settings</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
              Select Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={handleProviderChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
                error ? 'border-red-300' : 'border-gray-300'
              } px-4 py-2 text-sm focus:border-blue-500 focus:outline-none`}
            />
            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Runloop API Settings */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Runloop API Settings</h3>
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
              runloopError ? 'border-red-300' : 'border-gray-300'
            } px-4 py-2 text-sm focus:border-blue-500 focus:outline-none`}
          />
          {runloopError && (
            <p className="mt-2 text-xs text-red-500">{runloopError}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
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