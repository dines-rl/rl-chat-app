import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeColors, analyzeEdges, analyzePatterns, analyzeContent } from '../analyzers';
import type { ColorAnalysis, EdgeAnalysis, PatternAnalysis } from '../types';

// ---------------------------------------------------------------------------
// analyzeColors
// ---------------------------------------------------------------------------
describe('analyzeColors', () => {
  it('returns zero brightness and empty dominant colors for fully transparent pixels', () => {
    // 1 pixel, RGBA = (255,0,0,0) — transparent, should be skipped
    const data = new Uint8ClampedArray([255, 0, 0, 0]);
    const result = analyzeColors(data, 1);

    expect(result.dominantColors).toHaveLength(0);
    expect(result.brightness).toBe(0);
    expect(result.darkRatio).toBe(0);
    expect(result.lightRatio).toBe(0);
  });

  it('classifies a pure black pixel as dark', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255]);
    const result = analyzeColors(data, 1);

    expect(result.darkRatio).toBe(1);
    expect(result.lightRatio).toBe(0);
    expect(result.brightness).toBeCloseTo(0, 5);
  });

  it('classifies a pure white pixel as light', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255]);
    const result = analyzeColors(data, 1);

    expect(result.lightRatio).toBe(1);
    expect(result.darkRatio).toBe(0);
    expect(result.brightness).toBeCloseTo(1, 5);
  });

  it('returns at most 3 dominant colors', () => {
    // Build 5 distinct fully-opaque colors with enough pixels each
    const pixels: number[] = [];
    const colors = [
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ];
    // Repeat each color 10 times so they all get counted
    colors.forEach(([r, g, b]) => {
      for (let i = 0; i < 10; i++) {
        pixels.push(r, g, b, 255);
      }
    });
    const data = new Uint8ClampedArray(pixels);
    const result = analyzeColors(data, 50);

    expect(result.dominantColors.length).toBeLessThanOrEqual(3);
  });

  it('sorts dominant colors by frequency (most common first)', () => {
    // 3 white pixels vs 1 red pixel
    // Math.round(255/32)*32 = 256, so white → rgb(256,256,256)
    // Math.round(0/32)*32 = 0, so red → rgb(256,0,0)
    const data = new Uint8ClampedArray([
      255, 255, 255, 255, // white
      255, 255, 255, 255, // white
      255, 255, 255, 255, // white
      255, 0, 0, 255,     // red
    ]);
    const result = analyzeColors(data, 4);

    expect(result.dominantColors[0]).toBe('rgb(256,256,256)');
  });

  it('correctly mixes dark and light pixels', () => {
    // 1 black + 1 white = 50% each
    const data = new Uint8ClampedArray([
      0, 0, 0, 255,       // black → dark
      255, 255, 255, 255, // white → light
    ]);
    const result = analyzeColors(data, 2);

    expect(result.darkRatio).toBe(0.5);
    expect(result.lightRatio).toBe(0.5);
  });

  it('skips pixels with alpha 127 but counts pixels with alpha 128', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 127, // alpha < 128 → skipped
      0, 0, 0, 128, // alpha >= 128 → counted as dark
    ]);
    const result = analyzeColors(data, 2);

    expect(result.dominantColors).toHaveLength(1);
    expect(result.darkRatio).toBe(0.5); // 1 dark out of totalPixels=2
  });

  it('does not classify mid-range pixels as dark or light', () => {
    // brightness = (128+128+128)/3 = 128 → not < 85, not > 170
    const data = new Uint8ClampedArray([128, 128, 128, 255]);
    const result = analyzeColors(data, 1);

    expect(result.darkRatio).toBe(0);
    expect(result.lightRatio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// analyzeEdges (requires a mocked CanvasRenderingContext2D)
// ---------------------------------------------------------------------------
describe('analyzeEdges', () => {
  const makeCtx = (pixelMap: Record<string, Uint8ClampedArray>) => ({
    getImageData: vi.fn((x: number, y: number) => ({
      data: pixelMap[`${x},${y}`] ?? new Uint8ClampedArray([128, 128, 128, 255]),
    })),
  }) as unknown as CanvasRenderingContext2D;

  it('returns zero edges for a uniform image', () => {
    // Every pixel the same brightness → diffs always 0
    const ctx = makeCtx({});
    const result = analyzeEdges(ctx, 3, 3);

    expect(result.horizontalEdges).toBe(0);
    expect(result.verticalEdges).toBe(0);
    expect(result.rectangularShapes).toBe(0);
    expect(result.normalizedEdges).toBe(0);
  });

  it('detects a horizontal edge when adjacent pixels differ strongly', () => {
    // (1,1) is white; (0,1) left is black → diff > 50
    const ctx = makeCtx({
      '1,1': new Uint8ClampedArray([255, 255, 255, 255]), // current
      '0,1': new Uint8ClampedArray([0, 0, 0, 255]),       // left
      '1,0': new Uint8ClampedArray([255, 255, 255, 255]), // top (no vertical edge)
    });
    const result = analyzeEdges(ctx, 2, 2);

    expect(result.horizontalEdges).toBeGreaterThan(0);
  });

  it('detects a vertical edge when pixels above differ strongly', () => {
    const ctx = makeCtx({
      '1,1': new Uint8ClampedArray([255, 255, 255, 255]), // current
      '0,1': new Uint8ClampedArray([255, 255, 255, 255]), // left (no horizontal edge)
      '1,0': new Uint8ClampedArray([0, 0, 0, 255]),       // top
    });
    const result = analyzeEdges(ctx, 2, 2);

    expect(result.verticalEdges).toBeGreaterThan(0);
  });

  it('counts normalizedEdges relative to total pixels', () => {
    const ctx = makeCtx({});
    const result = analyzeEdges(ctx, 4, 4);

    const totalPixels = 4 * 4;
    expect(result.normalizedEdges).toBe(
      (result.horizontalEdges + result.verticalEdges) / totalPixels
    );
  });

  it('increments rectangularShapes when both horizontal and vertical edges fire at the same pixel', () => {
    // (1,1) differs strongly from both its left (0,1) and top (1,0) neighbours
    const ctx = makeCtx({
      '1,1': new Uint8ClampedArray([255, 255, 255, 255]), // current: bright
      '0,1': new Uint8ClampedArray([0, 0, 0, 255]),       // left: dark  → horizontal edge
      '1,0': new Uint8ClampedArray([0, 0, 0, 255]),       // top: dark   → vertical edge
    });
    const result = analyzeEdges(ctx, 2, 2);

    expect(result.rectangularShapes).toBe(1);
    expect(result.horizontalEdges).toBe(1);
    expect(result.verticalEdges).toBe(1);
  });

  it('does not count an edge when the brightness difference is exactly 50', () => {
    // diff must be > 50 to count; exactly 50 should be ignored
    // brightness: current = (178+178+178)/3 = 178, left = (128+128+128)/3 = 128 → diff = 50
    const ctx = makeCtx({
      '1,1': new Uint8ClampedArray([178, 178, 178, 255]),
      '0,1': new Uint8ClampedArray([128, 128, 128, 255]),
      '1,0': new Uint8ClampedArray([178, 178, 178, 255]),
    });
    const result = analyzeEdges(ctx, 2, 2);

    expect(result.horizontalEdges).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// analyzePatterns (requires a mocked CanvasRenderingContext2D)
// ---------------------------------------------------------------------------
describe('analyzePatterns', () => {
  it('returns totalPixels equal to width * height', () => {
    const ctx = {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(9 * 4).fill(128) })),
    } as unknown as CanvasRenderingContext2D;

    const result = analyzePatterns(ctx, 5, 5);

    expect(result.totalPixels).toBe(25);
  });

  it('counts regular patterns when a 3x3 window closely matches the current pixel', () => {
    // All pixels are the same color → every position should be "regular"
    const uniformData = new Uint8ClampedArray(9 * 4).fill(100);
    const currentPixel = new Uint8ClampedArray([100, 100, 100, 255]);

    const ctx = {
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        if (w === 3 && h === 3) return { data: uniformData };
        return { data: currentPixel };
      }),
    } as unknown as CanvasRenderingContext2D;

    const result = analyzePatterns(ctx, 5, 5);

    expect(result.regularPatterns).toBeGreaterThan(0);
  });

  it('counts zero regular patterns when window colors differ greatly from current pixel', () => {
    const patternData = new Uint8ClampedArray(9 * 4).fill(0);   // black window
    const currentPixel = new Uint8ClampedArray([255, 255, 255, 255]); // white pixel

    const ctx = {
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        if (w === 3 && h === 3) return { data: patternData };
        return { data: currentPixel };
      }),
    } as unknown as CanvasRenderingContext2D;

    const result = analyzePatterns(ctx, 5, 5);

    expect(result.regularPatterns).toBe(0);
  });

  it('returns 0 regular patterns when the image is too small to sample (3×3 or smaller)', () => {
    // Loop starts at y=3 and x=3, so a 3×3 image never enters the loop body
    const ctx = {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(9 * 4).fill(128) })),
    } as unknown as CanvasRenderingContext2D;

    const result = analyzePatterns(ctx, 3, 3);

    expect(result.regularPatterns).toBe(0);
    expect(result.totalPixels).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// analyzeContent
// ---------------------------------------------------------------------------
describe('analyzeContent', () => {
  const baseColor: ColorAnalysis = {
    dominantColors: [],
    darkRatio: 0,
    lightRatio: 0,
    brightness: 0.5,
  };

  const baseEdge: EdgeAnalysis = {
    horizontalEdges: 0,
    verticalEdges: 0,
    normalizedEdges: 0,
    rectangularShapes: 0,
  };

  const basePattern: PatternAnalysis = {
    regularPatterns: 0,
    totalPixels: 100,
  };

  it('detects UI screen when rectangularShapes and regularPatterns are high', () => {
    const result = analyzeContent(
      baseColor,
      { ...baseEdge, rectangularShapes: 2, normalizedEdges: 0.05 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isUIScreen).toBe(true);
    expect(result.contentType).toContain('User Interface');
  });

  it('labels dark mode UI when darkRatio is high', () => {
    const result = analyzeContent(
      { ...baseColor, darkRatio: 0.8, lightRatio: 0.05 },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isDarkMode).toBe(true);
    expect(result.contentType).toContain('Dark Theme');
  });

  it('labels light mode UI when lightRatio is high', () => {
    const result = analyzeContent(
      { ...baseColor, darkRatio: 0.05, lightRatio: 0.8 },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isLightMode).toBe(true);
    expect(result.contentType).toContain('Light Theme');
  });

  it('detects error screen when light background has red dominant color', () => {
    const result = analyzeContent(
      {
        dominantColors: ['rgb(255,0,0)'],
        darkRatio: 0.1,
        lightRatio: 0.7,
        brightness: 0.8,
      },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isErrorScreen).toBe(true);
    expect(result.contentType).toContain('Error Screen');
  });

  it('classifies as Document when text heavy and high edge density', () => {
    const result = analyzeContent(
      baseColor,
      {
        horizontalEdges: 300,
        verticalEdges: 100,
        normalizedEdges: 0.25,
        rectangularShapes: 0,
      },
      basePattern
    );

    expect(result.hasText).toBe(true);
    expect(result.contentType).toBe('Document or Text Content');
  });

  it('classifies as Simple Graphic when edge density is very low', () => {
    const result = analyzeContent(
      baseColor,
      { ...baseEdge, normalizedEdges: 0.02 },
      basePattern
    );

    expect(result.contentType).toBe('Simple Graphic or Icon');
  });

  it('classifies as Complex Image for mid-range edges with no UI indicators', () => {
    const result = analyzeContent(
      baseColor,
      {
        horizontalEdges: 100,
        verticalEdges: 100,
        normalizedEdges: 0.15,
        rectangularShapes: 0,
      },
      basePattern
    );

    expect(result.contentType).toBe('Complex Image or Photo');
  });

  it('detects error screen when pink is a dominant color (not just red)', () => {
    const result = analyzeContent(
      {
        dominantColors: ['rgb(255,192,192)'],
        darkRatio: 0.1,
        lightRatio: 0.7,
        brightness: 0.8,
      },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isErrorScreen).toBe(true);
  });

  it('does not classify as Document when hasText is true but normalizedEdges is below 0.2', () => {
    // hasText requires horizontalEdges > verticalEdges * 1.5 AND normalizedEdges > 0.1
    // But Document also requires normalizedEdges > 0.2
    const result = analyzeContent(
      baseColor,
      {
        horizontalEdges: 200,
        verticalEdges: 100,
        normalizedEdges: 0.15, // > 0.1 (hasText) but < 0.2 (not Document)
        rectangularShapes: 0,
      },
      basePattern
    );

    expect(result.hasText).toBe(true);
    expect(result.contentType).toBe('Complex Image or Photo');
  });

  it('does not flag as UI screen when regularPatterns threshold is not met', () => {
    // rectangularShapes passes (> 1% of 100 = 1) but regularPatterns fails (< 10% of 100 = 10)
    const result = analyzeContent(
      baseColor,
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 5, totalPixels: 100 } // 5 < 10
    );

    expect(result.isUIScreen).toBe(false);
  });

  it('does not flag error screen when darkRatio is exactly 0.2 (boundary is < 0.2)', () => {
    const result = analyzeContent(
      {
        dominantColors: ['rgb(255,0,0)'],
        darkRatio: 0.2,   // not < 0.2 → condition fails
        lightRatio: 0.7,
        brightness: 0.7,
      },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isErrorScreen).toBe(false);
  });

  it('does not flag error screen when lightRatio is exactly 0.6 (boundary is > 0.6)', () => {
    const result = analyzeContent(
      {
        dominantColors: ['rgb(255,0,0)'],
        darkRatio: 0.1,
        lightRatio: 0.6,  // not > 0.6 → condition fails
        brightness: 0.7,
      },
      { ...baseEdge, rectangularShapes: 2 },
      { regularPatterns: 15, totalPixels: 100 }
    );

    expect(result.isErrorScreen).toBe(false);
  });
});
