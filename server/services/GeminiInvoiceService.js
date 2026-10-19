const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const unitNormalizationService = require('./UnitNormalizationService');

/**
 * Service: GeminiInvoiceService
 * Multimodal Document AI Invoice Parser powered by Google Gemini (1.5 Flash / 2.0 Flash / 1.5 Pro).
 * Features:
 * - Free-tier availability with generous rate limits (15 RPM / 1,500 RPD)
 * - Native multimodal PDF & visual image comprehension
 * - State-of-the-art handwritten, cursive, and unstructured invoice extraction
 * - Structured JSON output matching the Quontriz Invoza GST invoice schema
 */
class GeminiInvoiceService {
  constructor() {
    this.apiKey = (process.env.GEMINI_API_KEY || '').trim();
    this.model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
    this.candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  }

  isConfigured() {
    this.apiKey = (process.env.GEMINI_API_KEY || this.apiKey || '').trim();
    return Boolean(this.apiKey && this.apiKey.length >= 20);
  }

  async checkHealth() {
    if (!this.isConfigured()) {
      return {
        connected: false,
        model: this.model,
        message: 'Google Gemini API key not configured. Enter key in Settings.'
      };
    }

    const testModels = [this.model, ...this.candidateModels.filter(m => m !== this.model)];
    let lastError = null;

    for (const m of testModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with: {"status": "ok"}' }] }],
            generationConfig: { response_mime_type: 'application/json' }
          })
        });

        if (res.ok) {
          this.model = m;
          return {
            connected: true,
            model: m,
            message: `Connected to Google Gemini API successfully! (Model: ${m})`
          };
        }

        const err = await res.json().catch(() => ({}));
        lastError = err?.error?.message || `HTTP ${res.status}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    return {
      connected: false,
      model: this.model,
      message: `Google Gemini returned: ${lastError}`
    };
  }

  async analyzeInvoice(filePath, ocrText = '') {
    const startTime = Date.now();
    if (!this.isConfigured() || !fs.existsSync(filePath)) {
      throw new Error('Gemini API key is not configured or file not found.');
    }

    const ext = path.extname(filePath).toLowerCase();
    const fileBytes = fs.readFileSync(filePath);
    const base64Data = fileBytes.toString('base64');

    let mimeType = 'application/pdf';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.pdf') mimeType = 'application/pdf';

    const promptText = `You are a specialized Multimodal Document AI Invoice Parser for Indian and International GST Invoices.
Extract comprehensive structured invoice data and ALL line items with exact numbers, units, taxes, and financial relationships.

SPECIALIZED CAPABILITY: HANDWRITTEN & MESSY WRITING INVOICE UNDERSTANDING:
- Understand handwritten bills, store receipts, pharmacy slips, grocery chits, estimate slips (kacha bills), and delivery challans.
- Decipher cursive handwriting, messy scribbles, uneven pen pressure, and informal abbreviations.
- When ambiguous digits occur (e.g. 0 vs 6, 1 vs 7, 5 vs S), resolve using arithmetic: Quantity × Rate = Line Total.
- If errors are crossed out, extract the corrected handwritten value.
- Extract freeform column-less items: item_name, quantity, unit, unit_price, line_total.
- Common units: kg, g, gm, ltr, lt, ml, pkt, pkts, tin, ctn, bag, bags, pcs, pc, nos, no, dz, box.
- Synonyms:
  * Advance: adv, jama, deposit, advance_paid
  * Amount Paid / Received: amount_paid, paid, payment received, cash, upi, card, neft, amount settled
  * Outstanding Balance / Due: outstanding_balance, remaining amount, remaining, balance due, baki, baaki, bal, net payable, amount due
  * Discount: disc, chhoot, less, scheme discount
  * Freight / Charges: bhada, hamali, coolie, cartage, delivery, freight, other charges

STRICT CALCULATION & BALANCE RULES:
1. Identify whether invoice is tax-inclusive or tax-exclusive (set "is_tax_inclusive": true or false).
2. If tax-inclusive: item rates or subtotal already include GST. NEVER add GST twice to grand_total.
3. Advance & Payment received:
   * advance_paid = advance / deposit paid in advance.
   * amount_paid = payment received / paid (e.g. UPI, cash, bank).
   * total_paid = advance_paid + amount_paid.
