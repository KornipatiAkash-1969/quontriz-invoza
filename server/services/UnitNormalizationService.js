/**
 * Service 7: UnitNormalizationService
 * Handles Dynamic Item Units, Quantities, and Measurement Normalization.
 * 
 * Core Rules:
 * 1. Automatic Unit Detection: Identifies measurement unit for every line item independently.
 * 2. Never assumes a single default unit like 'pcs' or 'kg'.
 * 3. Maintains separate 'unit_original' and 'unit_normalized' fields.
 * 4. Preserves unknown or supplier-specific units as printed and flags them for review without guessing.
 * 5. Strict conversion rules: Valid unambiguous conversions only (e.g. 1 dozen = 12 pcs when verified).
 *    Never converts kg to pcs or boxes to pcs without a supplier conversion factor.
 */

const CANONICAL_UNIT_MAP = {
  // --- Weight ---
  'kg': 'kg',
  'kgs': 'kg',
  'k.g.': 'kg',
  'kilo': 'kg',
  'kilos': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'g': 'g',
  'gm': 'g',
  'gms': 'g',
  'gram': 'g',
  'grams': 'g',
  'mg': 'mg',
  'milligram': 'mg',
  'milligrams': 'mg',
  'tonne': 'tonne',
  'tonnes': 'tonne',
  'ton': 'tonne',
  'tons': 'tonne',
  'metric ton': 'tonne',
  'metric tonne': 'tonne',
  'quintal': 'quintal',
  'qtl': 'quintal',
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',
  'oz': 'oz',
  'ounce': 'oz',

  // --- Count & Discrete Units ---
  'pcs': 'pcs',
  'pc': 'pcs',
  'piece': 'pcs',
  'pieces': 'pcs',
  'unit': 'units',
  'units': 'units',
  'nos': 'pcs',
  'no.': 'pcs',
  'no': 'pcs',
  'num': 'pcs',
  'numbers': 'pcs',
  'each': 'each',
  'ea': 'each',
  'dozen': 'dozen',
  'doz': 'dozen',
  'dz': 'dozen',
  'pair': 'pair',
  'pairs': 'pair',
  'set': 'set',
  'sets': 'set',

  // --- Volume ---
  'l': 'L',
  'ltr': 'L',
  'ltrs': 'L',
  'litre': 'L',
  'litres': 'L',
  'liter': 'L',
  'liters': 'L',
  'ml': 'mL',
  'mls': 'mL',
  'millilitre': 'mL',
  'millilitres': 'mL',
  'milliliter': 'mL',
  'milliliters': 'mL',
  'gallon': 'gallon',
  'gallons': 'gallon',
  'gal': 'gallon',
  'kl': 'kL',

  // --- Packaging & Containers ---
  'box': 'box',
  'boxes': 'box',
  'bx': 'box',
  'bxs': 'box',
  'carton': 'carton',
  'cartons': 'carton',
  'ctn': 'carton',
  'ctns': 'carton',
  'packet': 'packet',
  'packets': 'packet',
  'pkt': 'packet',
  'pkts': 'packet',
  'pack': 'pack',
  'packs': 'pack',
  'pck': 'pack',
  'bag': 'bag',
  'bags': 'bag',
  'sack': 'sack',
  'sacks': 'sack',
  'bottle': 'bottle',
  'bottles': 'bottle',
  'btl': 'bottle',
  'btls': 'bottle',
  'can': 'can',
  'cans': 'can',
  'tin': 'tin',
  'tins': 'tin',
  'bundle': 'bundle',
  'bundles': 'bundle',
  'bdl': 'bundle',
  'crate': 'crate',
  'crates': 'crate',
  'pouch': 'pouch',
  'pouches': 'pouch',
  'jar': 'jar',
  'jars': 'jar',
  'case': 'case',
  'cases': 'case',
  'tray': 'tray',
  'trays': 'tray',
  'roll': 'roll',
  'rolls': 'roll',
  'drum': 'drum',
  'drums': 'drum',
  'bucket': 'bucket',
  'barrel': 'barrel',

  // --- Length & Distance ---
  'm': 'm',
  'metre': 'm',
  'metres': 'm',
  'meter': 'm',
  'meters': 'm',
  'mtr': 'm',
  'cm': 'cm',
  'centimetre': 'cm',
  'mm': 'mm',
  'millimetre': 'mm',
  'feet': 'feet',
  'ft': 'feet',
  'inch': 'inch',
  'inches': 'inch',
  'yard': 'yard',
  'yards': 'yard',

  // --- Area ---
  'sq m': 'sq m',
  'sqm': 'sq m',
  'square metre': 'sq m',
  'sq ft': 'sq ft',
  'sqft': 'sq ft',
  'square feet': 'sq ft',
  'sq yd': 'sq yd',

  // --- Time & Services ---
  'hour': 'hour',
  'hours': 'hour',
  'hr': 'hour',
  'hrs': 'hour',
  'day': 'day',
  'days': 'day',
  'month': 'month',
  'service': 'service',
  'services': 'service',
  'job': 'job'
};

