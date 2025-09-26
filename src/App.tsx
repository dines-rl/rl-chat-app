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
      // Here you would typically validate the Runloop API key
      // For now, we'll just check if it matches the expected format
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
    // Here you would typically validate the Runloop API key with your backend
    // For now, we'll just check if it matches the expected format
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      <div className="mx-auto max-w-4xl p-6">
        <div className="backdrop-blur-sm bg-white/95 rounded-xl p-8 shadow-2xl border border-white/20">
          <h1 className="mb-8 text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-center">AI Chat Assistant</h1>
          
          <ApiKeyInput 
            onApiKeyChange={handleApiKeyChange}
            onRunloopKeyChange={handleRunloopKeyChange}
            hasValidKey={hasValidKey}
            hasValidRunloopKey={hasValidRunloopKey}
          />
          
          <div className="h-[500px] overflow-y-auto mb-6 scroll-smooth bg-gradient-to-b from-gray-50/50 to-white/50 rounded-lg p-4 border border-gray-200/50">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                image={message.image}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <p className="text-sm font-medium">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  );
}

export default App;