4. OUTSTANDING BALANCE RULE:
   * outstanding_balance MUST EQUAL grand_total - advance_paid - amount_paid.
   * If an invoice states Grand Total: 48,675 and Amount Paid: 30,000, outstanding_balance MUST be 18,675.
   * If Remaining Amount / Balance Due is explicitly printed on the bill, extract that exact amount as outstanding_balance.
5. Set currency to INR if ₹ or Rs or Indian vendor.

Respond strictly with valid JSON following this exact schema:
{
  "supplier": {
    "company_name": "Supplier Company Name",
    "legal_name": "Supplier Legal Name",
    "gstin": "15-digit GSTIN or null",
    "address": "Supplier Full Address",
    "state": "State Name",
    "state_code": "2-digit code",
    "phone": "Phone number or null",
    "email": "Email address or null"
  },
  "buyer": {
    "company_name": "Buyer/Customer Name",
    "gstin": "15-digit GSTIN or null",
    "billing_address": "Buyer Address",
    "shipping_address": "Delivery Address"
  },
  "invoice": {
    "invoice_number": "Invoice or Reference Number",
    "invoice_date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD or null",
    "po_number": "PO or Dispatch ID or null",
    "place_of_supply": "State Name",
    "currency": "INR",
    "payment_terms": "e.g. 15 days or null",
    "payment_method": "e.g. Bank Transfer / UPI / Cash",
    "category": "e.g. Grocery / Electronics / Pharma / General",
    "subtotal": 0.00,
    "discount": 0.00,
    "taxable_amount": 0.00,
    "cgst": 0.00,
    "sgst": 0.00,
    "igst": 0.00,
    "freight_charges": 0.00,
    "other_charges": 0.00,
    "round_off": 0.00,
    "total_gst": 0.00,
    "grand_total": 0.00,
    "advance_paid": 0.00,
    "paid": 0.00,
    "amount_paid": 0.00,
    "outstanding_balance": 0.00,
    "is_tax_inclusive": true,
    "total_amount_in_words": null
  },
  "items": [
    {
      "line_number": 1,
      "item_name": "Exact Item Name",
      "item_description": "Item Description",
      "sku": "Product SKU or N/A",
      "hsn_code": "HSN Code or N/A",
      "quantity": 1,
      "unit_original": "pcs",
      "unit_normalized": "pcs",
      "unit_price": 0.00,
      "price_unit_quantity": 1,
      "price_unit_measure": "pcs",
      "discount_amount": 0.00,
      "taxable_value": 0.00,
      "gst_rate": 18,
      "cgst_amount": 0.00,
      "sgst_amount": 0.00,
      "igst_amount": 0.00,
      "line_total": 0.00
    }
  ],
  "warnings": []
}

Extracted text hints from local reader (if any):
${ocrText || '(Direct visual analysis)'}`;

    const modelsToTry = [this.model, ...this.candidateModels.filter(m => m !== this.model)];
    let lastError = null;

    for (const m of modelsToTry) {
      try {
        console.log(`[GeminiInvoiceService] Querying Google Gemini (${m}) with multimodal ${mimeType}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json'
            }
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error?.message || `HTTP ${res.status}`;
          console.warn(`[GeminiInvoiceService] Model ${m} returned error (${msg}). Trying fallback model...`);
          lastError = new Error(`Gemini API Error (${m}): ${msg}`);
          continue;
        }

        const data = await res.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) {
          console.warn(`[GeminiInvoiceService] Model ${m} returned empty response. Trying fallback model...`);
          lastError = new Error(`Gemini (${m}) returned an empty response.`);
          continue;
        }

        const parsed = JSON.parse(rawJsonText);
        this.model = m;
        return {
          engine: 'gemini',
          model: m,
          latencyMs: Date.now() - startTime,
          ...parsed
        };
      } catch (err) {
        console.warn(`[GeminiInvoiceService] Exception with ${m}: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
  }
}

module.exports = new GeminiInvoiceService();
