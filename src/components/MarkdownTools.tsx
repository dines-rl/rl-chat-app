import React from 'react';

interface MarkdownToolsProps {
  onToolClick: (markdown: string) => void;
}

export const MarkdownTools: React.FC<MarkdownToolsProps> = ({ onToolClick }) => {
  const tools = [
    { label: 'Bold', markdown: '**text**' },
    { label: 'Italic', markdown: '*text*' },
    { label: 'Code', markdown: '`code`' },
    { label: 'Link', markdown: '[text](url)' },
    { label: 'List', markdown: '\n- item 1\n- item 2\n- item 3' },
    { label: 'Table', markdown: '\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |' },
    { label: 'Code Block', markdown: '\n```language\ncode block\n```' },
  ];

  return (
    <div className="pt-2">
      <div className="flex flex-wrap gap-1.5">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => onToolClick(tool.markdown)}
            className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              e.currentTarget.style.color = '#a5b4fc';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
};
