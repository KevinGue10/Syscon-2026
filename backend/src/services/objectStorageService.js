const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/errors');

const localUploadDir = path.join(process.cwd(), 'uploads', 'payment-proofs');

const ensureLocalUploadDir = () => {
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }
};

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

const encodeObjectKey = (value) =>
  String(value || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const getIsoDateParts = (date = new Date()) => {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
};

const hashSha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const signHmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value).digest(encoding);

const isBucketConfigured = () =>
  Boolean(
    env.storage.endpoint &&
      env.storage.bucket &&
      env.storage.accessKeyId &&
      env.storage.secretAccessKey
  );

const getObjectPublicUrl = (key) => {
  const publicBaseUrl = normalizeBaseUrl(env.storage.publicBaseUrl);
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${encodeObjectKey(key)}`;
  }
  return null;
};

const getSignedObjectUrl = ({ key, expiresInSeconds = env.storage.signedUrlExpiresInSeconds }) => {
  if (!isBucketConfigured()) {
    return null;
  }

  const endpoint = new URL(normalizeBaseUrl(env.storage.endpoint));
  const encodedKey = encodeObjectKey(key);
  const objectUrl = new URL(`/${env.storage.bucket}/${encodedKey}`, endpoint);
  const { amzDate, dateStamp } = getIsoDateParts();
  const signedHeaders = 'host';
  const credentialScope = `${dateStamp}/${env.storage.region}/s3/aws4_request`;
  const canonicalQuery = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.storage.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  const canonicalRequest = [
    'GET',
    objectUrl.pathname,
    canonicalQuery.toString(),
    `host:${objectUrl.host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashSha256(canonicalRequest)].join('\n');
  const secretKey = `AWS4${env.storage.secretAccessKey}`;
  const dateKey = signHmac(secretKey, dateStamp);
  const regionKey = signHmac(dateKey, env.storage.region);
  const serviceKey = signHmac(regionKey, 's3');
  const signingKey = signHmac(serviceKey, 'aws4_request');
  const signature = signHmac(signingKey, stringToSign, 'hex');

  canonicalQuery.set('X-Amz-Signature', signature);
  objectUrl.search = canonicalQuery.toString();

  return objectUrl.toString();
};

const uploadBufferToBucket = async ({ key, buffer, contentType }) => {
  const endpoint = new URL(normalizeBaseUrl(env.storage.endpoint));
  const encodedKey = encodeObjectKey(key);
  const objectUrl = new URL(`/${env.storage.bucket}/${encodedKey}`, endpoint);
  const { amzDate, dateStamp } = getIsoDateParts();
  const payloadHash = hashSha256(buffer);
  const host = objectUrl.host;
  const canonicalUri = objectUrl.pathname;
  const canonicalHeaders =
    `content-length:${buffer.length}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${env.storage.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashSha256(canonicalRequest)].join('\n');
  const secretKey = `AWS4${env.storage.secretAccessKey}`;
  const dateKey = signHmac(secretKey, dateStamp);
  const regionKey = signHmac(dateKey, env.storage.region);
  const serviceKey = signHmac(regionKey, 's3');
  const signingKey = signHmac(serviceKey, 'aws4_request');
  const signature = signHmac(signingKey, stringToSign, 'hex');
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${env.storage.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(objectUrl, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Length': String(buffer.length),
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: buffer,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new AppError(`Bucket upload failed: ${response.status} ${responseText}`, 502);
  }

  return {
    bucketKey: key,
    publicUrl: getObjectPublicUrl(key),
    storageProvider: 'bucket',
  };
};

const uploadBufferLocally = async ({ key, buffer }) => {
  ensureLocalUploadDir();
  const fileName = path.basename(key);
  const absolutePath = path.join(localUploadDir, fileName);
  fs.writeFileSync(absolutePath, buffer);

  return {
    bucketKey: key,
    publicUrl: `${normalizeBaseUrl(env.app.baseUrl)}/uploads/payment-proofs/${encodeURIComponent(fileName)}`,
    storageProvider: 'local',
  };
};

const uploadPaymentProofFile = async ({ paymentId, originalName, buffer, mimeType, extension }) => {
  const safeExtension = String(extension || '').replace(/^\./, '').toLowerCase();
  const objectKey = [
    env.storage.paymentProofsPrefix,
    `payment-${paymentId}`,
    `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`,
  ].join('/');

  const uploadResult = isBucketConfigured()
    ? await uploadBufferToBucket({
        key: objectKey,
        buffer,
        contentType: mimeType || 'application/octet-stream',
      })
    : await uploadBufferLocally({
        key: objectKey,
        buffer,
      });

  return {
    originalName,
    mimeType,
    size: buffer.length,
    ...uploadResult,
  };
};

module.exports = {
  isBucketConfigured,
  uploadPaymentProofFile,
  getObjectPublicUrl,
  getSignedObjectUrl,
};
