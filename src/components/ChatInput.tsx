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

  const canSend = (message.trim() || image) && !isProcessing;

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        {/* Image preview */}
        {image && (
          <div className="flex items-center gap-2 px-1">
            <div ref={imagePreviewRef} className="flex-grow" />
            <button
              type="button"
              onClick={removeImage}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors"
              style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Remove
            </button>
          </div>
        )}
        {!image && <div ref={imagePreviewRef} />}

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            className="w-full rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none resize-none transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              caretColor: '#818cf8',
            }}
            rows={3}
            disabled={isProcessing}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div className="flex justify-between items-center">
          <MarkdownTools onToolClick={handleToolClick} />
          <button
            type="submit"
            disabled={!canSend}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSend
                ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                : 'rgba(255,255,255,0.1)',
              boxShadow: canSend ? '0 4px 12px rgba(79, 70, 229, 0.4)' : 'none',
            }}
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                Send
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
