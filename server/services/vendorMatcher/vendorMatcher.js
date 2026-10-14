const db = require('../../database/db');

/**
 * Vendor Matching Service
 * Normalizes vendor names and matches extracted OCR vendors with database vendors.
 */
class VendorMatcher {
  /**
   * Normalize company name for fuzzy matching
   */
  normalizeName(name) {
    if (!name || typeof name !== 'string') return '';

    return name
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\b(private\s+limited|pvt\s+ltd|pvt|ltd|limited|llp|inc|incorporated|corp|corporation|enterprises|co|company)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate string similarity score (Dice coefficient on bigrams)
   */
  calculateSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    const n1 = s1.length;
    const n2 = s2.length;
    if (n1 < 2 || n2 < 2) return s1 === s2 ? 1.0 : 0.0;

    const bigrams1 = new Map();
    for (let i = 0; i < n1 - 1; i++) {
      const bigram = s1.slice(i, i + 2);
      bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < n2 - 1; i++) {
      const bigram = s2.slice(i, i + 2);
      const count = bigrams1.get(bigram) || 0;
      if (count > 0) {
        bigrams1.set(bigram, count - 1);
        intersection++;
      }
    }

    return (2.0 * intersection) / ((n1 - 1) + (n2 - 1));
  }

  /**
   * Match extracted vendor against existing vendors in the database
   * @param {string} extractedVendorName
   * @param {string} [extractedGstin]
   * @param {string} [extractedAddress]
   * @returns {Object} Matching result
   */
  match(extractedVendorName, extractedGstin = '', extractedAddress = '') {
    const allVendors = db.query('SELECT * FROM vendors');

    // 1. Direct GSTIN Match (100% confidence)
    if (extractedGstin && extractedGstin.trim().length > 5) {
      const cleanGstin = extractedGstin.trim().toUpperCase();
      const gstinMatch = allVendors.find(v => v.gstin && v.gstin.trim().toUpperCase() === cleanGstin);
      if (gstinMatch) {
        return {
          matched: true,
          vendor: gstinMatch,
          confidence: 1.0,
          matchReason: 'gstin',
          candidate: null
        };
      }
    }

    if (!extractedVendorName || extractedVendorName.trim().length === 0) {
      return {
        matched: false,
        vendor: null,
        confidence: 0,
        matchReason: 'none',
        candidate: {
          vendor_name: '',
          address: extractedAddress || '',
          gstin: extractedGstin || ''
        }
      };
    }

    const normTarget = this.normalizeName(extractedVendorName);
    let bestMatch = null;
    let highestScore = 0;

    for (const v of allVendors) {
      const normVendor = this.normalizeName(v.vendor_name);

      // Exact normalized match
      if (normTarget === normVendor) {
        return {
          matched: true,
          vendor: v,
          confidence: 0.99,
          matchReason: 'normalized_exact',
          candidate: null
        };
      }

      // Check containment (e.g. "Amul" inside "Amul Dairy")
      if (normTarget.length > 3 && normVendor.length > 3) {
        if (normTarget.includes(normVendor) || normVendor.includes(normTarget)) {
          const containmentScore = 0.88;
          if (containmentScore > highestScore) {
            highestScore = containmentScore;
            bestMatch = v;
          }
        }
      }

      // Bigram similarity score
      const sim = this.calculateSimilarity(normTarget, normVendor);
      if (sim > highestScore) {
        highestScore = sim;
        bestMatch = v;
      }
    }

    // Similarity threshold of 0.75 for fuzzy matching
    if (highestScore >= 0.75 && bestMatch) {
      return {
        matched: true,
        vendor: bestMatch,
        confidence: Number(highestScore.toFixed(2)),
        matchReason: 'fuzzy_name',
        candidate: null
      };
    }

    // No confident match -> New vendor candidate
    return {
      matched: false,
      vendor: null,
      confidence: Number(highestScore.toFixed(2)),
      matchReason: 'none',
      candidate: {
        vendor_name: extractedVendorName.trim(),
        address: extractedAddress ? extractedAddress.trim() : '',
        gstin: extractedGstin ? extractedGstin.trim().toUpperCase() : '',
        vendor_type: 'Other'
      }
    };
  }
}

module.exports = new VendorMatcher();
