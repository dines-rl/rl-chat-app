import { ColorAnalysis, EdgeAnalysis, PatternAnalysis, ContentAnalysis } from './types';

export const analyzeColors = (data: Uint8ClampedArray, totalPixels: number): ColorAnalysis => {
  const colorCounts: { [key: string]: number } = {};
  let brightness = 0;
  let darkPixels = 0;
  let lightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    const quantizedColor = `rgb(${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32})`;
    colorCounts[quantizedColor] = (colorCounts[quantizedColor] || 0) + 1;

    const pixelBrightness = (r + g + b) / 3;
    brightness += pixelBrightness;

    if (pixelBrightness < 85) darkPixels++;
    if (pixelBrightness > 170) lightPixels++;
  }

  const dominantColors = Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([color]) => color);

  return {
    dominantColors,
    darkRatio: darkPixels / totalPixels,
    lightRatio: lightPixels / totalPixels,
    brightness: brightness / totalPixels / 255
  };
};

export const analyzeEdges = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): EdgeAnalysis => {
  let horizontalEdges = 0;
  let verticalEdges = 0;
  let rectangularShapes = 0;

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const current = ctx.getImageData(x, y, 1, 1).data;
      const left = ctx.getImageData(x - 1, y, 1, 1).data;
      const top = ctx.getImageData(x, y - 1, 1, 1).data;

      const currentBrightness = (current[0] + current[1] + current[2]) / 3;
      const leftBrightness = (left[0] + left[1] + left[2]) / 3;
      const topBrightness = (top[0] + top[1] + top[2]) / 3;

      const horizontalDiff = Math.abs(currentBrightness - leftBrightness);
      const verticalDiff = Math.abs(currentBrightness - topBrightness);

      if (horizontalDiff > 50) horizontalEdges++;
      if (verticalDiff > 50) verticalEdges++;
      if (horizontalDiff > 50 && verticalDiff > 50) rectangularShapes++;
    }
  }

  const totalPixels = width * height;
  return {
    horizontalEdges,
    verticalEdges,
    normalizedEdges: (horizontalEdges + verticalEdges) / totalPixels,
    rectangularShapes
  };
};

export const analyzePatterns = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): PatternAnalysis => {
  let regularPatterns = 0;
  const totalPixels = width * height;

  for (let y = 3; y < height; y++) {
    for (let x = 3; x < width; x++) {
      const pattern = ctx.getImageData(x - 3, y - 3, 3, 3).data;
      const current = ctx.getImageData(x, y, 1, 1).data;
      
      let isRegular = true;
      for (let p = 0; p < pattern.length; p += 4) {
        if (Math.abs(pattern[p] - current[0]) > 20 || 
            Math.abs(pattern[p + 1] - current[1]) > 20 || 
            Math.abs(pattern[p + 2] - current[2]) > 20) {
          isRegular = false;
          break;
        }
      }
      if (isRegular) regularPatterns++;
    }
  }

  return { regularPatterns, totalPixels };
};

export const analyzeContent = (
  colorAnalysis: ColorAnalysis,
  edgeAnalysis: EdgeAnalysis,
  patternAnalysis: PatternAnalysis
): ContentAnalysis => {
  const { darkRatio, lightRatio, dominantColors } = colorAnalysis;
  const { normalizedEdges, rectangularShapes } = edgeAnalysis;
  const { regularPatterns, totalPixels } = patternAnalysis;

  const isUIScreen = rectangularShapes > totalPixels * 0.01 && regularPatterns > totalPixels * 0.1;
  const hasText = edgeAnalysis.horizontalEdges > edgeAnalysis.verticalEdges * 1.5 && normalizedEdges > 0.1;
  const isErrorScreen = darkRatio < 0.2 && lightRatio > 0.6 && 
    dominantColors.some(c => c.includes('rgb(255,0,0)') || c.includes('rgb(255,192,192)'));
  const isDarkMode = darkRatio > 0.7;
  const isLightMode = lightRatio > 0.7;

  let contentType = 'Unknown';
  if (isUIScreen) {
    contentType = 'User Interface';
    if (isErrorScreen) contentType += ' (Error Screen)';
    else if (isDarkMode) contentType += ' (Dark Theme)';
    else if (isLightMode) contentType += ' (Light Theme)';
  } else if (hasText && normalizedEdges > 0.2) {
    contentType = 'Document or Text Content';
  } else if (normalizedEdges < 0.05) {
    contentType = 'Simple Graphic or Icon';
  } else {
    contentType = 'Complex Image or Photo';
  }

  return {
    isUIScreen,
    hasText,
    isErrorScreen,
    isDarkMode,
    isLightMode,
    contentType
  };
};