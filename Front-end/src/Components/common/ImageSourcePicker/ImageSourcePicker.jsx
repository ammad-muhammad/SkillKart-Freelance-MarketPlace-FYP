import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Camera as CameraIcon, FolderOpen } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { isMobileApp } from '../../../utils/platform';
import { error as logError } from '../../../utils/logger';

// Turns a Capacitor Camera `Photo` (webPath: a URL the WebView can fetch())
// into a real File — every existing upload handler expects e.target.files[0]
// to be a File/Blob, so this keeps every call site's existing code unmodified.
const photoToFile = async (photo) => {
  const res = await fetch(photo.webPath);
  const blob = await res.blob();
  const ext = photo.format || 'jpeg';
  return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
};

/**
 * Drop-in replacement for a hidden `<input type="file" ref={...}>` — exposes
 * the same `ref.current.click()` API, so every existing "click to upload"
 * trigger (button/div/label) needs no changes beyond swapping the tag.
 *
 * On the native Android app, `.click()` opens a small "Take Photo / Choose
 * from Device" chooser instead of going straight to a file picker:
 *   - Take Photo uses the official @capacitor/camera plugin
 *     (Camera.getPhoto, source: CameraSource.Camera) rather than the HTML
 *     `capture` attribute + WebView file-chooser-interception trick — that
 *     route depends on the WebView intercepting a generic file chooser and
 *     is known to silently fail to open the camera on some OEM Android
 *     WebView builds. The plugin talks to the native camera intent directly
 *     instead, through Capacitor's own plugin bridge.
 *   - Choose from Device is a plain hidden `<input type="file">` — this path
 *     was never unreliable, and it's the only way to also support non-image
 *     accept types (e.g. chat/job attachments that allow PDFs/DOCs too,
 *     which the Camera plugin can never produce).
 *
 * On web, `.click()` just opens the device input directly — desktop has no
 * camera-vs-gallery distinction to offer, so behavior there is unchanged.
 *
 * @param {string}   accept    same meaning as a plain <input accept>; only
 *                             applies to the "Choose from Device" path —
 *                             Take Photo always captures a plain photo.
 * @param {Function} onChange  called with a file-input-shaped event
 *                             ({ target: { files, value } }) from EITHER
 *                             path, so existing `e.target.files[0]`-style
 *                             handlers work completely unchanged.
 * @param {boolean}  multiple  forwarded to the device input only (a camera
 *                             capture is always a single photo).
 * @param {'user'|'environment'} facing  which camera Take Photo opens —
 *                             'user' (front) for avatar/selfie-style shots,
 *                             'environment' (back, default) for everything
 *                             else (documents, covers, gig/portfolio photos).
 * @param {string}   [id]      forwarded to the underlying device <input> —
 *                             only needed when an existing <label htmlFor>
 *                             field label points at it.
 */
const ImageSourcePicker = forwardRef(({ accept = 'image/*', onChange, multiple = false, facing = 'environment', id }, ref) => {
  const deviceInputRef = useRef(null);
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    click: () => {
      if (isMobileApp()) setOpen(true);
      else deviceInputRef.current?.click();
    },
  }), []);

  const handleTakePhoto = useCallback(async () => {
    setOpen(false);
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: facing === 'user' ? CameraDirection.Front : CameraDirection.Rear,
        quality: 85,
        saveToGallery: false,
      });
      const file = await photoToFile(photo);
      onChange({ target: { files: [file], value: '' } });
    } catch (err) {
      // User cancelled, or the camera permission was denied — both throw
      // here. Same silent no-op as a cancelled system file picker; every
      // existing handler already treats "no file" as a no-op.
      logError('[ImageSourcePicker] camera capture unavailable or cancelled', err);
    }
  }, [facing, onChange]);

  const openDevicePicker = useCallback(() => {
    setOpen(false);
    deviceInputRef.current?.click();
  }, []);

  return (
    <>
      <input id={id} ref={deviceInputRef} type="file" accept={accept} multiple={multiple} onChange={onChange} hidden />
      <Modal open={open} title="Add a photo" onClose={() => setOpen(false)} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Button type="button" variant="outline" fullWidth icon={<CameraIcon size={18} />} onClick={handleTakePhoto}>
            Take Photo
          </Button>
          <Button type="button" variant="outline" fullWidth icon={<FolderOpen size={18} />} onClick={openDevicePicker}>
            Choose from Device
          </Button>
        </div>
      </Modal>
    </>
  );
});

ImageSourcePicker.displayName = 'ImageSourcePicker';

export default ImageSourcePicker;
