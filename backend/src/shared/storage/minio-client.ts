/**
 * minio-client.ts — MinIO/S3-compatible storage client for chat attachments.
 * Uploads return a public URL suitable for zca-js sendImage/sendVideo.
 *
 * Public URL construction:
 *   MinIO / Amazon S3  : {S3_PUBLIC_URL}/{S3_BUCKET}/{key}
 *   Cloudflare R2      : {S3_PUBLIC_URL}/{key}  (set S3_OMIT_BUCKET_IN_URL=true)
 *
 * Image-only mirror policy:
 *   Only image/* MIME types (jpg, png, webp, gif) are mirrored to R2/S3 storage.
 *   Video, audio, PDF and other binary documents are NOT uploaded to cloud storage.
 */
import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { config } from '../../config/index.js';

function parseEndpoint(url: string): { endPoint: string; port: number; useSSL: boolean } {
  const u = new URL(url);
  const useSSL = u.protocol === 'https:';
  const port = u.port ? parseInt(u.port) : (useSSL ? 443 : 80);
  return { endPoint: u.hostname, port, useSSL };
}

const { endPoint, port, useSSL } = parseEndpoint(config.s3Endpoint);

export const minioClient = new Client({
  endPoint,
  port,
  useSSL,
  accessKey: config.s3AccessKey,
  secretKey: config.s3SecretKey,
  region: config.s3Region,
});

const BUCKET = config.s3Bucket;

/** MIME types that are allowed to be uploaded to cloud storage (images only). */
const ALLOWED_STORAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Returns true if this MIME type should be mirrored to cloud storage. */
export function isStorageAllowedMime(mimeType: string): boolean {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return ALLOWED_STORAGE_MIMES.has(base);
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a buffer to S3/MinIO/R2.
 * Only image and video/audio MIME types are accepted.
 * PDF and other document types are rejected.
 */
export async function uploadBuffer(buffer: Buffer, mimeType: string, originalName?: string): Promise<UploadResult> {
  const base = mimeType.split(';')[0].trim().toLowerCase();

  if (!isStorageAllowedMime(base)) {
    throw new Error(`uploadBuffer: MIME type "${base}" is not allowed in cloud storage. Only images and media files may be uploaded.`);
  }

  const ext = originalName ? extname(originalName) : mimeToExt(base);
  const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': base,
    'Cache-Control': 'public, max-age=31536000',
  });

  // Build public URL:
  //   - R2 (S3_OMIT_BUCKET_IN_URL=true): https://pub-xxx.r2.dev/{key}
  //   - MinIO/S3 (default):              http://localhost:9000/{bucket}/{key}
  const publicBase = config.s3PublicUrl.replace(/\/+$/, ''); // strip trailing slash
  const url = config.s3OmitBucketInUrl
    ? `${publicBase}/${key}`
    : `${publicBase}/${BUCKET}/${key}`;

  return { key, url, size: buffer.length, mimeType: base };
}

function mimeToExt(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'video/mp4') return '.mp4';
  if (mime === 'video/quicktime') return '.mov';
  if (mime === 'video/webm') return '.webm';
  if (mime === 'audio/mpeg') return '.mp3';
  if (mime === 'audio/mp4') return '.m4a';
  if (mime === 'audio/ogg') return '.ogg';
  return '';
}

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, config.s3Region);
  }
}
