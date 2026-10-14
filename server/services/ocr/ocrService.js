const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');

/**
 * Service to handle PDF text extraction and Tesseract OCR
 */
class OcrService {
  /**
   * Process a PDF file buffer or path
   * @param {Buffer|string} input - PDF buffer or file path
   * @param {Object} options - { forceOcr: boolean, onProgress: function }
   */
  async processPdf(input, options = {}) {
    let pdfBuffer;
    if (typeof input === 'string') {
      pdfBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      pdfBuffer = input;
    } else {
      throw new Error('Invalid PDF input. Expected file path or Buffer.');
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Empty file received.');
    }

    // Check if input is an image (PNG, JPEG, WebP, etc.)
    const ext = typeof input === 'string' ? input.split('.').pop().toLowerCase() : '';
    const isImageFile = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ||
      (pdfBuffer[0] === 0x89 && pdfBuffer[1] === 0x50) || // PNG magic bytes
      (pdfBuffer[0] === 0xFF && pdfBuffer[1] === 0xD8);   // JPEG magic bytes

    if (isImageFile) {
      console.log('[OcrService] Input identified as Image file. Running Tesseract OCR directly...');
      const worker = await createWorker('eng');
      const ocrResult = await worker.recognize(pdfBuffer);
      await worker.terminate();

      const imageText = (ocrResult.data && ocrResult.data.text) ? ocrResult.data.text.trim() : '';
      const confidence = Math.round(ocrResult.data?.confidence || 85);

      return {
        pdfType: 'image',
        text: imageText,
        pageCount: 1,
        ocrConfidence: confidence,
        extractionMethod: 'Tesseract OCR v5 (Direct Image)',
        pages: [{ pageNumber: 1, text: imageText, confidence, source: 'tesseract-image' }]
      };
    }

    // Basic PDF header verification (%PDF-)
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new Error('Uploaded file is not a valid PDF or Image document.');
    }

    let parser = null;
    try {
      parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      const extractedText = (textResult && textResult.text) ? textResult.text.trim() : '';
      const totalPages = (textResult && textResult.total) ? textResult.total : 1;

      // Check if PDF has enough extractable digital text
      const isTextBased = !options.forceOcr && extractedText.length >= 35;

      if (isTextBased) {
        console.log(`[OcrService] Direct text extraction succeeded (${extractedText.length} chars). PDF Type: Text-based`);
        return {
          pdfType: 'text',
          text: extractedText,
          pageCount: totalPages,
          ocrConfidence: 100,
          extractionMethod: 'Direct PDF Parser',
          pages: textResult.pages ? textResult.pages.map(p => ({
            pageNumber: p.num || 1,
            text: p.text || '',
            source: 'direct'
          })) : [{ pageNumber: 1, text: extractedText, source: 'direct' }]
        };
      }

      // If text is minimal or forceOcr is enabled, treat as Scanned/Image PDF and run Tesseract OCR
      console.log(`[OcrService] Digital text insufficient (${extractedText.length} chars). Running Tesseract OCR on rendered pages...`);

      const screenshotResult = await parser.getScreenshot({ imageBuffer: true });
      const pages = screenshotResult.pages || [];

      if (!pages || pages.length === 0) {
        // Fallback: If screenshots couldn't be rendered, return whatever direct text we got
        console.warn('[OcrService] No page screenshots rendered. Falling back to direct text.');
        return {
          pdfType: 'scanned',
          text: extractedText || 'No text could be extracted from this document.',
          pageCount: totalPages,
          ocrConfidence: 50,
          extractionMethod: 'Fallback Parser',
          pages: [{ pageNumber: 1, text: extractedText, source: 'fallback' }]
        };
      }

      // Initialize Tesseract Worker
      const worker = await createWorker('eng');
      const pageResults = [];
      let combinedText = '';
      let totalConfidence = 0;

      for (let i = 0; i < pages.length; i++) {
        const pageData = pages[i].data;
        const pageNum = pages[i].pageNumber || (i + 1);

        if (options.onProgress) {
          options.onProgress(`Running OCR on page ${pageNum} of ${pages.length}...`);
        }

        const ocrResult = await worker.recognize(Buffer.from(pageData));
        const pageText = ocrResult.data.text || '';
        const pageConf = ocrResult.data.confidence || 0;

        pageResults.push({
          pageNumber: pageNum,
          text: pageText,
          confidence: pageConf,
          source: 'tesseract-ocr'
        });

        combinedText += `\n--- Page ${pageNum} ---\n` + pageText;
        totalConfidence += pageConf;
      }

      await worker.terminate();

      const avgConfidence = pages.length > 0 ? Math.round(totalConfidence / pages.length) : 0;

      return {
        pdfType: 'scanned',
        text: combinedText.trim(),
        pageCount: pages.length,
        ocrConfidence: avgConfidence,
        extractionMethod: 'Tesseract OCR v5 (WASM)',
        pages: pageResults
      };
    } catch (error) {
      console.error('[OcrService] OCR Processing Error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (_) {}
      }
    }
  }
}

module.exports = new OcrService();
