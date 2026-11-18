import { UPLOAD_LIMITS } from './constants';
import { formatBytes } from './formatters';

export type UploadKind = 'image' | 'pdf' | 'video';

interface FileTypeRule {
  mimeType: string;
  kind: UploadKind;
  extensions: readonly string[];
  /** Leading bytes ("magic number") at an offset; the browser-reported type is not trusted. */
  signature: { offset: number; bytes: readonly number[] }[];
}

/** Same allow-list as the backend (`media/service/MediaFileType`). SVG and HTML are never allowed. */
const FILE_TYPES: readonly FileTypeRule[] = [
  {
    mimeType: 'image/jpeg',
    kind: 'image',
    extensions: ['jpg', 'jpeg'],
    signature: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  },
  {
    mimeType: 'image/png',
    kind: 'image',
    extensions: ['png'],
    signature: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  {
    mimeType: 'image/webp',
    kind: 'image',
    extensions: ['webp'],
    signature: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    ],
  },
  {
    mimeType: 'application/pdf',
    kind: 'pdf',
    extensions: ['pdf'],
    signature: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  },
  {
    mimeType: 'video/mp4',
    kind: 'video',
    extensions: ['mp4'],
    signature: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  },
];

const MAX_BYTES: Record<UploadKind, number> = {
  image: UPLOAD_LIMITS.maxImageBytes,
  pdf: UPLOAD_LIMITS.maxPdfBytes,
  video: UPLOAD_LIMITS.maxVideoBytes,
};

const HEADER_LENGTH = 12;

export type FileValidationResult =
  { valid: true; mimeType: string } | { valid: false; error: string };

function matchesSignature(header: Uint8Array, rule: FileTypeRule): boolean {
  return rule.signature.every(({ offset, bytes }) =>
    bytes.every((byte, index) => header[offset + index] === byte),
  );
}

/** Reads only the first bytes, so even a large video is checked instantly. */
function readHeader(file: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsArrayBuffer(file.slice(0, HEADER_LENGTH));
  });
}

/**
 * Early, user-friendly checks before uploading: allowed kind, extension matches content, size limit.
 * The backend repeats every check; this only saves a slow upload that would be rejected anyway.
 */
export async function validateUploadFile(
  file: File,
  allowedKinds: readonly UploadKind[],
): Promise<FileValidationResult> {
  if (file.size === 0) {
    return { valid: false, error: 'The file is empty.' };
  }
  const header = await readHeader(file);
  const rule = FILE_TYPES.find(
    (candidate) => allowedKinds.includes(candidate.kind) && matchesSignature(header, candidate),
  );
  if (!rule) {
    const allowed = FILE_TYPES.filter((type) => allowedKinds.includes(type.kind)).flatMap(
      (type) => type.extensions,
    );
    return { valid: false, error: `Unsupported file type. Allowed: ${allowed.join(', ')}.` };
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
  if (extension && !rule.extensions.includes(extension)) {
    return { valid: false, error: 'The file extension does not match its content.' };
  }
  const maxBytes = MAX_BYTES[rule.kind];
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `The file is too large. The maximum is ${formatBytes(maxBytes)}.`,
    };
  }
  return { valid: true, mimeType: rule.mimeType };
}
