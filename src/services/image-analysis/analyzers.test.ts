import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeColors, analyzeEdges, analyzePatterns, analyzeContent } from './analyzers';
import type { ColorAnalysis, EdgeAnalysis, PatternAnalysis } from './types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Build a flat RGBA pixel buffer from an array of [r,g,b,a] tuples */
function buildPixelData(pixels: [number, number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return data;
}

/** Create a fake CanvasRenderingContext2D whose getImageData always returns
 *  `pixelValue` for every pixel regardless of coordinates. */
function fakeCtx(pixelValue: [number, number, number, number]): CanvasRenderingContext2D {
  return {
    getImageData: (_x: number, _y: number, _w: number, _h: number) => ({
      data: new Uint8ClampedArray(pixelValue),
    }),
  } as unknown as CanvasRenderingContext2D;
}

// ─────────────────────────────────────────────
// analyzeColors
// ─────────────────────────────────────────────

describe('analyzeColors', () => {
  it('returns expected dominant color for a uniform image', () => {
    // 4 identical bright red pixels
    const pixels: [number, number, number, number][] = Array(4).fill([255, 0, 0, 255]);
    const data = buildPixelData(pixels);
    const result = analyzeColors(data, 4);

    // quantized: r=256 clamps to 256 → Math.round(255/32)*32 = 8*32 = 256
    expect(result.dominantColors).toHaveLength(1);
    expect(result.dominantColors[0]).toMatch(/^rgb\(/);
  });

  it('skips transparent pixels (alpha < 128)', () => {
    // 4 fully transparent pixels
    const pixels: [number, number, number, number][] = Array(4).fill([255, 0, 0, 0]);
    const data = buildPixelData(pixels);
    const result = analyzeColors(data, 4);

    expect(result.dominantColors).toHaveLength(0);
    // ratios are relative to totalPixels; brightness should be 0
    expect(result.brightness).toBe(0);
  });

  it('calculates darkRatio correctly', () => {
    // 2 very dark pixels, 2 very bright pixels, all opaque
    const pixels: [number, number, number, number][] = [
      [0, 0, 0, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ];
    const data = buildPixelData(pixels);
    const result = analyzeColors(data, 4);

    expect(result.darkRatio).toBeCloseTo(0.5, 5);
    expect(result.lightRatio).toBeCloseTo(0.5, 5);
  });

  it('normalises brightness to [0, 1]', () => {
    // All pure white pixels
    const pixels: [number, number, number, number][] = Array(4).fill([255, 255, 255, 255]);
    const data = buildPixelData(pixels);
    const result = analyzeColors(data, 4);

    expect(result.brightness).toBeCloseTo(1, 5);
  });

  it('returns up to 3 dominant colors', () => {
    // 3 distinct colors
    const pixels: [number, number, number, number][] = [
      [0, 0, 0, 255],
      [128, 0, 0, 255],
      [0, 128, 0, 255],
      [0, 0, 128, 255],
    ];
    const data = buildPixelData(pixels);
    const result = analyzeColors(data, 4);

    expect(result.dominantColors.length).toBeLessThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────
// analyzeEdges
// ─────────────────────────────────────────────

describe('analyzeEdges', () => {
  it('returns zero edges when the entire image is uniform', () => {
    // Every pixel returns the same brightness → no edges
    const ctx = fakeCtx([128, 128, 128, 255]);
    const result = analyzeEdges(ctx, 3, 3);

    expect(result.horizontalEdges).toBe(0);
    expect(result.verticalEdges).toBe(0);
    expect(result.rectangularShapes).toBe(0);
    expect(result.normalizedEdges).toBe(0);
  });

  it('counts horizontal edges when brightness changes left→right', () => {
    // Return different brightness depending on x coordinate
    const ctx = {
      getImageData: (x: number, _y: number) => {
        const v = x === 0 ? 0 : 255;
        return { data: new Uint8ClampedArray([v, v, v, 255]) };
      },
    } as unknown as CanvasRenderingContext2D;

    const result = analyzeEdges(ctx, 3, 3);
    expect(result.horizontalEdges).toBeGreaterThan(0);
  });

  it('normalizedEdges equals (h+v) / (width*height)', () => {
    const ctx = fakeCtx([50, 50, 50, 255]);
    const width = 5;
    const height = 4;
    const result = analyzeEdges(ctx, width, height);

    expect(result.normalizedEdges).toBe(
      (result.horizontalEdges + result.verticalEdges) / (width * height)
    );
  });
});

// ─────────────────────────────────────────────
// analyzePatterns
// ─────────────────────────────────────────────

describe('analyzePatterns', () => {
  it('returns totalPixels = width * height', () => {
    const ctx = fakeCtx([100, 100, 100, 255]);
    const result = analyzePatterns(ctx, 10, 10);
    expect(result.totalPixels).toBe(100);
  });

  it('returns high regularPatterns for a perfectly uniform image', () => {
    // Every pixel is the same colour → neighbourhood always matches current pixel
    const ctx = fakeCtx([100, 100, 100, 255]);
    const width = 10;
    const height = 10;
    const result = analyzePatterns(ctx, width, height);

    // All pixels from (3,3) onward should be "regular"
    expect(result.regularPatterns).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// analyzeContent
// ─────────────────────────────────────────────

describe('analyzeContent', () => {
  const baseEdge: EdgeAnalysis = {
    horizontalEdges: 10,
    verticalEdges: 5,
    normalizedEdges: 0.15,
    rectangularShapes: 200,
  };

  const basePattern: PatternAnalysis = {
    regularPatterns: 1500,
    totalPixels: 10000,
  };

  it('identifies a UI screen when rectangularShapes and regularPatterns thresholds are met', () => {
    const color: ColorAnalysis = {
      dominantColors: ['rgb(224,224,224)'],
      darkRatio: 0.1,
      lightRatio: 0.8,
      brightness: 0.8,
    };
    const result = analyzeContent(color, baseEdge, basePattern);

    expect(result.isUIScreen).toBe(true);
  });

  it('marks dark mode when darkRatio > 0.7', () => {
    const color: ColorAnalysis = {
      dominantColors: [],
      darkRatio: 0.8,
      lightRatio: 0.05,
      brightness: 0.2,
    };
    const result = analyzeContent(color, baseEdge, basePattern);

    expect(result.isDarkMode).toBe(true);
    expect(result.isLightMode).toBe(false);
  });

  it('marks light mode when lightRatio > 0.7', () => {
    const color: ColorAnalysis = {
      dominantColors: [],
      darkRatio: 0.05,
      lightRatio: 0.8,
      brightness: 0.9,
    };
    const result = analyzeContent(color, baseEdge, basePattern);

    expect(result.isLightMode).toBe(true);
    expect(result.isDarkMode).toBe(false);
  });

  it('flags an error screen when red dominates and light ratio is high', () => {
    const color: ColorAnalysis = {
      dominantColors: ['rgb(255,0,0)'],
      darkRatio: 0.1,
      lightRatio: 0.75,
      brightness: 0.8,
    };
    const result = analyzeContent(color, baseEdge, basePattern);

    expect(result.isErrorScreen).toBe(true);
    expect(result.contentType).toContain('Error Screen');
  });

  it('classifies as Document when hasText is true and edges are dense', () => {
    // Not a UI screen (low rectangular shapes / low regular patterns)
    const nonUIEdge: EdgeAnalysis = {
      horizontalEdges: 600,
      verticalEdges: 100,
      normalizedEdges: 0.25,
      rectangularShapes: 5,           // below 1% of 10000
    };
    const nonUIPattern: PatternAnalysis = {
      regularPatterns: 500,           // below 10% of 10000
      totalPixels: 10000,
    };
    const color: ColorAnalysis = {
      dominantColors: [],
      darkRatio: 0.1,
      lightRatio: 0.3,
      brightness: 0.5,
    };
    const result = analyzeContent(color, nonUIEdge, nonUIPattern);

    expect(result.hasText).toBe(true);
    expect(result.contentType).toBe('Document or Text Content');
  });

  it('classifies as Simple Graphic when normalizedEdges is very low', () => {
    const flatEdge: EdgeAnalysis = {
      horizontalEdges: 1,
      verticalEdges: 0,
      normalizedEdges: 0.02,
      rectangularShapes: 0,
    };
    const flatPattern: PatternAnalysis = {
      regularPatterns: 50,
      totalPixels: 10000,
    };
    const color: ColorAnalysis = {
      dominantColors: [],
      darkRatio: 0.1,
      lightRatio: 0.1,
      brightness: 0.5,
    };
    const result = analyzeContent(color, flatEdge, flatPattern);

    expect(result.contentType).toBe('Simple Graphic or Icon');
  });

  it('classifies as Complex Image when no other rule matches', () => {
    const complexEdge: EdgeAnalysis = {
      horizontalEdges: 200,
      verticalEdges: 200,
      normalizedEdges: 0.1,
      rectangularShapes: 5,
    };
    const complexPattern: PatternAnalysis = {
      regularPatterns: 50,
      totalPixels: 10000,
    };
    const color: ColorAnalysis = {
      dominantColors: [],
      darkRatio: 0.3,
      lightRatio: 0.3,
      brightness: 0.5,
    };
    const result = analyzeContent(color, complexEdge, complexPattern);

    expect(result.contentType).toBe('Complex Image or Photo');
  });
});
