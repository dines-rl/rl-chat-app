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
    <div className="border-t border-gray-200/60 pt-4 mt-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Markdown Tools</p>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={() => onToolClick(tool.markdown)}
            className="px-3 py-1.5 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 border border-gray-200/50"
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
};