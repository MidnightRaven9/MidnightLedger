export const CATEGORY_EMOJIS: Record<string, string> = {
  'Housing': '🏠',
  'Utilities': '⚡',
  'Car': '⛽',
  'Insurance': '🛡️',
  'Phone & Internet': '📱',
  'Subscriptions': '🎬',
  'Streaming Subscriptions': '🎬',
  'Food & Household': '🍔',
  'Food': '🍔',
  'Food/Drinks': '🍔',
  'Gas': '⛽',
  'Shopping': '🛍️',
  'Groceries': '🛒',
  'Pet': '🐾',
  'Entertainment': '🎮',
  'Fun': '🎉',
  'Bills': '📄',
  'Cigs': '🚬',
  'Debt & Credit': '💳',
  'Savings': '🏦',
  'Other': '📦',
};

export const getCategoryEmoji = (category?: string): string => {
  if (!category) return '💸';
  if (CATEGORY_EMOJIS[category]) return CATEGORY_EMOJIS[category];
  
  // Also check custom categories from localStorage
  try {
    const savedExpenseCats = localStorage.getItem('midnightledger_customExpenseCategories');
    if (savedExpenseCats) {
      const parsed = JSON.parse(savedExpenseCats);
      const custom = parsed.find((c: any) => c.name === category);
      if (custom) return custom.emoji;
    }
    const savedBillCats = localStorage.getItem('customBillCategories') || localStorage.getItem('midnightledger_customBillCategories');
    if (savedBillCats) {
      const parsed = JSON.parse(savedBillCats);
      const custom = parsed.find((c: any) => c.name === category);
      if (custom) return custom.emoji;
    }
    const savedCats = localStorage.getItem('midnightledger_customCategories');
    if (savedCats) {
      const parsed = JSON.parse(savedCats);
      const custom = parsed.find((c: any) => c.name === category);
      if (custom) return custom.emoji;
    }
  } catch (e) {
    // ignore
  }
  
  return '📦'; // Default for custom / other
};

export const suggestEmoji = (name: string): string | null => {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('rent') || n.includes('apartment') || n.includes('house') || n.includes('mortgage')) return '🏠';
  if (n.includes('electric') || n.includes('water') || n.includes('gas bill') || n.includes('util') || n.includes('power')) return '⚡';
  if (n.includes('insurance') || n.includes('health') || n.includes('car ins') || n.includes('geico') || n.includes('state farm')) return '🛡️';
  if (n.includes('phone') || n.includes('internet') || n.includes('wifi') || n.includes('mobile') || n.includes('verizon') || n.includes('att') || n.includes('t-mobile')) return '📱';
  if (n.includes('netflix') || n.includes('spotify') || n.includes('hulu') || n.includes('sub') || n.includes('disney') || n.includes('apple')) return '🎬';
  if (n.includes('food') || n.includes('grocery') || n.includes('restaurant') || n.includes('walmart')) return '🍔';
  if (n.includes('gas') || n.includes('fuel') || n.includes('shell') || n.includes('chevron')) return '⛽';
  if (n.includes('dog') || n.includes('cat') || n.includes('pet') || n.includes('vet')) return '🐾';
  return null;
};

import confetti from 'canvas-confetti';

let customConfetti: any = null;

try {
  if (typeof window !== 'undefined' && confetti && typeof (confetti as any).create === 'function') {
    customConfetti = (confetti as any).create(null, { useWorker: false, resize: true });
  }
} catch (e) {
  console.warn('Failed to initialize custom confetti instance:', e);
}

export const triggerConfetti = () => {
  try {
    const fire = customConfetti || confetti;
    if (typeof fire === 'function') {
      fire({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 }, 
        colors: ['#a855f7', '#ec4899', '#8b5cf6'],
        zIndex: 9999,
      });
    }
  } catch (e) {
    console.error('Confetti error:', e);
  }
};

export const triggerPurpleHearts = () => {
  document.querySelectorAll('.purple-heart-anim').forEach(el => el.remove());
  
  // Create stylesheet for keyframes if it doesn't exist
  if (!document.getElementById('purple-heart-styles')) {
    const style = document.createElement('style');
    style.id = 'purple-heart-styles';
    style.textContent = `
      @keyframes fallHearts {
        0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'purple-heart-anim';
    el.textContent = '💜';
    el.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-20px;font-size:${20 + Math.random() * 14}px;animation:fallHearts ${2.5 + Math.random() * 1.5}s linear forwards;z-index:9999;pointer-events:none;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
};
