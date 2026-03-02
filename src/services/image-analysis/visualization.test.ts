import { describe, it, expect } from 'vitest';
import { generateMermaidDiagram } from './visualization';
import type {
  ColorAnalysis,
  EdgeAnalysis,
  PatternAnalysis,
  ContentAnalysis,
  ImageDimensions,
} from './types';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const dimensions: ImageDimensions = { width: 1920, height: 1080 };

const colorAnalysis: ColorAnalysis = {
  dominantColors: ['rgb(224,224,224)', 'rgb(0,0,0)'],
  darkRatio: 0.2,
  lightRatio: 0.6,
  brightness: 0.7,
};

const edgeAnalysis: EdgeAnalysis = {
  horizontalEdges: 500,
  verticalEdges: 300,
  normalizedEdges: 0.08,
  rectangularShapes: 200,
};

const patternAnalysis: PatternAnalysis = {
  regularPatterns: 1500,
  totalPixels: 10000,
};

const contentAnalysis: ContentAnalysis = {
  isUIScreen: true,
  hasText: true,
  isErrorScreen: false,
  isDarkMode: false,
  isLightMode: true,
  contentType: 'User Interface (Light Theme)',
};

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('generateMermaidDiagram', () => {
  it('returns a string starting with the flowchart keyword', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    expect(diagram).toMatch(/^flowchart TD/);
  });

  it('embeds the image dimensions in the output', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    expect(diagram).toContain('1920x1080');
  });

  it('includes brightness formatted to one decimal place', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    // brightness = 0.7 → 70.0%
    expect(diagram).toContain('70.0%');
  });

  it('shows Light Theme when isLightMode is true and isDarkMode is false', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    expect(diagram).toContain('Light Theme');
  });

  it('shows Dark Theme when isDarkMode is true', () => {
    const darkContent: ContentAnalysis = {
      ...contentAnalysis,
      isDarkMode: true,
      isLightMode: false,
      contentType: 'User Interface (Dark Theme)',
    };
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      darkContent
    );
    expect(diagram).toContain('Dark Theme');
  });

  it('shows Mixed Theme when neither dark nor light', () => {
    const mixedContent: ContentAnalysis = {
      ...contentAnalysis,
      isDarkMode: false,
      isLightMode: false,
      contentType: 'User Interface',
    };
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      mixedContent
    );
    expect(diagram).toContain('Mixed Theme');
  });

  it('uses error class for Type node when isErrorScreen is true', () => {
    const errorContent: ContentAnalysis = {
      ...contentAnalysis,
      isErrorScreen: true,
      contentType: 'User Interface (Error Screen)',
    };
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      errorContent
    );
    expect(diagram).toContain('class Type error');
  });

  it('uses success class for Type node when isErrorScreen is false', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    expect(diagram).toContain('class Type success');
  });

  it('shows Structured UI when isUIScreen is true', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    expect(diagram).toContain('Structured UI');
  });

  it('shows Organic Layout when isUIScreen is false', () => {
    const nonUIContent: ContentAnalysis = {
      ...contentAnalysis,
      isUIScreen: false,
      contentType: 'Complex Image or Photo',
    };
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      nonUIContent
    );
    expect(diagram).toContain('Organic Layout');
  });

  it('sanitizes special characters from the contentType label', () => {
    const specialContent: ContentAnalysis = {
      ...contentAnalysis,
      contentType: 'Test [brackets] & <tags>',
    };
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      specialContent
    );
    // Special chars should be stripped
    expect(diagram).not.toContain('[brackets]');
    expect(diagram).not.toContain('<tags>');
    expect(diagram).not.toContain('&');
  });

  it('includes dark and light ratio percentages', () => {
    const diagram = generateMermaidDiagram(
      dimensions,
      colorAnalysis,
      edgeAnalysis,
      patternAnalysis,
      contentAnalysis
    );
    // darkRatio 0.2 → 20.0%, lightRatio 0.6 → 60.0%
    expect(diagram).toContain('20.0%');
    expect(diagram).toContain('60.0%');
  });
});
