const fs = require('fs');
const { PDFParse } = require('pdf-parse');

/**
 * Service 2: PdfTextExtractor
 * Extracts selectable text directly from text-based PDFs.
 * Distinguishes text-based PDFs from scanned PDFs.
 * Preserves page order, page references, and character distributions.
 */
class PdfTextExtractor {
  /**
   * Extract selectable text and metadata from PDF
   * @param {string|Buffer} input - File path or Buffer
   * @returns {Promise<Object>}
   */
  async extractText(input) {
    let pdfBuffer;
    if (typeof input === 'string') {
      pdfBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      pdfBuffer = input;
    } else {
      throw new Error('Invalid PDF input. Expected file path or Buffer.');
    }

    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      const extractedText = (textResult && textResult.text) ? textResult.text.trim() : '';
      const totalPages = (textResult && textResult.total) ? textResult.total : 1;

      // Check character density to determine if PDF is digital/text-based
      const charCount = extractedText.length;
      const isTextBased = charCount >= 40; // minimum reasonable text threshold

      const pages = textResult.pages ? textResult.pages.map(p => ({
        pageNumber: p.num || 1,
        text: (p.text || '').trim(),
        charCount: (p.text || '').trim().length
      })) : [{
        pageNumber: 1,
        text: extractedText,
        charCount
      }];

      return {
        isTextBased,
        pdfType: isTextBased ? 'text-based' : 'scanned-pdf',
        totalPages,
        charCount,
        fullText: extractedText,
        text: extractedText,
        pages
      };
    } catch (err) {
      console.warn('[PdfTextExtractor] Direct text extraction error:', err.message);
      return {
        isTextBased: false,
        pdfType: 'scanned-pdf',
        totalPages: 1,
        charCount: 0,
        fullText: '',
        pages: []
      };
    }
  }
}

module.exports = new PdfTextExtractor();