class UnitNormalizationService {
  /**
   * Normalize an extracted unit string
   * @param {string|null} rawUnit 
   * @returns {{ unit_original: string|null, unit_normalized: string|null, unit_flagged: boolean }}
   */
  normalizeUnit(rawUnit) {
    if (!rawUnit || typeof rawUnit !== 'string') {
      return {
        unit_original: null,
        unit_normalized: null,
        unit_flagged: false
      };
    }

    const original = rawUnit.trim();
    if (!original) {
      return {
        unit_original: null,
        unit_normalized: null,
        unit_flagged: false
      };
    }

    // Clean punctuation and whitespace for lookup
    const cleaned = original.toLowerCase().replace(/[\s\.\-_/]+/g, '');
    const cleanSpaced = original.toLowerCase().replace(/\./g, '').trim();

    const normalized = CANONICAL_UNIT_MAP[cleaned] || CANONICAL_UNIT_MAP[cleanSpaced];

    if (normalized) {
      return {
        unit_original: original,
        unit_normalized: normalized,
        unit_flagged: false
      };
    }

    // Unfamiliar, supplier-specific, or custom unit
    // Preserved as written and flagged for review rather than guessing
    return {
      unit_original: original,
      unit_normalized: original, // keep original as normalized representation
      unit_flagged: true
    };
  }

  /**
   * Safe unit conversion (only for mathematically verified standard equivalencies)
   * @param {number} quantity 
   * @param {string} fromUnit 
   * @param {string} toUnit 
   * @returns {{ convertedQuantity: number|null, validConversion: boolean, reason?: string }}
   */
  convertUnit(quantity, fromUnit, toUnit) {
    const fromNorm = this.normalizeUnit(fromUnit).unit_normalized;
    const toNorm = this.normalizeUnit(toUnit).unit_normalized;

    if (!fromNorm || !toNorm) {
      return { convertedQuantity: null, validConversion: false, reason: 'Missing unit' };
    }

    if (fromNorm === toNorm) {
      return { convertedQuantity: quantity, validConversion: true };
    }

    // Weight: kg <-> g
    if (fromNorm === 'kg' && toNorm === 'g') return { convertedQuantity: quantity * 1000, validConversion: true };
    if (fromNorm === 'g' && toNorm === 'kg') return { convertedQuantity: quantity / 1000, validConversion: true };

    // Volume: L <-> mL
    if (fromNorm === 'L' && toNorm === 'mL') return { convertedQuantity: quantity * 1000, validConversion: true };
    if (fromNorm === 'mL' && toNorm === 'L') return { convertedQuantity: quantity / 1000, validConversion: true };

    // Count: dozen -> pcs
    if (fromNorm === 'dozen' && toNorm === 'pcs') return { convertedQuantity: quantity * 12, validConversion: true };

    // Cross-category or packaging conversions cannot be assumed without explicit factor
    return {
      convertedQuantity: null,
      validConversion: false,
      reason: `Cannot convert between incompatible units "${fromUnit}" and "${toUnit}" without a verified conversion factor.`
    };
  }

  /**
   * Get supported units list for frontend datalist / autocomplete
   */
  getAllSupportedUnits() {
    return [
      // Weight
      { code: 'kg', name: 'kg (Kilogram)', category: 'Weight' },
      { code: 'g', name: 'g (Gram)', category: 'Weight' },
      { code: 'mg', name: 'mg (Milligram)', category: 'Weight' },
      { code: 'tonne', name: 'tonne (Metric Ton)', category: 'Weight' },
      { code: 'quintal', name: 'quintal (100 kg)', category: 'Weight' },
      { code: 'lb', name: 'lb (Pound)', category: 'Weight' },
      // Count
      { code: 'pcs', name: 'pcs (Pieces)', category: 'Count' },
      { code: 'units', name: 'units', category: 'Count' },
      { code: 'nos', name: 'nos (Numbers)', category: 'Count' },
      { code: 'each', name: 'each', category: 'Count' },
      { code: 'dozen', name: 'dozen (12 pcs)', category: 'Count' },
      { code: 'pair', name: 'pair', category: 'Count' },
      { code: 'set', name: 'set', category: 'Count' },
      // Volume
      { code: 'L', name: 'L (Litre)', category: 'Volume' },
      { code: 'mL', name: 'mL (Millilitre)', category: 'Volume' },
      { code: 'gallon', name: 'gallon', category: 'Volume' },
      // Packaging
      { code: 'packet', name: 'packet (PKT)', category: 'Packaging' },
      { code: 'box', name: 'box', category: 'Packaging' },
      { code: 'carton', name: 'carton (CTN)', category: 'Packaging' },
      { code: 'bag', name: 'bag', category: 'Packaging' },
      { code: 'sack', name: 'sack', category: 'Packaging' },
      { code: 'bottle', name: 'bottle', category: 'Packaging' },
      { code: 'can', name: 'can', category: 'Packaging' },
      { code: 'tin', name: 'tin', category: 'Packaging' },
      { code: 'bundle', name: 'bundle', category: 'Packaging' },
      { code: 'crate', name: 'crate', category: 'Packaging' },
      { code: 'pouch', name: 'pouch', category: 'Packaging' },
      { code: 'jar', name: 'jar', category: 'Packaging' },
      { code: 'case', name: 'case', category: 'Packaging' },
      { code: 'roll', name: 'roll', category: 'Packaging' },
      { code: 'drum', name: 'drum', category: 'Packaging' },
      // Length & Area
      { code: 'm', name: 'm (Metre)', category: 'Length' },
      { code: 'cm', name: 'cm (Centimetre)', category: 'Length' },
      { code: 'mm', name: 'mm (Millimetre)', category: 'Length' },
      { code: 'feet', name: 'feet', category: 'Length' },
      { code: 'sq m', name: 'sq m (Square Metre)', category: 'Area' },
      { code: 'sq ft', name: 'sq ft (Square Feet)', category: 'Area' },
      // Services
      { code: 'hour', name: 'hour', category: 'Time/Service' },
      { code: 'day', name: 'day', category: 'Time/Service' },
      { code: 'service', name: 'service', category: 'Time/Service' }
    ];
  }
}

module.exports = new UnitNormalizationService();
