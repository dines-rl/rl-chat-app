import { describe, it, expect } from 'vitest';
import { generateMermaidDiagram } from '../visualization';
import type {
  ImageDimensions,
  ColorAnalysis,
  EdgeAnalysis,
  PatternAnalysis,
  ContentAnalysis,
} from '../types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const dims: ImageDimensions = { width: 800, height: 600 };

const colors: ColorAnalysis = {
  dominantColors: ['rgb(0,0,0)', 'rgb(255,255,255)'],
  darkRatio: 0.3,
  lightRatio: 0.5,
  brightness: 0.6,
};

const edges: EdgeAnalysis = {
  horizontalEdges: 500,
  verticalEdges: 300,
  normalizedEdges: 0.12,
  rectangularShapes: 50,
};

const patterns: PatternAnalysis = {
  regularPatterns: 120,
  totalPixels: 1000,
};

const uiContent: ContentAnalysis = {
  isUIScreen: true,
  hasText: true,
  isErrorScreen: false,
  isDarkMode: false,
  isLightMode: true,
  contentType: 'User Interface (Light Theme)',
};

const errorContent: ContentAnalysis = {
  isUIScreen: true,
  hasText: false,
  isErrorScreen: true,
  isDarkMode: false,
  isLightMode: false,
  contentType: 'User Interface (Error Screen)',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('generateMermaidDiagram', () => {
  it('returns a string starting with "flowchart TD"', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result.trimStart()).toMatch(/^flowchart TD/);
  });

  it('includes the image dimensions in the output', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('800x600');
  });

  it('includes brightness percentage', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    // brightness = 0.6 → "60.0%"
    expect(result).toContain('60.0%');
  });

  it('includes edge density percentage', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    // normalizedEdges = 0.12 → "12.0%"
    expect(result).toContain('12.0%');
  });

  it('includes pattern density percentage', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    // regularPatterns/totalPixels = 0.12 → "12.0%"
    expect(result).toContain('12.0%');
  });

  it('includes dark/light ratios', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    // darkRatio = 0.3 → "30.0%", lightRatio = 0.5 → "50.0%"
    expect(result).toContain('30.0%');
    expect(result).toContain('50.0%');
  });

  it('shows Light Theme when isLightMode is true', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('Light Theme');
  });

  it('shows Dark Theme when isDarkMode is true', () => {
    const darkContent: ContentAnalysis = {
      ...uiContent,
      isDarkMode: true,
      isLightMode: false,
      contentType: 'User Interface (Dark Theme)',
    };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, darkContent);
    expect(result).toContain('Dark Theme');
  });

  it('shows Mixed Theme when neither dark nor light mode', () => {
    const mixedContent: ContentAnalysis = {
      ...uiContent,
      isDarkMode: false,
      isLightMode: false,
      contentType: 'User Interface',
    };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, mixedContent);
    expect(result).toContain('Mixed Theme');
  });

  it('applies the "error" class for error screens', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, errorContent);
    expect(result).toContain('class Type error');
  });

  it('applies the "success" class for non-error screens', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('class Type success');
  });

  it('labels layout as "Structured UI" for UI screens', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('Structured UI');
  });

  it('labels layout as "Organic Layout" for non-UI screens', () => {
    const nonUIContent: ContentAnalysis = {
      ...uiContent,
      isUIScreen: false,
      contentType: 'Complex Image or Photo',
    };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, nonUIContent);
    expect(result).toContain('Organic Layout');
  });

  it('labels text density as "Text Heavy" when hasText is true', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('Text Heavy');
  });

  it('labels text density as "Visual Heavy" when hasText is false', () => {
    const noTextContent: ContentAnalysis = { ...uiContent, hasText: false };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, noTextContent);
    expect(result).toContain('Visual Heavy');
  });

  it('sanitizes special characters from contentType', () => {
    const weirdContent: ContentAnalysis = {
      ...uiContent,
      contentType: 'User Interface [Special & Chars]',
    };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, weirdContent);
    // Square brackets and ampersand should be stripped
    expect(result).not.toContain('[Special & Chars]');
    expect(result).toContain('User Interface');
  });

  it('preserves parentheses in contentType (they are allowed by the sanitizer)', () => {
    const contentWithParens: ContentAnalysis = {
      ...uiContent,
      contentType: 'User Interface (Light Theme)',
    };
    const result = generateMermaidDiagram(dims, colors, edges, patterns, contentWithParens);
    expect(result).toContain('User Interface (Light Theme)');
  });

  it('always includes the classDef section in output', () => {
    const result = generateMermaidDiagram(dims, colors, edges, patterns, uiContent);
    expect(result).toContain('classDef default');
    expect(result).toContain('classDef highlight');
    expect(result).toContain('classDef error');
    expect(result).toContain('classDef success');
  });
});
