const raw = `FRESHMART SUPERMARKET
SUPPLIER TAX INVOICE
Supplier FreshBite Foods Invoice No. FBF-2026-0731
Address 18 Industrial Estate Road, Noida Invoice Date 29/09/2026`;

const m = raw.match(/(?:^|\n)\s*(?:supplier(?:\s*\(bill\s*from\))?|vendor|seller)[:\s]+(?!(?:tax\s*invoice))([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:invoice\s*no|inv\s*no|address|gstin|phone|\r?\n|$))/i);
console.log('Supplier match:', m ? m[1].trim() : 'NO MATCH');
