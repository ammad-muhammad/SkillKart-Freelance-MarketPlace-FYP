/**
 * Canvas-based cropping for ImageCropModal. Takes the pixel-space crop area
 * react-easy-crop reports (onCropComplete's second argument) and draws just
 * that region to an offscreen canvas, producing a plain image Blob that can
 * be uploaded through the exact same endpoints as an uncropped file.
 */

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.crossOrigin = 'anonymous';
    img.src = url;
  });

/**
 * @param {string} imageSrc - object URL of the source file
 * @param {{x:number,y:number,width:number,height:number}} croppedAreaPixels
 * @param {string} mimeType - output mime type, e.g. 'image/jpeg'
 * @returns {Promise<Blob>}
 */
export const getCroppedImageBlob = async (imageSrc, croppedAreaPixels, mimeType = 'image/jpeg') => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, mimeType, 0.92);
  });
};

/**
 * Wraps a cropped Blob back into a File so it behaves identically to a
 * freshly-selected file (name, type) for the existing upload helpers/FormData.
 */
export const blobToFile = (blob, originalFile) =>
  new File([blob], originalFile.name, { type: blob.type || originalFile.type });
