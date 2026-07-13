const Jimp = require('jimp');

/**
 * Compress image buffer to ensure it is under 300KB
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Buffer>} Compressed image buffer
 */
const compressImage = async (buffer) => {
  try {
    const image = await Jimp.read(buffer);
    
    // Resize image if it is too large (e.g., width > 1200px)
    if (image.getWidth() > 1200) {
      image.resize(1200, Jimp.AUTO);
    }
    
    // Start with quality 75
    let quality = 75;
    image.quality(quality);
    
    let outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    
    // If it's still > 300KB (307200 bytes), lower quality iteratively
    while (outputBuffer.length > 300 * 1024 && quality > 10) {
      quality -= 15;
      image.quality(quality);
      outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    }
    
    console.log(`Image compressed successfully. Size: ${(outputBuffer.length / 1024).toFixed(2)} KB (Quality: ${quality})`);
    return outputBuffer;
  } catch (error) {
    console.error('Error during image compression:', error);
    // If Jimp fails (e.g., unsupported format), return the original buffer
    return buffer;
  }
};

module.exports = { compressImage };
