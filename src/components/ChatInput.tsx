import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { MarkdownTools } from './MarkdownTools';

interface ChatInputProps {
  onSendMessage: (message: string, image?: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  const removeImage = () => {
    setImage(null);
    if (imagePreviewRef.current) {
      imagePreviewRef.current.innerHTML = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || image) {
      setIsProcessing(true);
      try {
        await onSendMessage(message, image || undefined);
        setMessage('');
        setImage(null);
        if (imagePreviewRef.current) {
          imagePreviewRef.current.innerHTML = '';
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() || image) {
        handleSubmit(e);
      }
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setImage(file);
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e) => {
            if (imagePreviewRef.current && e.target?.result) {
              const img = document.createElement('img');
              img.src = e.target.result as string;
              img.alt = 'Pasted image';
              img.className = 'max-h-32 rounded-lg';
              imagePreviewRef.current.innerHTML = '';
              imagePreviewRef.current.appendChild(img);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleToolClick = (markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const beforeSelection = text.substring(0, start);
    const selection = text.substring(start, end);
    const afterSelection = text.substring(end);

    let newText = '';
    let newCursorPos = 0;

    if (selection) {
      const wrappedText = markdown.replace('text', selection).replace('code', selection);
      newText = beforeSelection + wrappedText + afterSelection;
      newCursorPos = start + wrappedText.length;
    } else {
      newText = beforeSelection + markdown + afterSelection;
      newCursorPos = start + markdown.length;
    }

    setMessage(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div ref={imagePreviewRef} className="flex-grow"></div>
          {image && (
            <button
              type="button"
              onClick={removeImage}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Remove Image
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line, paste an image)"
          className="w-full rounded-xl border border-gray-300 px-5 py-4 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none resize-none transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500"
          rows={3}
          disabled={isProcessing}
        />
        <div className="flex justify-between items-center">
          <MarkdownTools onToolClick={handleToolClick} />
          <button
            type="submit"
            disabled={(!message.trim() && !image) || isProcessing}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-white font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};