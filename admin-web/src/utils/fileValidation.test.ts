import { validateUploadFile } from './fileValidation';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 0, 0, 0];

function fileOf(bytes: number[], name: string, type = 'application/octet-stream') {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('validateUploadFile', () => {
  it('accepts a file whose content, extension and size match an allowed type', async () => {
    await expect(validateUploadFile(fileOf(PNG, 'photo.png'), ['image'])).resolves.toEqual({
      valid: true,
      mimeType: 'image/png',
    });
  });

  it('detects the type from content, not from the browser-reported MIME type', async () => {
    const disguised = fileOf(
      [0x3c, 0x73, 0x76, 0x67, 0x3e, 0, 0, 0, 0, 0, 0, 0],
      'logo.png',
      'image/png',
    );

    const result = await validateUploadFile(disguised, ['image']);

    expect(result).toMatchObject({
      valid: false,
      error: expect.stringMatching(/unsupported file type/i) as unknown,
    });
  });

  it('rejects an extension that does not match the content', async () => {
    const result = await validateUploadFile(fileOf(PDF, 'invoice.png'), ['image', 'pdf']);
    expect(result).toEqual({
      valid: false,
      error: 'The file extension does not match its content.',
    });
  });

  it('rejects kinds that are not allowed here', async () => {
    const result = await validateUploadFile(fileOf(PDF, 'brochure.pdf'), ['image']);
    expect(result.valid).toBe(false);
  });

  it('rejects files above the size limit for their kind', async () => {
    const big = fileOf(PNG, 'huge.png');
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    const result = await validateUploadFile(big, ['image']);

    expect(result).toEqual({ valid: false, error: 'The file is too large. The maximum is 10 MB.' });
  });

  it('rejects empty files', async () => {
    await expect(validateUploadFile(fileOf([], 'empty.png'), ['image'])).resolves.toEqual({
      valid: false,
      error: 'The file is empty.',
    });
  });
});
