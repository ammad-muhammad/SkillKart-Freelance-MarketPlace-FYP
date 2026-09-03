import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { safeToast as toast } from '../../../utils/safeToast';
import { getCroppedImageBlob, blobToFile } from '../../../utils/cropImage';
import useFocusTrap from '../../../hooks/useFocusTrap';
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
  const modalRef = useRef(null);

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

  const handleClose = useCallback(() => { if (!processing) onCancel?.(); }, [processing, onCancel]);

  useFocusTrap(modalRef, !!file && !!imageSrc, handleClose);

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
    <div className="icm-overlay" onClick={handleClose}>
      <div
        ref={modalRef}
        className="icm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="icm-header">
          <h3>{title}</h3>
          <button type="button" className="icm-close" onClick={handleClose} disabled={processing} aria-label="Close">
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
          <button type="button" className="icm-btn icm-btn--ghost" onClick={handleClose} disabled={processing}>
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
