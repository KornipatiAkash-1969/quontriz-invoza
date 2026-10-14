/**
 * Rule-based semantic keyword classifier for Supermarket & Business goods.
 */

const CATEGORY_DICTIONARY = {
  'Electronics': [
    { word: 'tv', weight: 0.95 },
    { word: 'led', weight: 0.90 },
    { word: 'lcd', weight: 0.90 },
    { word: 'oled', weight: 0.95 },
    { word: 'samsung tv', weight: 0.98 },
    { word: 'sony', weight: 0.85 },
    { word: 'lg', weight: 0.80 },
    { word: 'hdmi', weight: 0.95 },
    { word: 'cable', weight: 0.80 },
    { word: 'usb', weight: 0.90 },
    { word: 'laptop', weight: 0.99 },
    { word: 'mouse', weight: 0.85 },
    { word: 'keyboard', weight: 0.95 },
    { word: 'monitor', weight: 0.95 },
    { word: 'charger', weight: 0.92 },
    { word: 'phone', weight: 0.90 },
    { word: 'smartphone', weight: 0.98 },
    { word: 'iphone', weight: 0.99 },
    { word: 'battery', weight: 0.88 },
    { word: 'speaker', weight: 0.92 },
    { word: 'headphone', weight: 0.96 },
    { word: 'earphone', weight: 0.95 },
    { word: 'bluetooth', weight: 0.90 },
    { word: 'adapter', weight: 0.90 },
    { word: 'router', weight: 0.95 },
    { word: 'hard drive', weight: 0.98 },
    { word: 'ssd', weight: 0.98 },
    { word: 'ram', weight: 0.85 },
    { word: 'camera', weight: 0.95 },
    { word: 'display', weight: 0.85 }
  ],
  'Snacks': [
    { word: 'chips', weight: 0.97 },
    { word: 'lays', weight: 0.98 },
    { word: 'doritos', weight: 0.98 },
    { word: 'kurkure', weight: 0.98 },
    { word: 'biscuits', weight: 0.96 },
    { word: 'biscuit', weight: 0.96 },
    { word: 'cookies', weight: 0.96 },
    { word: 'cookie', weight: 0.96 },
    { word: 'britannia good day', weight: 0.98 },
    { word: 'parle', weight: 0.90 },
    { word: 'parle-g', weight: 0.98 },
    { word: 'oreo', weight: 0.98 },
    { word: 'namkeen', weight: 0.98 },
    { word: 'bhujia', weight: 0.98 },
    { word: 'sev', weight: 0.92 },
    { word: 'pringles', weight: 0.98 },
    { word: 'nachos', weight: 0.96 },
    { word: 'popcorn', weight: 0.95 },
    { word: 'wafers', weight: 0.95 },
    { word: 'crackers', weight: 0.92 },
    { word: 'snack', weight: 0.88 }
  ],
  'Beverages': [
    { word: 'coca cola', weight: 0.99 },
    { word: 'coke', weight: 0.98 },
    { word: 'pepsi', weight: 0.99 },
    { word: 'sprite', weight: 0.99 },
    { word: 'fanta', weight: 0.99 },
    { word: 'thums up', weight: 0.99 },
    { word: 'soda', weight: 0.92 },
    { word: 'coffee', weight: 0.95 },
    { word: 'nescafe', weight: 0.98 },
    { word: 'bru', weight: 0.90 },
    { word: 'tea', weight: 0.90 },
    { word: 'chai', weight: 0.85 },
    { word: 'green tea', weight: 0.96 },
    { word: 'red bull', weight: 0.98 },
    { word: 'juice', weight: 0.95 },
    { word: 'tropicana', weight: 0.98 },
    { word: 'real juice', weight: 0.98 },
    { word: 'mineral water', weight: 0.95 },
    { word: 'water 1l', weight: 0.90 },
    { word: 'aquafina', weight: 0.98 },
    { word: 'kinley', weight: 0.98 },
    { word: 'energy drink', weight: 0.98 },
    { word: 'syrup', weight: 0.88 },
    { word: 'drink', weight: 0.82 }
  ],
  'Dairy': [
    { word: 'milk', weight: 0.98 },
    { word: 'amul', weight: 0.90 },
    { word: 'amul milk', weight: 0.99 },
    { word: 'butter', weight: 0.97 },
    { word: 'salted butter', weight: 0.98 },
    { word: 'cheese', weight: 0.97 },
    { word: 'paneer', weight: 0.98 },
    { word: 'curd', weight: 0.96 },
    { word: 'dahi', weight: 0.96 },
    { word: 'yogurt', weight: 0.97 },
    { word: 'ghee', weight: 0.97 },
    { word: 'cream', weight: 0.85 },
    { word: 'condensed milk', weight: 0.98 },
    { word: 'buttermilk', weight: 0.96 },
    { word: 'chaas', weight: 0.96 },
    { word: 'mozzarella', weight: 0.98 },
    { word: 'cheddar', weight: 0.98 },
    { word: 'dairy', weight: 0.90 }
  ],
  'Bakery': [
    { word: 'bread', weight: 0.98 },
    { word: 'white bread', weight: 0.99 },
    { word: 'brown bread', weight: 0.99 },
    { word: 'bun', weight: 0.95 },
    { word: 'pav', weight: 0.95 },
    { word: 'croissant', weight: 0.98 },
    { word: 'cake', weight: 0.96 },
    { word: 'muffin', weight: 0.98 },
    { word: 'pastry', weight: 0.98 },
    { word: 'toast', weight: 0.90 },
    { word: 'rusk', weight: 0.96 },
    { word: 'bagel', weight: 0.98 },
    { word: 'donut', weight: 0.98 },
    { word: 'doughnut', weight: 0.98 },
    { word: 'pizza base', weight: 0.98 },
    { word: 'brownie', weight: 0.97 },
    { word: 'yeast', weight: 0.90 }
  ],
  'Grocery': [
    { word: 'atta', weight: 0.98 },
    { word: 'aashirvaad', weight: 0.98 },
    { word: 'flour', weight: 0.96 },
    { word: 'maida', weight: 0.97 },
    { word: 'besan', weight: 0.97 },
    { word: 'sooji', weight: 0.97 },
    { word: 'rice', weight: 0.97 },
    { word: 'basmati', weight: 0.98 },
    { word: 'dal', weight: 0.97 },
    { word: 'pulses', weight: 0.95 },
    { word: 'moong', weight: 0.95 },
    { word: 'toor', weight: 0.95 },
    { word: 'chana', weight: 0.95 },
    { word: 'sugar', weight: 0.96 },
    { word: 'salt', weight: 0.95 },
    { word: 'oil', weight: 0.88 },
    { word: 'sunflower oil', weight: 0.97 },
    { word: 'mustard oil', weight: 0.97 },
    { word: 'spices', weight: 0.96 },
    { word: 'turmeric', weight: 0.97 },
    { word: 'haldi', weight: 0.97 },
    { word: 'chilli powder', weight: 0.97 },
    { word: 'cumin', weight: 0.97 },
    { word: 'jeera', weight: 0.97 },
    { word: 'masala', weight: 0.96 },
    { word: 'garam masala', weight: 0.98 },
    { word: 'pasta', weight: 0.95 },
    { word: 'maggi', weight: 0.97 },
    { word: 'noodles', weight: 0.95 },
    { word: 'ketchup', weight: 0.95 },
    { word: 'sauce', weight: 0.90 },
    { word: 'oats', weight: 0.96 },
    { word: 'cornflakes', weight: 0.96 }
  ],
  'Personal Care': [
    { word: 'soap', weight: 0.96 },
    { word: 'dove', weight: 0.95 },
    { word: 'lux', weight: 0.95 },
    { word: 'dettol soap', weight: 0.98 },
    { word: 'shampoo', weight: 0.98 },
    { word: 'conditioner', weight: 0.96 },
    { word: 'toothpaste', weight: 0.98 },
    { word: 'colgate', weight: 0.98 },
    { word: 'toothbrush', weight: 0.98 },
    { word: 'lotion', weight: 0.95 },
    { word: 'face wash', weight: 0.98 },
    { word: 'facewash', weight: 0.98 },
    { word: 'deodorant', weight: 0.98 },
    { word: 'perfume', weight: 0.96 },
    { word: 'shaving', weight: 0.97 },
    { word: 'razor', weight: 0.96 },
    { word: 'gillette', weight: 0.98 },
    { word: 'sanitizer', weight: 0.96 },
    { word: 'body wash', weight: 0.98 },
    { word: 'hair oil', weight: 0.96 }
  ],
  'Household': [
    { word: 'detergent', weight: 0.98 },
    { word: 'surf excel', weight: 0.99 },
    { word: 'ariel', weight: 0.98 },
    { word: 'tide', weight: 0.98 },
    { word: 'vim', weight: 0.98 },
    { word: 'dishwash', weight: 0.98 },
    { word: 'floor cleaner', weight: 0.98 },
    { word: 'lizol', weight: 0.99 },
    { word: 'harpic', weight: 0.99 },
    { word: 'toilet cleaner', weight: 0.98 },
    { word: 'bleach', weight: 0.96 },
    { word: 'sponge', weight: 0.92 },
    { word: 'mop', weight: 0.95 },
    { word: 'garbage bag', weight: 0.97 },
    { word: 'trash bag', weight: 0.97 },
    { word: 'tissue', weight: 0.95 },
    { word: 'napkin', weight: 0.92 },
    { word: 'air freshener', weight: 0.97 },
    { word: 'odonil', weight: 0.98 },
    { word: 'mosquito', weight: 0.95 },
    { word: 'all out', weight: 0.98 },
    { word: 'good knight', weight: 0.98 }
  ],
  'Stationery': [
    { word: 'pen', weight: 0.95 },
    { word: 'ball pen', weight: 0.98 },
    { word: 'gel pen', weight: 0.98 },
    { word: 'pencil', weight: 0.96 },
    { word: 'notebook', weight: 0.98 },
    { word: 'notes', weight: 0.85 },
    { word: 'paper', weight: 0.90 },
    { word: 'a4 paper', weight: 0.98 },
    { word: 'stapler', weight: 0.98 },
    { word: 'staples', weight: 0.96 },
    { word: 'marker', weight: 0.96 },
    { word: 'highlighter', weight: 0.98 },
    { word: 'eraser', weight: 0.97 },
    { word: 'sharpener', weight: 0.97 },
    { word: 'tape', weight: 0.88 },
    { word: 'scissors', weight: 0.92 },
    { word: 'folder', weight: 0.95 },
    { word: 'file', weight: 0.85 },
    { word: 'envelope', weight: 0.95 },
    { word: 'calculator', weight: 0.95 },
    { word: 'sticky notes', weight: 0.98 }
  ],
  'Fruits & Vegetables': [
    { word: 'apple', weight: 0.97 },
    { word: 'banana', weight: 0.98 },
    { word: 'orange', weight: 0.95 },
    { word: 'mango', weight: 0.97 },
    { word: 'potato', weight: 0.98 },
    { word: 'potatoes', weight: 0.98 },
    { word: 'onion', weight: 0.98 },
    { word: 'onions', weight: 0.98 },
    { word: 'tomato', weight: 0.98 },
    { word: 'tomatoes', weight: 0.98 },
    { word: 'garlic', weight: 0.96 },
    { word: 'ginger', weight: 0.96 },
    { word: 'carrot', weight: 0.97 },
    { word: 'lemon', weight: 0.96 },
    { word: 'coriander', weight: 0.96 },
    { word: 'spinach', weight: 0.97 },
    { word: 'capsicum', weight: 0.98 },
    { word: 'cucumber', weight: 0.97 },
    { word: 'grapes', weight: 0.97 },
    { word: 'watermelon', weight: 0.98 },
    { word: 'vegetable', weight: 0.95 },
    { word: 'fruit', weight: 0.95 }
  ]
};

class RuleBasedProvider {
  name = 'Rule-based Semantic Engine';

  classify(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      return { category: 'Other', confidence: 0.0 };
    }

    const cleaned = itemName.toLowerCase().trim();

    let bestCategory = 'Other';
    let highestConfidence = 0.0;

    for (const [category, keywords] of Object.entries(CATEGORY_DICTIONARY)) {
      for (const entry of keywords) {
        // Regex word boundary matching or substring matching for multi-word phrases
        const regex = new RegExp(`\\b${entry.word}\\b`, 'i');
        if (regex.test(cleaned) || cleaned.includes(entry.word)) {
          if (entry.weight > highestConfidence) {
            highestConfidence = entry.weight;
            bestCategory = category;
          }
        }
      }
    }

    if (highestConfidence === 0) {
      // Low confidence fallback
      return {
        category: 'Other',
        confidence: 0.50
      };
    }

    return {
      category: bestCategory,
      confidence: Number(highestConfidence.toFixed(2))
    };
  }
}

module.exports = RuleBasedProvider;
