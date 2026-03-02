import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeColors, analyzeEdges, analyzePatterns, analyzeContent } from '../analyzers';

// ---------------------------------------------------------------------------
// analyzeColors
// ---------------------------------------------------------------------------

describe('analyzeColors', () => {
  it('returns three dominant colors', () => {
    // 4 pixels: 2 red, 1 green, 1 blue (fully opaque)
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ]);
    const result = analyzeColors(data, 4);
    // We should get up to 3 dominant colors
    expect(result.dominantColors.length).toBeLessThanOrEqual(3);
    expect(result.dominantColors.length).toBeGreaterThan(0);
  });

  it('skips transparent pixels (alpha < 128)', () => {
    // 2 transparent red pixels, 1 opaque white pixel
    const data = new Uint8ClampedArray([
      255, 0, 0, 0,    // transparent – should be ignored
      255, 0, 0, 127,  // also transparent – should be ignored
      255, 255, 255, 255, // opaque white
      0, 0, 0, 0,      // transparent black
    ]);
    const result = analyzeColors(data, 4);
    // Only the white pixel contributes; there should be exactly one color
    expect(result.dominantColors.length).toBe(1);
  });

  it('computes high brightness for all-white image', () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
    const result = analyzeColors(data, 2);
    expect(result.brightness).toBeCloseTo(1, 1);
  });

  it('computes low brightness for all-black image', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255,
      0, 0, 0, 255,
    ]);
    const result = analyzeColors(data, 2);
    expect(result.brightness).toBeCloseTo(0, 2);
  });

  it('reports high darkRatio for mostly-dark image', () => {
    // pixelBrightness = 50 < 85 → darkPixel
    const data = new Uint8ClampedArray([
      50, 50, 50, 255,
      50, 50, 50, 255,
      50, 50, 50, 255,
    ]);
    const result = analyzeColors(data, 3);
    expect(result.darkRatio).toBeCloseTo(1, 1);
    expect(result.lightRatio).toBe(0);
  });

  it('reports high lightRatio for mostly-light image', () => {
    // pixelBrightness = 200 > 170 → lightPixel
    const data = new Uint8ClampedArray([
      200, 200, 200, 255,
      200, 200, 200, 255,
    ]);
    const result = analyzeColors(data, 2);
    expect(result.lightRatio).toBeCloseTo(1, 1);
    expect(result.darkRatio).toBe(0);
  });

  it('quantizes colors into groups', () => {
    // Two pixels that differ by only 1 in each channel should map to the same
    // quantized color (step of 32)
    const data = new Uint8ClampedArray([
      32, 32, 32, 255,
      33, 33, 33, 255,
    ]);
    const result = analyzeColors(data, 2);
    expect(result.dominantColors.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// analyzeEdges  (requires a mocked CanvasRenderingContext2D)
// ---------------------------------------------------------------------------

function makeCtx(getPixel: (x: number, y: number) => [number, number, number, number]) {
  return {
    getImageData: vi.fn((x: number, y: number) => ({
      data: getPixel(x, y),
    })),
  } as unknown as CanvasRenderingContext2D;
}

describe('analyzeEdges', () => {
  it('returns zero edges for a uniform image', () => {
    // Every pixel is the same brightness → no differences > 50
    const ctx = makeCtx(() => [128, 128, 128, 255]);
    const result = analyzeEdges(ctx, 3, 3);
    expect(result.horizontalEdges).toBe(0);
    expect(result.verticalEdges).toBe(0);
    expect(result.rectangularShapes).toBe(0);
  });

  it('detects horizontal edges where left-neighbor differs', () => {
    // Current pixel is white; left neighbor is black → diff 255 > 50
    const ctx = makeCtx((x) => (x === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const result = analyzeEdges(ctx, 3, 3);
    expect(result.horizontalEdges).toBeGreaterThan(0);
  });

  it('detects vertical edges where top-neighbor differs', () => {
    const ctx = makeCtx((_x, y) => (y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const result = analyzeEdges(ctx, 3, 3);
    expect(result.verticalEdges).toBeGreaterThan(0);
  });

  it('normalizedEdges equals (h + v) / totalPixels', () => {
    const ctx = makeCtx(() => [128, 128, 128, 255]);
    const result = analyzeEdges(ctx, 4, 4);
    const expected = (result.horizontalEdges + result.verticalEdges) / (4 * 4);
    expect(result.normalizedEdges).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// analyzePatterns  (requires a mocked CanvasRenderingContext2D)
// ---------------------------------------------------------------------------

describe('analyzePatterns', () => {
  it('counts regular patterns for a uniform canvas', () => {
    // Uniform canvas: every 3×3 patch equals the single current pixel → all regular
    const ctx = {
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
        const size = w * h * 4;
        const d = new Uint8ClampedArray(size).fill(128);
        // set alpha to 255
        for (let i = 3; i < size; i += 4) d[i] = 255;
        return { data: d };
      }),
    } as unknown as CanvasRenderingContext2D;

    const result = analyzePatterns(ctx, 5, 5);
    // Every pixel from (3,3) onwards should be regular
    expect(result.regularPatterns).toBeGreaterThan(0);
    expect(result.totalPixels).toBe(25);
  });

  it('totalPixels equals width * height', () => {
    const ctx = {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4).fill(0) })),
    } as unknown as CanvasRenderingContext2D;
    const result = analyzePatterns(ctx, 6, 7);
    expect(result.totalPixels).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// analyzeContent
// ---------------------------------------------------------------------------

describe('analyzeContent', () => {
  const baseColor = {
    dominantColors: ['rgb(128,128,128)'],
    darkRatio: 0.3,
    lightRatio: 0.3,
    brightness: 0.5,
  };

  const baseEdge = {
    horizontalEdges: 100,
    verticalEdges: 100,
    normalizedEdges: 0.05,
    rectangularShapes: 10,
  };

  const basePattern = { regularPatterns: 50, totalPixels: 100 };

  it('identifies a UI screen when rectangularShapes and regularPatterns are high', () => {
    const edge = { ...baseEdge, rectangularShapes: 200 }; // > 1% of 1000
    const pattern = { regularPatterns: 200, totalPixels: 1000 }; // > 10%
    const result = analyzeContent(baseColor, edge, pattern);
    expect(result.isUIScreen).toBe(true);
    expect(result.contentType).toContain('User Interface');
  });

  it('marks isDarkMode when darkRatio > 0.7', () => {
    const color = { ...baseColor, darkRatio: 0.8, lightRatio: 0.05 };
    const edge = { ...baseEdge, rectangularShapes: 200 };
    const pattern = { regularPatterns: 200, totalPixels: 1000 };
    const result = analyzeContent(color, edge, pattern);
    expect(result.isDarkMode).toBe(true);
    expect(result.isLightMode).toBe(false);
    expect(result.contentType).toContain('Dark Theme');
  });

  it('marks isLightMode when lightRatio > 0.7', () => {
    const color = { ...baseColor, darkRatio: 0.05, lightRatio: 0.8 };
    const edge = { ...baseEdge, rectangularShapes: 200 };
    const pattern = { regularPatterns: 200, totalPixels: 1000 };
    const result = analyzeContent(color, edge, pattern);
    expect(result.isDarkMode).toBe(false);
    expect(result.isLightMode).toBe(true);
    expect(result.contentType).toContain('Light Theme');
  });

  it('detects error screen with red dominant color and low darkRatio / high lightRatio', () => {
    const color = {
      dominantColors: ['rgb(255,0,0)', 'rgb(128,128,128)'],
      darkRatio: 0.1,
      lightRatio: 0.7,
      brightness: 0.6,
    };
    const result = analyzeContent(color, baseEdge, basePattern);
    expect(result.isErrorScreen).toBe(true);
  });

  it('classifies as Document when hasText conditions met', () => {
    // hasText: horizontalEdges > verticalEdges * 1.5 AND normalizedEdges > 0.1
    // contentType "Document": also requires normalizedEdges > 0.2
    const edge = {
      horizontalEdges: 300,
      verticalEdges: 100,
      normalizedEdges: 0.25,
      rectangularShapes: 0, // not a UI screen
    };
    const pattern = { regularPatterns: 0, totalPixels: 1000 };
    const result = analyzeContent(baseColor, edge, pattern);
    expect(result.hasText).toBe(true);
    expect(result.contentType).toBe('Document or Text Content');
  });

  it('classifies as Simple Graphic when normalizedEdges < 0.05', () => {
    const edge = { ...baseEdge, normalizedEdges: 0.03, rectangularShapes: 0 };
    const pattern = { regularPatterns: 0, totalPixels: 1000 };
    const result = analyzeContent(baseColor, edge, pattern);
    expect(result.contentType).toBe('Simple Graphic or Icon');
  });

  it('classifies as Complex Image when no other conditions match', () => {
    const edge = {
      horizontalEdges: 50,
      verticalEdges: 50,
      normalizedEdges: 0.1,
      rectangularShapes: 0,
    };
    const pattern = { regularPatterns: 0, totalPixels: 1000 };
    const result = analyzeContent(baseColor, edge, pattern);
    expect(result.contentType).toBe('Complex Image or Photo');
  });
});
