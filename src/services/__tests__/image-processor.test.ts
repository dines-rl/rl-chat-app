import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock image-analysis modules so the canvas path doesn't run real pixel math
vi.mock('../image-analysis/analyzers', () => ({
  analyzeColors: vi.fn().mockReturnValue({
    dominantColors: ['rgb(128,128,128)'],
    darkRatio: 0.3,
    lightRatio: 0.3,
    brightness: 0.5,
  }),
  analyzeEdges: vi.fn().mockReturnValue({
    horizontalEdges: 10,
    verticalEdges: 10,
    normalizedEdges: 0.1,
    rectangularShapes: 5,
  }),
  analyzePatterns: vi.fn().mockReturnValue({ regularPatterns: 50, totalPixels: 100 }),
  analyzeContent: vi.fn().mockReturnValue({
    isUIScreen: false,
    hasText: false,
    isErrorScreen: false,
    isDarkMode: false,
    isLightMode: false,
    contentType: 'Complex Image or Photo',
  }),
}));

vi.mock('../image-analysis/visualization', () => ({
  generateMermaidDiagram: vi.fn().mockReturnValue('flowchart TD\n  A --> B'),
}));

import { processImage } from '../image-processor';

// ---------------------------------------------------------------------------
// jsdom helpers – stub FileReader and Image so async loading resolves
// ---------------------------------------------------------------------------

function stubBrowserAPIs() {
  // FileReader that resolves readAsDataURL immediately
  vi.stubGlobal(
    'FileReader',
    class {
      result: string | null = null;
      onload: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,AAAA';
        Promise.resolve().then(() => {
          if (this.onload) this.onload({});
        });
      }
    }
  );

  // Image that fires onload after setting src
  vi.stubGlobal(
    'Image',
    class {
      width = 10;
      height = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) {
        Promise.resolve().then(() => {
          if (this.onload) this.onload();
        });
      }
    }
  );

  // Canvas context stub
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const pixelCount = 10 * 10;
      const data = new Uint8ClampedArray(pixelCount * 4).fill(128);
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data }),
        }),
      } as unknown as HTMLCanvasElement;
    }
    // Fall back for other element types
    return document.createElement.call(document, tag);
  });
}

// ---------------------------------------------------------------------------
// Helper to create a File of any size/type
// ---------------------------------------------------------------------------
function makeFile(name: string, type: string, size = 100): File {
  const content = new Uint8Array(size).fill(0);
  return new File([content], name, { type });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processImage – input validation', () => {
  it('returns an error string for an unsupported file type', async () => {
    const file = makeFile('doc.pdf', 'application/pdf');
    const result = await processImage(file);
    expect(result).toContain('Image Analysis Error');
    expect(result).toContain('Unsupported image format');
  });

  it('returns an error string when the file exceeds 10 MB', async () => {
    const oversized = makeFile('big.png', 'image/png', 11 * 1024 * 1024);
    const result = await processImage(oversized);
    expect(result).toContain('Image Analysis Error');
    expect(result).toContain('exceeds maximum limit');
  });

  it('error output contains the supported format list', async () => {
    const file = makeFile('doc.bmp', 'image/bmp');
    const result = await processImage(file);
    expect(result).toMatch(/jpeg|png|webp|gif/i);
  });

  it('error output mentions the 10 MB size limit', async () => {
    const oversized = makeFile('huge.png', 'image/png', 11 * 1024 * 1024);
    const result = await processImage(oversized);
    expect(result).toContain('10MB');
  });
});

describe('processImage – valid formats', () => {
  beforeEach(() => {
    stubBrowserAPIs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['image.png', 'image/png'],
    ['image.webp', 'image/webp'],
    ['anim.gif', 'image/gif'],
  ])('accepts %s (%s) and returns analysis text', async (name, type) => {
    const file = makeFile(name, type);
    const result = await processImage(file);
    expect(result).not.toContain('Unsupported image format');
    expect(result).not.toContain('exceeds maximum limit');
    // Should contain analysis output (from the mocked analyzers / template)
    expect(result).toContain('Image Content Analysis');
  });

  it('includes the image dimensions in the analysis output', async () => {
    const file = makeFile('test.png', 'image/png');
    const result = await processImage(file);
    // Width and height come from our stubbed Image (10×10)
    expect(result).toContain('10x10px');
  });
});
