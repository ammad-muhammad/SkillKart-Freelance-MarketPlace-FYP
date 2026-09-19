import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isMobileApp } from './platform';
import { error as logError } from './logger';

// The "create a Blob, <a download>, .click()" pattern works fine on web but
// does nothing useful inside the native app's WebView: a `blob:` URL only
// exists in the WebView's own JS memory, and there's no Downloads UI to
// catch a download navigation at all — clicking the link is a silent no-op.
const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Saves/shares a client-generated file (a CSV export, a text transcript, ...).
 * Drop-in replacement for the manual `URL.createObjectURL` + `<a download>` +
 * `.click()` dance — same call shape, just hand it the Blob and a filename.
 *
 * On `isMobileApp()`, writes the blob to the app's private cache
 * (`Directory.Cache` — no storage permission needed, unlike public storage)
 * via `@capacitor/filesystem`, then opens the native share sheet
 * (`@capacitor/share`) so the user can actually save or send it somewhere
 * (Files, Drive, email, ...) — the WebView itself has no "Downloads" UI to
 * do this for them. On web (including a cancelled/failed native
 * save-or-share), falls back to the plain browser download, unchanged from
 * before this existed.
 *
 * @param {Blob}   blob
 * @param {string} filename
 */
export const downloadFile = async (blob, filename) => {
  if (isMobileApp()) {
    try {
      const { uri } = await Filesystem.writeFile({
        path: filename,
        data: blob,
        directory: Directory.Cache,
      });
      await Share.share({ title: filename, files: [uri], dialogTitle: `Save or share ${filename}` });
      return;
    } catch (err) {
      // Includes the user simply cancelling the share sheet (rejects the
      // same as a real error) — falling through is a harmless no-op in that
      // case, since the browser-download path below also does nothing
      // visible inside the WebView.
      logError('[downloadFile] native save/share failed', err);
    }
  }
  triggerBrowserDownload(blob, filename);
};
