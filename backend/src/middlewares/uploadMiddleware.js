const path = require('path');
const AppError = require('../utils/errors');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const trimCrlf = (buffer) => {
  let result = buffer;

  while (result.length >= 2 && result.subarray(0, 2).equals(Buffer.from('\r\n'))) {
    result = result.subarray(2);
  }

  while (result.length >= 2 && result.subarray(result.length - 2).equals(Buffer.from('\r\n'))) {
    result = result.subarray(0, result.length - 2);
  }

  return result;
};

const splitBuffer = (buffer, separator) => {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  parts.push(buffer.subarray(start));
  return parts;
};

const parseMultipartForm = async (req) => {
  const contentType = String(req.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new AppError('Multipart boundary not found.', 400);
  }

  const boundaryValue = boundaryMatch[1] || boundaryMatch[2];
  const boundary = Buffer.from(`--${boundaryValue}`);
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const bodyBuffer = Buffer.concat(chunks);
  const rawParts = splitBuffer(bodyBuffer, boundary);
  const parsed = {
    fields: {},
    file: null,
  };

  rawParts.forEach((rawPart) => {
    const part = trimCrlf(rawPart);
    if (!part.length || part.equals(Buffer.from('--'))) {
      return;
    }

    const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEndIndex === -1) {
      return;
    }

    const headerText = part.subarray(0, headerEndIndex).toString('utf8');
    const content = trimCrlf(part.subarray(headerEndIndex + 4));
    const nameMatch = headerText.match(/name="([^"]+)"/i);
    const fileNameMatch = headerText.match(/filename="([^"]*)"/i);
    const mimeTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);

    if (!nameMatch) {
      return;
    }

    const fieldName = nameMatch[1];
    if (fileNameMatch && fileNameMatch[1]) {
      parsed.file = {
        fieldName,
        originalName: path.basename(fileNameMatch[1]),
        mimeType: mimeTypeMatch ? mimeTypeMatch[1].trim() : '',
        buffer: content,
      };
      return;
    }

    parsed.fields[fieldName] = content.toString('utf8');
  });

  return parsed;
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

const buildFileDescriptor = ({ originalName, mimeType, buffer }) => {
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

  return {
    originalName,
    mimeType: mimeType || null,
    extension,
    size: buffer.length,
    buffer,
  };
};

const uploadPaymentProof = async (req, res, next) => {
  try {
    const contentType = String(req.headers['content-type'] || '');

    if (contentType.includes('multipart/form-data')) {
      const { fields, file } = await parseMultipartForm(req);
      req.body = {
        ...req.body,
        ...fields,
      };

      if (!file || file.fieldName !== 'file') {
        throw new AppError('A file field named "file" is required.', 400);
      }

      req.uploadedFile = buildFileDescriptor(file);
      return next();
    }

    req.uploadedFile = buildFileDescriptor(parseBase64File(req.body));
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  uploadPaymentProof,
};
