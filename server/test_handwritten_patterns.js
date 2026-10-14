const unitRegex = /^(kg|kgs|gm|gms|g|ltr|lt|l|ml|pkt|pkts|packet|packets|box|boxes|strip|strips|bot|bottle|bottles|doz|dz|dozen|pcs|pc|pes|nos|no|tin|tins|bag|bags|can|cans|pouch|pouches|meter|mtr|m)$/i;

const examples = [
  'Sugar 5 kg @ 42/- = 210/-',
  'Atta 10 kg @ Rs. 38 = Rs. 380',
  '5 kg Sugar @ 42 = 210',
  '10 kg Atta @ 38 = 380',
  '2 ltr Mustard Oil @ 165 = 330',
  'Mustard Oil 2 ltr @ 165 = 330',
  'Moong Dal 3 kg x 120 = 360',
  'Paracetamol 500mg 2 strips @ 25 = 50',
  'Cough Syrup 1 bot @ 110 = 110',
  'Vitamin C 3 pkt @ 45 = 135',
  'Dettol Soap 4 pcs @ 35 = 140',
  'Basmati Rice 25 kg @ 45 1,125',
  '5 kg Sugar 42 210',
  '10 kg Atta 38 380',
  '1. 5 kg Sugar @ 42 = 210',
  '2. 10 kg Atta @ 38 = 380'
];

function cleanLine(rawLine) {
  return rawLine
    .replace(/[$■₹]/g, ' ')
    .replace(/\b(?:rs|re|inr)\.?\s*/gi, ' ')
    .replace(/\(n\)/gi, ' ')
    .replace(/\s+n\s+/gi, ' ')
    .replace(/([0-9])\/[-=]\b/g, '$1 ')
    .replace(/\/[-=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseItem(rawLine) {
  const line = cleanLine(rawLine);

  // Pattern 5d: Name First with @, x, *, at
  const pNameFirst = line.match(/^(\d+[\.\)\s]+)?(.*?)\s+(\d+(?:\.\d+)?)\s*([A-Za-z]+)?\s*(?:[@x*]|at)\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:=|is|:|[-–])?\s*([0-9,]+(?:\.[0-9]+)?)$/i);
  if (pNameFirst) {
    const name = pNameFirst[2].replace(/^[0-9]+[\.\)\s]+/, '').trim();
    const qty = parseFloat(pNameFirst[3]) || 1;
    const rawUnit = pNameFirst[4] || 'pcs';
    const rate = parseFloat(pNameFirst[5].replace(/,/g, ''));
    const total = parseFloat((pNameFirst[6] || '').replace(/,/g, '')) || (qty * rate);
    if (name.length >= 2 && (rate > 0 || total > 0)) {
      return { pattern: '5d-NameFirst', name, qty, unit: rawUnit, rate: rate || (total / qty), total, valid: Math.abs(qty * rate - total) < 2.0 };
    }
  }

  // Pattern 5e: Qty First with @, x, *, at
  const pQtyFirst = line.match(/^(\d+[\.\)\s]+)?(\d+(?:\.\d+)?)\s+(.*?)\s*(?:[@x*]|at)\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:=|is|:|[-–])?\s*([0-9,]+(?:\.[0-9]+)?)$/i);
  if (pQtyFirst) {
    const qty = parseFloat(pQtyFirst[2]);
    let rest = pQtyFirst[3].trim();
    let unit = 'pcs';
    const parts = rest.split(/\s+/);
    if (parts.length > 1 && unitRegex.test(parts[0])) {
      unit = parts[0];
      rest = parts.slice(1).join(' ');
    }
    const rate = parseFloat(pQtyFirst[4].replace(/,/g, ''));
    const total = parseFloat((pQtyFirst[5] || '').replace(/,/g, '')) || (qty * rate);
    if (rest.length >= 2 && (rate > 0 || total > 0)) {
      return { pattern: '5e-QtyFirst', name: rest, qty, unit, rate: rate || (total / qty), total, valid: Math.abs(qty * rate - total) < 2.0 };
    }
  }

  // Pattern 5f: Qty First without @ (e.g. 5 kg Sugar 42 210)
  const pQtyFirstNoAt = line.match(/^(\d+[\.\)\s]+)?(\d+(?:\.\d+)?)\s+(.*?)\s+([0-9,]+(?:\.[0-9]+)?)\s+([0-9,]+(?:\.[0-9]+)?)$/i);
  if (pQtyFirstNoAt) {
    const qty = parseFloat(pQtyFirstNoAt[2]);
    let rest = pQtyFirstNoAt[3].trim();
    let unit = 'pcs';
    const parts = rest.split(/\s+/);
    if (parts.length > 1 && unitRegex.test(parts[0])) {
      unit = parts[0];
      rest = parts.slice(1).join(' ');
    }
    const rate = parseFloat(pQtyFirstNoAt[4].replace(/,/g, ''));
    const total = parseFloat(pQtyFirstNoAt[5].replace(/,/g, ''));
    if (rest.length >= 2 && Math.abs(qty * rate - total) < 2.0) {
      return { pattern: '5f-QtyFirstNoAt', name: rest, qty, unit, rate, total, valid: true };
    }
  }

  return null;
}

let allPassed = true;
for (const ex of examples) {
  const res = parseItem(ex);
  if (res && res.valid) {
    console.log(`✅ ${ex} -> [${res.pattern}] "${res.name}" qty:${res.qty} ${res.unit} @ ${res.rate} = ${res.total}`);
  } else {
    console.log(`❌ FAILED: ${ex}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL 16/16 HANDWRITTEN TEST CASES PASSED!');
} else {
  process.exit(1);
}
