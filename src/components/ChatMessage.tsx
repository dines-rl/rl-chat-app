import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import 'katex/dist/katex.min.css';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  image?: string;
}

interface CodeBlockProps {
  language: string | undefined;
  value: string;
  className?: string;
}

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  fontFamily: 'monospace',
  logLevel: 3,
  deterministicIds: true,
  sequence: { useMaxWidth: false },
  flowchart: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  themeVariables: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#1e1b4b',
    primaryColor: '#4f46e5',
    primaryTextColor: '#e0e7ff',
    primaryBorderColor: '#6366f1',
    lineColor: '#818cf8',
    secondaryColor: '#312e81',
    tertiaryColor: '#1e1b4b',
  }
});

const MermaidDiagram: React.FC<{ content: string }> = ({ content }) => {
  const elementId = React.useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        const cleanContent = content.trim();
        if (!cleanContent) {
          throw new Error('Empty diagram content');
        }

        containerRef.current.innerHTML = '';

        const tempContainer = document.createElement('div');
        tempContainer.id = elementId.current;
        tempContainer.style.width = '100%';
        containerRef.current.appendChild(tempContainer);

        const { svg } = await mermaid.render(elementId.current, cleanContent);

        if (containerRef.current) {
          const wrapper = document.createElement('div');
          wrapper.style.width = '100%';
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'center';
          wrapper.innerHTML = svg;

          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(wrapper);

          const links = wrapper.querySelectorAll('a');
          links.forEach(link => {
            link.onclick = (e) => {
              e.preventDefault();
              if (link.href) {
                window.open(link.href, '_blank', 'noopener,noreferrer');
              }
            };
          });

          const svgElement = wrapper.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding:1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:0.5rem;">
              <p style="color:#fca5a5;font-weight:600;margin-bottom:0.5rem;">Failed to render diagram</p>
              <pre style="color:#fca5a5;font-size:0.75rem;background:rgba(239,68,68,0.1);padding:0.5rem;border-radius:0.25rem;overflow-x:auto;">${
                content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
              }</pre>
            </div>
          `;
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timeoutId);
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto rounded-xl p-4"
      style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
    />
  );
};

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  if (language === 'mermaid') {
    return <MermaidDiagram content={value} />;
  }

  if (language === 'jsx live') {
    return (
      <div className="my-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <LiveProvider code={value} noInline={value.includes('render(')}>
          <div className="grid grid-cols-2 gap-0">
            <div style={{ background: '#1e1e1e' }} className="p-4">
              <LiveEditor />
            </div>
            <div style={{ background: 'rgba(15, 15, 30, 0.9)' }} className="p-4">
              <LivePreview />
            </div>
          </div>
          <LiveError />
        </LiveProvider>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          backgroundColor: '#0f0f1a',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 'inherit'
          }
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// Bot avatar icon
const BotIcon: React.FC = () => (
  <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 2px 8px rgba(79,70,229,0.4)' }}>
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  </div>
);

export const ChatMessage: React.FC<ChatMessageProps> = ({ content, isUser, image }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 gap-2 items-end message-enter`}>
      {!isUser && <BotIcon />}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'rounded-br-sm text-white'
            : 'rounded-bl-sm text-gray-200'
        }`}
        style={isUser ? {
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
        } : {
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {image && (
          <div className="mb-2">
            <img src={image} alt="Uploaded content" className="max-w-full rounded-lg" />
          </div>
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <div className="markdown-body text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const value = String(children).replace(/\n$/, '');

                  if (!match) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded font-mono text-sm"
                        style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return <CodeBlock language={match[1]} value={value} />;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      )}
    </div>
  );
};
