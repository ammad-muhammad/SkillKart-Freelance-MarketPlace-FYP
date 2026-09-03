/**
 * Magic-byte (file signature) sniffing for uploads. Client-supplied MIME type
 * and file extension are both fully spoofable (rename a .exe to .pdf, forge
 * the Content-Type header) — this checks the actual file bytes instead.
 *
 * Hand-rolled rather than pulling in the `file-type` package: recent major
 * versions of `file-type` are ESM-only and this codebase is CommonJS, and the
 * allowed-format list here is small and fixed, so a few signature checks are
 * simpler and more maintainable than fighting an ESM/CJS mismatch.
 */

const startsWith = (buffer, bytes) => {
  if (!buffer || buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
};

const isWebp = (buffer) =>
  startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
  buffer.length >= 12 &&
  buffer.slice(8, 12).toString('ascii') === 'WEBP';

/**
 * Sniff the actual kind of a buffer from its magic bytes.
 * @returns {'jpeg'|'png'|'webp'|'pdf'|'doc'|'docx'|null} null when no known
 *   binary signature matches (this is the expected/normal case for .txt).
 */
const sniffKind = (buffer) => {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // "%PDF"
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc'; // legacy OLE2
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return 'docx'; // zip-based (docx/xlsx/pptx/generic zip)
  if (isWebp(buffer)) return 'webp';
  return null;
};

const EXT_TO_KIND = {
  '.jpeg': 'jpeg',
  '.jpg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.pdf': 'pdf',
  '.doc': 'doc',
  '.docx': 'docx',
  '.txt': 'txt'
};

/**
 * @param {Buffer} buffer file content
 * @param {string} ext lowercased extension including the leading dot, e.g. '.pdf'
 * @returns {boolean} whether the actual bytes are consistent with the claimed extension
 */
const matchesExtension = (buffer, ext) => {
  const claimedKind = EXT_TO_KIND[ext];
  if (!claimedKind) return false;

  if (claimedKind === 'txt') {
    // Plain text has no magic byte — reject only if it turns out to actually
    // be one of the known binary formats (i.e. someone renamed a .pdf to .txt).
    return sniffKind(buffer) === null;
  }

  return sniffKind(buffer) === claimedKind;
};

module.exports = { sniffKind, matchesExtension };
