/**
 * Invoice Parser Service
 * Extracts structured invoice data and line items from OCR/extracted text.
 */

class InvoiceParser {
  /**
   * Parse raw text into structured invoice fields
   * @param {string} rawText 
   * @returns {Object} Extracted invoice data
   */
  parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return this.emptyResult();
    }

    const lines = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--- Page'));

    const result = {
      vendorName: this.extractVendorName(lines, rawText),
      vendorAddress: this.extractVendorAddress(lines),
      gstin: this.extractGSTIN(rawText),
      invoiceNumber: this.extractInvoiceNumber(rawText),
      invoiceDate: this.extractInvoiceDate(rawText),
      dueDate: this.extractDueDate(rawText),
      poNumber: this.extractPONumber(rawText),
      subtotal: this.extractSubtotal(rawText),
      discount: this.extractDiscount(rawText),
      tax: this.extractTax(rawText),
      total: this.extractTotal(rawText),
      items: this.extractItems(lines, rawText)
    };

    // Calculate totals if missing or verify consistency
    if (!result.total && result.items.length > 0) {
      const itemsSum = result.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
      if (itemsSum > 0) {
        result.total = Number(itemsSum.toFixed(2));
      }
    }

    if (!result.subtotal && result.items.length > 0) {
      const sub = result.items.reduce((sum, it) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unitPrice) || 0;
        return sum + (qty * rate);
      }, 0);
      if (sub > 0) {
        result.subtotal = Number(sub.toFixed(2));
      }
    }

    // Default total to subtotal + tax if total is empty
    if (!result.total && result.subtotal) {
      result.total = Number(((result.subtotal || 0) + (result.tax || 0) - (result.discount || 0)).toFixed(2));
    }

    return result;
  }

  emptyResult() {
    return {
      vendorName: '',
      vendorAddress: '',
      gstin: '',
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      poNumber: '',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      items: []
    };
  }

  extractGSTIN(text) {
    // 15-character Indian GSTIN pattern
    const gstinPattern = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1})\b/i;
    const match = text.match(gstinPattern);
    return match ? match[1].toUpperCase() : '';
  }

  extractInvoiceNumber(text) {
    const patterns = [
      /(?:invoice\s*(?:no|number|#|code)|inv\s*#|bill\s*(?:no|#))[:\s\.\-]+([A-Za-z0-9\-\/]+)/i,
      /(?:invoice\s*id)[:\s\.\-]+([A-Za-z0-9\-\/]+)/i,
      /\b(INV[-#]?[0-9]{4,10})\b/i,
      /\b([A-Z]{2,4}\/[0-9]{2,4}\/[0-9]{3,6})\b/i
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length >= 3 && !/^(date|gstin|total|due)$/i.test(val)) {
          return val;
        }
      }
    }
    return '';
  }

  extractInvoiceDate(text) {
    const patterns = [
      /(?:invoice\s*date|dated|bill\s*date|date of invoice|date)[:\s\.\-]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
      /(?:invoice\s*date|dated|bill\s*date)[:\s\.\-]+([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i,
      /(?:invoice\s*date|dated|bill\s*date)[:\s\.\-]+([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i,
      /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        return this.normalizeDate(match[1].trim());
      }
    }
    return '';
  }

  normalizeDate(dateStr) {
    if (!dateStr) return '';
    try {
      // If already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

      // Handle DD/MM/YYYY or DD-MM-YYYY
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let [p1, p2, p3] = parts;
        if (p3.length === 2) p3 = '20' + p3;
        if (p1.length === 4) {
          // YYYY-MM-DD
          return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        }
        // Assuming DD-MM-YYYY or MM-DD-YYYY
        const d = parseInt(p1, 10);
        const m = parseInt(p2, 10);
        if (d <= 31 && m <= 12) {
          return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        }
      }

      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (_) {}
    return dateStr;
  }

  extractDueDate(text) {
    const patterns = [
      /(?:due\s*date|payment\s*due)[:\s\.\-]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
      /(?:due\s*date|payment\s*due)[:\s\.\-]+([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        return this.normalizeDate(match[1].trim());
      }
    }
    return '';
  }

  extractPONumber(text) {
    const patterns = [
      /(?:p\.?o\.?\s*(?:no|number|#)|purchase\s*order\s*(?:no|#)?)[:\s\.\-]+([A-Za-z0-9\-\/]+)/i,
      /\b(PO[-#]?[0-9]{3,10})\b/i
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  extractVendorName(lines, rawText) {
    // Look for explicit "From:" or "Seller:" or "Vendor:"
    const explicitMatch = rawText.match(/(?:seller|vendor|from|supplier)[:\s\.\-]+([^\n\r]+)/i);
    if (explicitMatch && explicitMatch[1]) {
      const candidate = explicitMatch[1].replace(/GSTIN.*$/i, '').trim();
      if (candidate.length > 2 && !candidate.toLowerCase().includes('invoice')) {
        return candidate;
      }
    }

    // Heuristic: Examine top 8 lines
    const ignoreList = [
      'tax invoice', 'invoice', 'retail invoice', 'cash memo', 'bill of supply',
      'original for recipient', 'duplicate for supplier', 'triplicate for transporter',
      'gstin', 'pan', 'phone', 'email', 'date', 'page'
    ];

    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();
      
      const shouldIgnore = ignoreList.some(ig => lower.includes(ig)) ||
        /^(tax|invoice|bill|original|cash)/i.test(line) ||
        line.length < 3;

      if (!shouldIgnore) {
        // Remove trailing details like phone or email if merged
        const clean = line.replace(/(\+?\d[\d\s\-]{8,}|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g, '').trim();
        if (clean.length >= 3) {
          return clean;
        }
      }
    }
    return '';
  }

  extractVendorAddress(lines) {
    // Often lines 2-5 after vendor name before GSTIN or 'Bill To'
    const addressLines = [];
    let capturing = false;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (/bill to|ship to|buyer|invoice no|gstin/i.test(line)) {
        break;
      }
      if (/(road|street|st\.|ave|nagar|block|plot|phase|estate|bangalore|bengaluru|mumbai|delhi|pune|hyderabad|chennai|ahmedabad|kolkata|pin|floor|sector)/i.test(line)) {
        addressLines.push(line);
      }
    }

    return addressLines.join(', ');
  }

  extractSubtotal(text) {
    const match = text.match(/(?:sub\s*total|subtotal|taxable\s*amount|taxable\s*value)[:\s]*(?:rs\.?|inr|[₹$])?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
  }

  extractDiscount(text) {
    const match = text.match(/(?:total\s*discount|discount|disc)[:\s]*(?:rs\.?|inr|[₹$])?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
  }

  extractTax(text) {
    const match = text.match(/(?:total\s*tax|tax\s*amount|gst\s*amount|igst|cgst\s*\+\s*sgst|tax(?:\s*\([^)]*\))?)[:\s]*(?:rs\.?|inr|[₹$])?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
  }

  extractTotal(text) {
    const patterns = [
      /(?:grand\s*total|total\s*amount|net\s*payable|amount\s*payable|invoice\s*total|net\s*amount)[:\s]*(?:rs\.?|inr|[₹$])?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:total)[:\s]*(?:rs\.?|inr|[₹$])?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (val > 0) return val;
      }
    }
    return 0;
  }

  extractItems(lines, rawText) {
    const items = [];
    const unitKeywords = ['pcs', 'pc', 'box', 'boxes', 'kg', 'gm', 'g', 'ltr', 'ml', 'packet', 'packets', 'packs', 'pack', 'nos', 'unit', 'units', 'can', 'bottle'];

    // Find table start index if exists
    let tableStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if ((line.includes('item') || line.includes('description') || line.includes('particulars')) &&
          (line.includes('qty') || line.includes('quantity') || line.includes('rate') || line.includes('price') || line.includes('amount'))) {
        tableStartIndex = i;
        break;
      }
    }

    const searchLines = tableStartIndex !== -1 ? lines.slice(tableStartIndex + 1) : lines;

    for (const line of searchLines) {
      const lower = line.toLowerCase();
      // Stop if reached summary / totals section
      if (/^(subtotal|taxable|cgst|sgst|igst|total|grand total|tax amount|amount in words|authorized|signature|terms|bank details)/i.test(line)) {
        if (tableStartIndex !== -1) break;
        continue;
      }

      // Pre-process line: Normalize currencies like "Rs. 45000" or "Rs 45000" -> "45000"
      const normalizedLine = line.replace(/(?:rs\.?|inr|[₹$])\s*([0-9])/gi, '$1');

      // Pattern 1: Numbered item row: "1. Samsung 55 inch LED TV - Qty: 2 - Price: 45000" or similar
      const keyValMatch = normalizedLine.match(/(?:^\d+[\.\)]\s*)?([^:\-]+?)\s*[-:]\s*(?:qty|quantity)[:\s]*(\d+(?:\.\d+)?)\s*(?:[a-zA-Z]+)?\s*[-:]\s*(?:price|rate)[:\s]*([0-9,]+(?:\.[0-9]+)?)/i);
      if (keyValMatch) {
        const itemName = keyValMatch[1].replace(/^\d+[\.\)]\s*/, '').trim();
        const qty = parseFloat(keyValMatch[2]) || 1;
        const rate = parseFloat(keyValMatch[3].replace(/,/g, '')) || 0;
        const total = parseFloat((qty * rate).toFixed(2));
        if (itemName.length > 2 && rate > 0) {
          items.push({
            itemName,
            sku: '',
            quantity: qty,
            unit: 'pcs',
            unitPrice: rate,
            discount: 0,
            tax: 0,
            totalPrice: total
          });
          continue;
        }
      }

      // Pattern 2: Tabular line with multiple whitespace/tabs
      const tokens = normalizedLine.split(/\s{2,}|\t/).filter(t => t.trim().length > 0);
      if (tokens.length >= 3) {
        const parsed = this.parseTokensAsItem(tokens, unitKeywords);
        if (parsed) {
          items.push(parsed);
          continue;
        }
      }

      // Pattern 3: Space-separated line where numbers appear towards the end
      const words = normalizedLine.split(/\s+/).filter(w => !/^(rs\.?|inr|[₹$])$/i.test(w));
      if (words.length >= 3) {
        const parsed = this.parseSpaceSeparatedItem(words, unitKeywords);
        if (parsed) {
          items.push(parsed);
          continue;
        }
      }
    }

    return items;
  }

  parseTokensAsItem(tokens, unitKeywords) {
    // Expected format: Name, [SKU], Qty, [Unit], Price, [Discount], [Tax], Total
    let name = tokens[0].replace(/^\d+[\.\)]\s*/, '').trim();
    if (name.length < 2 || /^(total|subtotal|discount|tax|date|invoice)/i.test(name)) return null;

    // Extract numbers from the remaining tokens
    const numericTokens = [];
    let sku = '';
    let unit = 'pcs';

    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i].trim();
      const numVal = parseFloat(t.replace(/,/g, '').replace(/^[₹$]/, ''));
      if (!isNaN(numVal) && /^[-+]?[0-9,]+(?:\.[0-9]+)?$/.test(t.replace(/^[₹$]/, ''))) {
        numericTokens.push(numVal);
      } else if (unitKeywords.includes(t.toLowerCase())) {
        unit = t.toLowerCase();
      } else if (!sku && /^[A-Z0-9\-]{3,15}$/i.test(t)) {
        sku = t;
      }
    }

    if (numericTokens.length >= 2) {
      let qty = numericTokens[0];
      let unitPrice = numericTokens[1];
      let totalPrice = numericTokens[numericTokens.length - 1];

      // If only 2 numbers: [Qty, Price] or [Qty, Total]
      if (numericTokens.length === 2) {
        if (unitPrice > 0 && qty > 0) {
          totalPrice = parseFloat((qty * unitPrice).toFixed(2));
        }
      }

      return {
        itemName: name,
        sku: sku || '',
        quantity: qty > 0 ? qty : 1,
        unit: unit || 'pcs',
        unitPrice: unitPrice > 0 ? unitPrice : 0,
        discount: 0,
        tax: 0,
        totalPrice: totalPrice > 0 ? totalPrice : parseFloat((qty * unitPrice).toFixed(2))
      };
    }
    return null;
  }

  parseSpaceSeparatedItem(words, unitKeywords) {
    // Check if the last elements are numbers (e.g. "Coca Cola 500ml 10 35.00 350.00")
    let i = words.length - 1;
    const nums = [];
    while (i >= 0) {
      const w = words[i].replace(/,/g, '').replace(/^[₹$]/, '');
      const num = parseFloat(w);
      if (!isNaN(num) && /^[0-9]+(?:\.[0-9]+)?$/.test(w)) {
        nums.unshift(num);
        i--;
      } else {
        break;
      }
    }

    if (nums.length >= 2 && i >= 0) {
      // Check if word at i is a unit
      let unit = 'pcs';
      let nameEnd = i + 1;
      if (unitKeywords.includes(words[i].toLowerCase())) {
        unit = words[i].toLowerCase();
        nameEnd = i;
      }

      let nameWords = words.slice(0, nameEnd).filter(w => !/^\d+[\.\)]$/.test(w));
      let sku = '';
      if (nameWords.length > 1) {
        const lastWord = nameWords[nameWords.length - 1];
        if (/^[A-Z0-9]{2,6}-[A-Z0-9\-]+$/i.test(lastWord)) {
          sku = lastWord;
          nameWords = nameWords.slice(0, -1);
        }
      }

      const itemName = nameWords.join(' ').trim();

      if (itemName.length >= 2 && !/^(total|subtotal|discount|tax|date|invoice|balance|cgst|sgst|item description)/i.test(itemName)) {
        const qty = nums[0];
        const unitPrice = nums[1];
        const totalPrice = nums.length >= 3 ? nums[nums.length - 1] : parseFloat((qty * unitPrice).toFixed(2));

        return {
          itemName,
          sku,
          quantity: qty > 0 ? qty : 1,
          unit,
          unitPrice,
          discount: 0,
          tax: 0,
          totalPrice
        };
      }
    }
    return null;
  }
}

module.exports = new InvoiceParser();
