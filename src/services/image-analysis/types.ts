export interface ColorAnalysis {
  dominantColors: string[];
  darkRatio: number;
  lightRatio: number;
  brightness: number;
}

export interface EdgeAnalysis {
  horizontalEdges: number;
  verticalEdges: number;
  normalizedEdges: number;
  rectangularShapes: number;
}

export interface PatternAnalysis {
  regularPatterns: number;
  totalPixels: number;
}

export interface ContentAnalysis {
  isUIScreen: boolean;
  hasText: boolean;
  isErrorScreen: boolean;
  isDarkMode: boolean;
  isLightMode: boolean;
  contentType: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}