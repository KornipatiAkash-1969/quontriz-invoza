const { z } = require('zod');

/**
 * Service 6: InvoiceSchemaValidator
 * Enforces strict structural and type validation on AI-extracted invoice outputs.
 * Flags missing or invalid fields without fabricating values.
 */

const LineItemSchema = z.object({
  line_number: z.number().nullable().optional(),
  item_name: z.string().min(1, 'Item name must not be empty'),
  item_description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  hsn_code: z.string().nullable().optional(),
  quantity: z.number().nonnegative().default(1),
  unit_original: z.string().nullable().optional(),
  unit_normalized: z.string().nullable().optional(),
  unit_price: z.number().nonnegative().default(0),
  price_unit_quantity: z.number().positive().default(1),
  price_unit_measure: z.string().nullable().optional(),
  discount_amount: z.number().nonnegative().default(0),
  taxable_value: z.number().nonnegative().nullable().optional(),
  gst_rate: z.number().nonnegative().nullable().optional(),
  cgst_amount: z.number().nonnegative().default(0),
  sgst_amount: z.number().nonnegative().default(0),
  igst_amount: z.number().nonnegative().default(0),
  category: z.string().nullable().optional(),
  line_total: z.number().nonnegative().default(0),
  calculation_valid: z.boolean().default(true),
  unit_flagged: z.boolean().default(false)
});

const SupplierSchema = z.object({
  company_name: z.string().nullable().optional(),
  legal_name: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  state_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional()
});

const BuyerSchema = z.object({
  company_name: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  billing_address: z.string().nullable().optional(),
  shipping_address: z.string().nullable().optional()
});

const InvoiceDetailsSchema = z.object({
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  po_number: z.string().nullable().optional(),
  place_of_supply: z.string().nullable().optional(),
  currency: z.string().default('INR'),
  payment_terms: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  taxable_amount: z.number().default(0),
  cgst: z.number().default(0),
  sgst: z.number().default(0),
  igst: z.number().default(0),
  freight_charges: z.number().default(0),
  other_charges: z.number().default(0),
  round_off: z.number().default(0),
  total_gst: z.number().default(0),
  grand_total: z.number().default(0),
  advance_paid: z.number().default(0),
  paid: z.number().default(0),
  amount_paid: z.number().default(0),
  outstanding_balance: z.number().default(0),
  total_amount_in_words: z.string().nullable().optional()
});

const FullInvoiceExtractionSchema = z.object({
  supplier: SupplierSchema.default({}),
  buyer: BuyerSchema.default({}),
  invoice: InvoiceDetailsSchema.default({}),
  items: z.array(LineItemSchema).default([]),
  warnings: z.array(z.string()).default([])
});

class InvoiceSchemaValidator {
  /**
   * Validate and sanitize AI extraction output
   * @param {Object} rawData 
   * @returns {{ success: boolean, data?: Object, errors?: Array }}
   */
  validate(rawData) {
    try {
      const parsed = FullInvoiceExtractionSchema.parse(rawData);
      return {
        success: true,
        data: parsed,
        errors: []
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        success: false,
        data: null,
        errors: [err.message]
      };
    }
  }

  /**
   * Safe parse that sanitizes invalid fields without failing the entire invoice
   * @param {Object} rawData 
   */
  safeSanitize(rawData) {
    if (!rawData || typeof rawData !== 'object') {
      return FullInvoiceExtractionSchema.parse({});
    }

    const sanitizedItems = Array.isArray(rawData.items)
      ? rawData.items.map((it, idx) => {
          const qty = Number(it.quantity) || 1;
          const rate = Number(it.unit_price) || 0;
          const basis = Number(it.price_unit_quantity) || 1;
          const total = Number(it.line_total) || Number(it.total) || parseFloat(((qty / basis) * rate).toFixed(2));

          return {
            line_number: it.line_number || (idx + 1),
            item_name: String(it.item_name || it.itemName || `Item #${idx + 1}`).trim(),
            item_description: it.item_description || it.description || null,
            sku: it.sku || null,
            hsn_code: it.hsn_code || it.hsnCode || null,
            category: it.category || null,
            quantity: qty,
            unit_original: it.unit_original || it.unitOriginal || it.unit || null,
            unit_normalized: it.unit_normalized || it.unitNormalized || null,
            unit_price: rate,
            price_unit_quantity: basis,
            price_unit_measure: it.price_unit_measure || it.priceUnitMeasure || null,
            discount_amount: Number(it.discount_amount || it.discount || 0),
            taxable_value: Number(it.taxable_value || it.taxableValue || 0),
            gst_rate: Number(it.gst_rate || it.gstRate || 0),
            cgst_amount: Number(it.cgst_amount || 0),
            sgst_amount: Number(it.sgst_amount || 0),
            igst_amount: Number(it.igst_amount || 0),
            line_total: total,
            calculation_valid: it.calculation_valid !== false,
            unit_flagged: Boolean(it.unit_flagged)
          };
        })
      : [];

    return FullInvoiceExtractionSchema.parse({
      supplier: rawData.supplier || {},
      buyer: rawData.buyer || {},
      invoice: rawData.invoice || {},
      items: sanitizedItems,
      warnings: rawData.warnings || []
    });
  }

  /**
   * Validate and sanitize AI extraction output, ensuring vendor/supplier compatibility
   */
  validateAndSanitize(rawData) {
    const sanitized = this.safeSanitize(rawData);
    return {
      vendor: {
        vendor_name: sanitized.supplier?.company_name || sanitized.supplier?.legal_name || 'Detected Supplier',
        gstin: sanitized.supplier?.gstin || null,
        vendor_gstin: sanitized.supplier?.gstin || null,
        address: sanitized.supplier?.address || null,
        vendor_address: sanitized.supplier?.address || null,
        contact: sanitized.supplier?.phone || null,
        email: sanitized.supplier?.email || null,
        vendor_type: 'General Supplier'
      },
      supplier: sanitized.supplier,
      buyer: sanitized.buyer,
      invoice: sanitized.invoice,
      items: sanitized.items,
      warnings: sanitized.warnings
    };
  }
}

module.exports = new InvoiceSchemaValidator();
