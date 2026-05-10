const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/errors');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const uploadDir = path.join(process.cwd(), 'uploads', 'payment-proofs');

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const parseBase64File = (body = {}) => {
  const originalName = body.fileName || body.filename || '';
  let mimeType = body.mimeType || '';
  let base64Content = body.fileContentBase64 || body.fileBase64 || body.file || '';

  const dataUriMatch = String(base64Content).match(/^data:(.+);base64,(.+)$/);
  if (dataUriMatch) {
    mimeType = mimeType || dataUriMatch[1];
    base64Content = dataUriMatch[2];
  }

  if (!originalName || !base64Content) {
    throw new AppError('fileName and fileContentBase64 are required.', 400);
  }

  return {
    originalName,
    mimeType,
    buffer: Buffer.from(base64Content, 'base64'),
  };
};

const uploadPaymentProof = (req, res, next) => {
  try {
    const { originalName, mimeType, buffer } = parseBase64File(req.body);
    const extension = path.extname(originalName).replace('.', '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new AppError('Only jpg, jpeg, png and pdf files are allowed.', 400);
    }

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new AppError('Invalid file mime type.', 400);
    }

    if (!buffer.length || buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError('The payment proof file must be smaller than 5MB.', 400);
    }

    ensureUploadDir();
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const absolutePath = path.join(uploadDir, fileName);
    fs.writeFileSync(absolutePath, buffer);

    req.uploadedFile = {
      filename: fileName,
      originalName,
      mimeType: mimeType || null,
      size: buffer.length,
      absolutePath,
      relativePath: path.join('uploads', 'payment-proofs', fileName),
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPaymentProof,
};
