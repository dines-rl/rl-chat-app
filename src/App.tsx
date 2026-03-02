import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ApiKeyInput } from './components/ApiKeyInput';
import { getChatCompletion, initializeAI, type AIProvider } from './services/ai-providers';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  image?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidKey, setHasValidKey] = useState(false);
  const [hasValidRunloopKey, setHasValidRunloopKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider;
    const savedRunloopKey = localStorage.getItem('runloop_api_key');

    if (savedKey && savedProvider) {
      const isValid = initializeAI(savedProvider, savedKey);
      setHasValidKey(isValid);
    }

    if (savedRunloopKey) {
      setHasValidRunloopKey(savedRunloopKey.match(/^rl_[a-zA-Z0-9]{32}$/) !== null);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleApiKeyChange = (provider: AIProvider, apiKey: string) => {
    const isValid = initializeAI(provider, apiKey);
    setHasValidKey(isValid);
  };

  const handleRunloopKeyChange = (apiKey: string) => {
    setHasValidRunloopKey(apiKey.match(/^rl_[a-zA-Z0-9]{32}$/) !== null);
  };

  const handleSendMessage = async (content: string, image?: File) => {
    if (!hasValidKey) {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        content: 'Please set a valid API key first.',
        isUser: false,
      }]);
      return;
    }

    let imageDataUrl: string | undefined;
    if (image) {
      imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(image);
      });
    }

    const userMessage: Message = {
      id: messages.length + 1,
      content,
      isUser: true,
      image: imageDataUrl,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await getChatCompletion(content, image);

      setMessages(prev => [...prev, {
        id: prev.length + 1,
        content: aiResponse,
        isUser: false,
      }]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        setHasValidKey(false);
        localStorage.removeItem('ai_api_key');
        localStorage.removeItem('ai_provider');
      }

      setMessages(prev => [...prev, {
        id: prev.length + 1,
        content: error instanceof Error ? error.message : 'An error occurred while processing your request.',
        isUser: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-stretch">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl p-4 flex flex-col" style={{ minHeight: '100vh' }}>
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden glass shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-900/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.338 2.798a1.9 1.9 0 01-1.342-.557l-.106-.106a.375.375 0 01-.015-.528l.076-.076A.375.375 0 0118 18a.375.375 0 01-.293-.14l-.107-.106a1.9 1.9 0 01-.557-1.342c0-1.368 1.798-2.338 2.798-1.338L20 15.3M5 14.5l-1.402 1.402C2.598 16.902 3.568 18.7 4.936 18.7c.504 0 .987-.2 1.342-.557l.106-.106a.375.375 0 00.015-.528l-.076-.076A.375.375 0 006 17.45a.375.375 0 00.293-.14l.107-.106c.357-.355.557-.838.557-1.342C6.957 14.5 5.159 13.53 4.159 14.53L2.757 15.932" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text leading-tight">AI Chat Assistant</h1>
              <p className="text-xs text-gray-500">Powered by OpenAI & Claude</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>

          {/* API Settings */}
          <div className="px-4 pt-4">
            <ApiKeyInput
              onApiKeyChange={handleApiKeyChange}
              onRunloopKeyChange={handleRunloopKeyChange}
              hasValidKey={hasValidKey}
              hasValidRunloopKey={hasValidRunloopKey}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth" style={{ minHeight: 0 }}>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                image={message.image}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4 message-enter">
                <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm glass border border-white/10">
                  <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 border-t border-white/10 pt-4">
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
