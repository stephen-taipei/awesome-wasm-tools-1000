/**
 * IMG-002: JPG to PNG Converter
 *
 * Uses Canvas API to convert JPG/JPEG images to PNG format.
 * PNG is lossless, so no quality parameter is needed.
 *
 * Technical Implementation:
 * 1. Load JPG image into an Image element
 * 2. Draw the image onto a Canvas element
 * 3. Use canvas.toBlob() to export as PNG
 *
 * Note: JPG doesn't support transparency, so the output PNG will have
 * a solid background. File size typically increases since PNG is lossless.
 *
 * Performance Characteristics:
 * - Memory: ~3x original image size
 * - Processing time: <1 second for most images
 */

import { ImageConverterBase } from '/src/utils/ImageConverterBase.js';

class JpgToPngConverter extends ImageConverterBase {
  constructor() {
    super({
      inputFormats: ['image/jpeg', 'image/jpg'],
      outputFormat: 'image/png',
      outputExtension: 'png',
      showQuality: false, // PNG is lossless
      fillBackground: null // No background fill needed
    });
  }

  // Override validateFile to accept both jpeg and jpg
  validateFile(file) {
    return file.type === 'image/jpeg' || file.type === 'image/jpg';
  }
}

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new JpgToPngConverter();
});

export default JpgToPngConverter;
