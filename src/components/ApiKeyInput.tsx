import React, { useState, useEffect } from 'react';
import { AIProvider } from '../services/ai-providers';

interface ApiKeyInputProps {
  onApiKeyChange: (provider: AIProvider, apiKey: string) => void;
  onRunloopKeyChange: (apiKey: string) => void;
  hasValidKey: boolean;
  hasValidRunloopKey?: boolean;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#e2e8f0',
};

const inputErrorStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(239, 68, 68, 0.5)',
  color: '#e2e8f0',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
};

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
      <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between" style={panelStyle}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-gray-300">API Settings</p>
            <p className="text-xs text-gray-500">
              Using {provider === 'openai' ? 'OpenAI' : 'Claude'} + Runloop
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsVisible(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl p-4" style={panelStyle}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-300">API Settings</h2>
        {hasValidKey && hasValidRunloopKey && (
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Hide
          </button>
        )}
      </div>

      {/* AI API Settings */}
      <div className="mb-3 p-3 rounded-lg" style={panelStyle}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Provider</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="provider" className="block text-xs font-medium text-gray-400 mb-1">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={handleProviderChange}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="openai" style={{ background: '#1e1b4b' }}>OpenAI</option>
              <option value="claude" style={{ background: '#1e1b4b' }}>Claude</option>
            </select>
          </div>
          <div>
            <label htmlFor="aiApiKey" className="block text-xs font-medium text-gray-400 mb-1">
              API Key
            </label>
            <input
              type="password"
              id="aiApiKey"
              value={aiApiKey}
              onChange={handleAiKeyChange}
              placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Claude'} API key`}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
              style={error ? inputErrorStyle : inputStyle}
            />
            {error && (
              <p className="mt-1.5 text-xs" style={{ color: '#fca5a5' }}>{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Runloop API Settings */}
      <div className="mb-3 p-3 rounded-lg" style={panelStyle}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Runloop</h3>
        <div>
          <label htmlFor="runloopApiKey" className="block text-xs font-medium text-gray-400 mb-1">
            API Key
          </label>
          <input
            type="password"
            id="runloopApiKey"
            value={runloopApiKey}
            onChange={handleRunloopKeyChange}
            placeholder="Enter your Runloop API key"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
            style={runloopError ? inputErrorStyle : inputStyle}
          />
          {runloopError && (
            <p className="mt-1.5 text-xs" style={{ color: '#fca5a5' }}>{runloopError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">Keys stored locally, never sent to our servers.</p>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
          }}
        >
          Save
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-600">
        Get your keys from:{' '}
        {provider === 'openai' ? (
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300">
            OpenAI
          </a>
        ) : (
          <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300">
            Anthropic Console
          </a>
        )}
        {' '}and{' '}
        <a href="https://runloop.ai/dashboard/api-keys" target="_blank" rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300">
          Runloop Dashboard
        </a>
      </div>
    </form>
  );
};
