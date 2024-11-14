import {
  ColorAnalysis,
  EdgeAnalysis,
  PatternAnalysis,
  ContentAnalysis,
  ImageDimensions
} from './image-analysis/types';
import {
  analyzeColors,
  analyzeEdges,
  analyzePatterns,
  analyzeContent
} from './image-analysis/analyzers';
import { generateMermaidDiagram } from './image-analysis/visualization';

const analyzeImageLocally = async (imageData: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const dimensions: ImageDimensions = {
          width: img.width,
          height: img.height
        };

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const totalPixels = canvas.width * canvas.height;

        const colorAnalysis = analyzeColors(imageData.data, totalPixels);
        const edgeAnalysis = analyzeEdges(ctx, canvas.width, canvas.height);
        const patternAnalysis = analyzePatterns(ctx, canvas.width, canvas.height);
        const contentAnalysis = analyzeContent(colorAnalysis, edgeAnalysis, patternAnalysis);

        const mermaidDiagram = generateMermaidDiagram(
          dimensions,
          colorAnalysis,
          edgeAnalysis,
          patternAnalysis,
          contentAnalysis
        );

        resolve(`Image Content Analysis:
- Type: ${contentAnalysis.contentType}
- Dimensions: ${dimensions.width}x${dimensions.height}px

Visual Elements:
- Dominant Colors: ${colorAnalysis.dominantColors.join(', ')}
- Brightness: ${(colorAnalysis.brightness * 100).toFixed(1)}%
- Contrast: ${(edgeAnalysis.normalizedEdges * 100).toFixed(1)}% edge density

Content Detection:
${contentAnalysis.hasText ? '- Text: Significant text content detected' : '- Text: Minimal or no text content'}
${edgeAnalysis.rectangularShapes > totalPixels * 0.01 ? '- UI Elements: Multiple interface components detected' : '- UI Elements: Few or no interface components'}
${patternAnalysis.regularPatterns > totalPixels * 0.1 ? '- Patterns: Regular geometric patterns present' : '- Patterns: Organic or irregular patterns'}

Interface Analysis:
${contentAnalysis.isUIScreen ? `- Layout: Structured user interface detected
- Theme: ${contentAnalysis.isDarkMode ? 'Dark theme' : contentAnalysis.isLightMode ? 'Light theme' : 'Mixed theme'}
- Components: ${edgeAnalysis.rectangularShapes > totalPixels * 0.02 ? 'Multiple buttons/cards' : 'Minimal interactive elements'}` : '- Layout: Not a typical user interface'}

${contentAnalysis.isErrorScreen ? 'Warning: Potential error indicators detected' : 'Status: No error indicators detected'}

Technical Details:
- Edge Density: ${(edgeAnalysis.normalizedEdges * 100).toFixed(2)}%
- Dark/Light Ratio: ${(colorAnalysis.darkRatio * 100).toFixed(1)}%/${(colorAnalysis.lightRatio * 100).toFixed(1)}%
- Pattern Regularity: ${((patternAnalysis.regularPatterns / totalPixels) * 100).toFixed(1)}%

\`\`\`mermaid
${mermaidDiagram}
\`\`\`
`);
      } catch (error) {
        reject(new Error('Failed to analyze image: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
};

export const processImage = async (image: File): Promise<string> => {
  try {
    if (!image) {
      throw new Error('No image provided');
    }

    const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

    if (!SUPPORTED_FORMATS.includes(image.type)) {
      throw new Error(`Unsupported image format. Supported formats: ${SUPPORTED_FORMATS.map(f => f.split('/')[1]).join(', ')}`);
    }

    if (image.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image size exceeds maximum limit of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
    }

    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading image file'));
      reader.readAsDataURL(image);
    });

    return await analyzeImageLocally(base64Image);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Image processing error:', error);
    
    return `Image Analysis Error:
- Status: Unable to process image
- Reason: ${errorMessage}
- Recommendation: Please ensure the image is valid and try again
- Note: Continuing with text-only analysis
- Supported Formats: JPEG, PNG, WebP, GIF
- Maximum Size: 10MB`;
  }
};