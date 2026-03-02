import { describe, it, expect } from 'vitest';
import { generateMermaidDiagram } from '../visualization';
import type { ColorAnalysis, EdgeAnalysis, PatternAnalysis, ContentAnalysis, ImageDimensions } from '../types';

const defaultDimensions: ImageDimensions = { width: 800, height: 600 };

const defaultColor: ColorAnalysis = {
  dominantColors: ['rgb(128,128,128)'],
  darkRatio: 0.3,
  lightRatio: 0.3,
  brightness: 0.5,
};

const defaultEdge: EdgeAnalysis = {
  horizontalEdges: 100,
  verticalEdges: 80,
  normalizedEdges: 0.1,
  rectangularShapes: 20,
};

const defaultPattern: PatternAnalysis = {
  regularPatterns: 100,
  totalPixels: 1000,
};

const defaultContent: ContentAnalysis = {
  isUIScreen: false,
  hasText: false,
  isErrorScreen: false,
  isDarkMode: false,
  isLightMode: false,
  contentType: 'Complex Image or Photo',
};

describe('generateMermaidDiagram', () => {
  it('returns a string starting with "flowchart TD"', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result.trimStart()).toMatch(/^flowchart TD/);
  });

  it('includes the image dimensions in the output', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('800x600');
  });

  it('includes the content type string', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('Complex Image or Photo');
  });

  it('shows "Dark Theme" when isDarkMode is true', () => {
    const content = { ...defaultContent, isDarkMode: true };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    expect(result).toContain('Dark Theme');
  });

  it('shows "Light Theme" when isLightMode is true', () => {
    const content = { ...defaultContent, isLightMode: true };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    expect(result).toContain('Light Theme');
  });

  it('shows "Mixed Theme" when neither dark nor light mode', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('Mixed Theme');
  });

  it('applies "error" class to Type node when isErrorScreen is true', () => {
    const content = { ...defaultContent, isErrorScreen: true };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    expect(result).toContain('class Type error');
  });

  it('applies "success" class to Type node when not an error screen', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('class Type success');
  });

  it('shows "Structured UI" when isUIScreen is true', () => {
    const content = { ...defaultContent, isUIScreen: true };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    expect(result).toContain('Structured UI');
  });

  it('shows "Organic Layout" when isUIScreen is false', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('Organic Layout');
  });

  it('shows "Text Heavy" when hasText is true', () => {
    const content = { ...defaultContent, hasText: true };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    expect(result).toContain('Text Heavy');
  });

  it('includes edge density percentage', () => {
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    // normalizedEdges = 0.1 → 10.0%
    expect(result).toContain('10.0%');
  });

  it('includes brightness percentage', () => {
    // brightness = 0.5 → 50.0%
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, defaultContent
    );
    expect(result).toContain('50.0%');
  });

  it('sanitizes special characters from contentType', () => {
    const content = { ...defaultContent, contentType: 'Type & <script>' };
    const result = generateMermaidDiagram(
      defaultDimensions, defaultColor, defaultEdge, defaultPattern, content
    );
    // The angle brackets and ampersand should be stripped
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('&');
  });
});
