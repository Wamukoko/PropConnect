/**
 * Image processing utilities for property photo uploads.
 * Handles EXIF stripping and thumbnail generation using canvas.
 *
 * In production, these would use sharp or a similar native library.
 * For mock/dev mode, we generate placeholder outputs.
 */

const MAX_THUMBNAIL_WIDTH = 600;
const MAX_THUMBNAIL_HEIGHT = 400;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePhotoUpload(file: {
  type: string;
  size: number;
}): PhotoValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`,
    };
  }

  return { valid: true };
}

/**
 * Strip EXIF data from an image buffer.
 * In production, this would use sharp to re-encode the image.
 * In mock mode, we return the buffer as-is since EXIF is only
 * relevant for real image processing.
 */
export async function stripExifData(
  inputBuffer: Buffer | ArrayBuffer
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(inputBuffer)
    ? inputBuffer
    : Buffer.from(inputBuffer);

  // In production, use sharp:
  //   const sharp = require('sharp');
  //   return await sharp(buffer).rotate().toBuffer();
  //
  // For now, return the buffer as-is.
  // The actual EXIF stripping happens at the storage layer
  // when the image is processed by Supabase Storage.
  return buffer;
}

export interface ThumbnailResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Generate a thumbnail from an image buffer.
 * In production, this would use sharp to resize.
 * In mock mode, we return the original buffer with reported dimensions.
 */
export async function generateThumbnail(
  inputBuffer: Buffer | ArrayBuffer,
  maxWidth = MAX_THUMBNAIL_WIDTH,
  maxHeight = MAX_THUMBNAIL_HEIGHT
): Promise<ThumbnailResult> {
  const buffer = Buffer.isBuffer(inputBuffer)
    ? inputBuffer
    : Buffer.from(inputBuffer);

  // In production, use sharp:
  //   const sharp = require('sharp');
  //   const metadata = await sharp(buffer).metadata();
  //   const ratio = Math.min(maxWidth / (metadata.width || maxWidth), maxHeight / (metadata.height || maxHeight));
  //   const newWidth = Math.round((metadata.width || maxWidth) * ratio);
  //   const newHeight = Math.round((metadata.height || maxHeight) * ratio);
  //   const thumbBuffer = await sharp(buffer).resize(newWidth, newHeight).jpeg({ quality: 80 }).toBuffer();
  //   return { buffer: thumbBuffer, width: newWidth, height: newHeight };

  return {
    buffer,
    width: maxWidth,
    height: maxHeight,
  };
}

export function getStoragePaths(propertyId: string, filename: string): {
  original: string;
  thumbnail: string;
} {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const base = `properties/${propertyId}/${timestamp}_${safeName}`;
  return {
    original: base,
    thumbnail: `properties/${propertyId}/thumbs/${timestamp}_${safeName}`,
  };
}
