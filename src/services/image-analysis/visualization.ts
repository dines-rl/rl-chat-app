import { ColorAnalysis, EdgeAnalysis, PatternAnalysis, ContentAnalysis, ImageDimensions } from './types';

export const generateMermaidDiagram = (
  dimensions: ImageDimensions,
  colorAnalysis: ColorAnalysis,
  edgeAnalysis: EdgeAnalysis,
  patternAnalysis: PatternAnalysis,
  contentAnalysis: ContentAnalysis
): string => {
  const { contentType, isUIScreen, hasText, isErrorScreen } = contentAnalysis;
  const sanitizedContentType = contentType.replace(/[^a-zA-Z0-9\s()-]/g, '');
  
  return `flowchart TD
    ImageAnalysis[Image Analysis] --> ContentType[Content Type]
    ImageAnalysis --> VisualElements[Visual Elements]
    ImageAnalysis --> TechDetails[Technical Details]
    
    ContentType --> Type["${sanitizedContentType}"]
    
    VisualElements --> Colors[Colors]
    VisualElements --> Layout[Layout]
    VisualElements --> Components[Components]
    
    Colors --> Brightness["Brightness ${(colorAnalysis.brightness * 100).toFixed(1)}%"]
    Colors --> Theme["${contentAnalysis.isDarkMode ? 'Dark Theme' : contentAnalysis.isLightMode ? 'Light Theme' : 'Mixed Theme'}"]
    
    Layout --> LayoutType["${isUIScreen ? 'Structured UI' : 'Organic Layout'}"]
    Layout --> TextDensity["${hasText ? 'Text Heavy' : 'Visual Heavy'}"]
    
    Components --> EdgeDensity["Edge ${(edgeAnalysis.normalizedEdges * 100).toFixed(1)}%"]
    Components --> PatternDensity["Pattern ${((patternAnalysis.regularPatterns / patternAnalysis.totalPixels) * 100).toFixed(1)}%"]
    
    TechDetails --> Resolution[Resolution]
    TechDetails --> Composition[Composition]
    
    Resolution --> Size["${dimensions.width}x${dimensions.height}"]
    Composition --> Dark["Dark ${(colorAnalysis.darkRatio * 100).toFixed(1)}%"]
    Composition --> Light["Light ${(colorAnalysis.lightRatio * 100).toFixed(1)}%"]
    
    classDef default fill:#f4f4f4,stroke:#333,stroke-width:1px
    classDef highlight fill:#e1e1e1,stroke:#666
    classDef error fill:#ffe6e6,stroke:#c66
    classDef success fill:#e6ffe6,stroke:#6c6
    
    class ImageAnalysis highlight
    class Type ${isErrorScreen ? 'error' : 'success'}
    class Brightness,Theme,LayoutType,TextDensity,EdgeDensity,PatternDensity,Size,Dark,Light default`;
};