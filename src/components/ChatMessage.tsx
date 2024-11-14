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

// Initialize mermaid with strict security and better error handling
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'monospace',
  logLevel: 3,
  deterministicIds: true,
  sequence: { useMaxWidth: false },
  flowchart: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  themeVariables: {
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }
});

const MermaidDiagram: React.FC<{ content: string }> = ({ content }) => {
  const elementId = React.useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        // Clean and validate the diagram content
        const cleanContent = content.trim();
        if (!cleanContent) {
          throw new Error('Empty diagram content');
        }

        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Create a temporary container with proper ID
        const tempContainer = document.createElement('div');
        tempContainer.id = elementId.current;
        tempContainer.style.width = '100%';
        containerRef.current.appendChild(tempContainer);

        // First try to parse the diagram
        const { svg } = await mermaid.render(elementId.current, cleanContent);
        
        // Only update if container still exists
        if (containerRef.current) {
          // Create a wrapper div to properly contain the SVG
          const wrapper = document.createElement('div');
          wrapper.style.width = '100%';
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'center';
          wrapper.innerHTML = svg;

          // Clear container and append wrapped SVG
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(wrapper);

          // Add click handlers for any links in the diagram
          const links = wrapper.querySelectorAll('a');
          links.forEach(link => {
            link.onclick = (e) => {
              e.preventDefault();
              if (link.href) {
                window.open(link.href, '_blank', 'noopener,noreferrer');
              }
            };
          });

          // Ensure SVG is responsive
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
            <div class="p-4 bg-red-50 text-red-500 rounded-lg">
              <p class="font-medium mb-2">Failed to render diagram</p>
              <pre class="text-sm bg-red-100 p-2 rounded overflow-x-auto">${
                content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
              }</pre>
              <p class="text-sm mt-2">Invalid diagram syntax. Please check your Mermaid syntax.</p>
            </div>
          `;
        }
      }
    };

    // Add a small delay to ensure the container is ready
    const timeoutId = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timeoutId);
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="my-4 overflow-x-auto bg-white rounded-lg p-4 border border-gray-200"
    />
  );
};

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  if (language === 'mermaid') {
    return <MermaidDiagram content={value} />;
  }

  if (language === 'jsx live') {
    return (
      <div className="my-4 rounded-lg overflow-hidden border border-gray-200">
        <LiveProvider code={value} noInline={value.includes('render(')}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4">
              <LiveEditor />
            </div>
            <div className="bg-white p-4">
              <LivePreview />
            </div>
          </div>
          <LiveError />
        </LiveProvider>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden">
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          backgroundColor: '#1E1E1E'
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

export const ChatMessage: React.FC<ChatMessageProps> = ({ content, isUser, image }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {image && (
          <div className="mb-2">
            <img src={image} alt="Uploaded content" className="max-w-full rounded-lg" />
          </div>
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
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
                        className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 font-mono text-sm"
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
    </div>
  );
};