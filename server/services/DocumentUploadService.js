const fs = require('fs');
const path = require('path');

/**
 * Service 1: DocumentUploadService
 * Validates and accepts invoice documents:
 * - Text-based PDFs
 * - Scanned PDFs
 * - JPG, JPEG, PNG, WebP images
 * - Multi-page invoices
 * Validates MIME type, magic bytes, file size, and integrity.
 */
class DocumentUploadService {
  constructor(options = {}) {
    this.maxSizeBytes = options.maxSizeBytes || 20 * 1024 * 1024; // 20 MB default
    this.allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  }

  /**
   * Validate uploaded file metadata and binary magic bytes
   * @param {Object} file - Multer file object or file path
   * @returns {Object} { isValid: boolean, fileType: string, error?: string }
   */
  validateFile(file) {
    if (!file) {
      return { isValid: false, error: 'No file was provided.' };
    }

    const filePath = typeof file === 'string' ? file : file.path;
    const originalName = file.originalname || path.basename(filePath);
    const size = file.size || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);

    if (size === 0) {
      return { isValid: false, error: 'The uploaded file is empty (0 bytes).' };
    }

    if (size > this.maxSizeBytes) {
      return {
        isValid: false,
        error: `File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${(this.maxSizeBytes / (1024 * 1024))} MB.`
      };
    }

    const ext = path.extname(originalName).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      return {
        isValid: false,
        error: `Unsupported file extension "${ext}". Allowed types: ${this.allowedExtensions.join(', ')}.`
      };
    }

    // Inspect magic bytes for binary integrity
    try {
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      let detectedType = 'unknown';

      // %PDF-
      if (buffer.slice(0, 4).toString('ascii') === '%PDF') {
        detectedType = 'pdf';
      }
      // PNG: \x89PNG
      else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        detectedType = 'image/png';
      }
      // JPEG: \xFF\xD8\xFF
      else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        detectedType = 'image/jpeg';
      }
      // WebP: RIFF....WEBP
      else if (buffer.slice(0, 4).toString('ascii') === 'RIFF') {
        detectedType = 'image/webp';
      }

      if (detectedType === 'unknown' && ext !== '.pdf') {
        return { isValid: false, error: 'File header did not match recognized PDF or image format.' };
      }

      return {
        isValid: true,
        valid: true,
        fileType: detectedType,
        originalName,
        filePath,
        size
      };
    } catch (err) {
      return { isValid: false, valid: false, error: `Failed to inspect file integrity: ${err.message}` };
    }
  }

  validateUpload(file) {
    const res = this.validateFile(file);
    return {
      ...res,
      valid: res.isValid
    };
  }
}

module.exports = new DocumentUploadService();
