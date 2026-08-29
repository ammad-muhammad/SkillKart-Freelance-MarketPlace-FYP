import { useState, useEffect, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { getCroppedImageBlob, blobToFile } from '../../../utils/cropImage';
import './ImageCropModal.css';

/**
 * ImageCropModal — shared crop/zoom/adjust step for every avatar, cover
 * photo, company logo, and gig image upload in the app. Controlled by the
 * parent via the `file` prop: render whenever a file has just been selected,
 * unmount (pass `file={null}`) to close.
 *
 * Cropping is optional by design — "Use Original" uploads the untouched
 * file, matching every existing upload flow's prior (uncropped) behavior.
 *
 * @param {File}     file        raw file just selected; modal shows when non-null
 * @param {number}   aspect      crop frame width/height ratio (e.g. 1, 4, 16/9)
 * @param {'rect'|'round'} cropShape  visual crop frame shape
 * @param {string}   title       modal heading
 * @param {Function} onCancel    discard, nothing uploads
 * @param {Function} onConfirm   (finalFile: File) => void — cropped or original
 */
export default function ImageCropModal({ file, aspect = 1, cropShape = 'rect', title = 'Adjust Image', onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const imageSrc = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [file]);

  useEffect(() => () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  const onCropComplete = useCallback((_croppedArea, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  if (!file || !imageSrc) return null;

  const handleUseOriginal = () => onConfirm(file);

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      handleUseOriginal();
      return;
    }
    setProcessing(true);
    try {
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, mimeType);
      onConfirm(blobToFile(blob, file));
    } catch (error) {
      console.error('Crop failed, falling back to original:', error);
      toast.error('Could not crop the image — uploading the original instead.');
      onConfirm(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="icm-overlay" onClick={onCancel}>
      <div className="icm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="icm-header">
          <h3>{title}</h3>
          <button type="button" className="icm-close" onClick={onCancel} disabled={processing}>
            <X size={20} />
          </button>
        </div>

        <div className="icm-crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="icm-zoom-row">
          <ZoomOut size={16} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="icm-zoom-slider"
          />
          <ZoomIn size={16} />
        </div>

        <div className="icm-actions">
          <button type="button" className="icm-btn icm-btn--ghost" onClick={handleUseOriginal} disabled={processing}>
            Use Original
          </button>
          <button type="button" className="icm-btn icm-btn--ghost" onClick={onCancel} disabled={processing}>
            Cancel
          </button>
          <button type="button" className="icm-btn icm-btn--primary" onClick={handleApply} disabled={processing}>
            {processing ? 'Applying…' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
