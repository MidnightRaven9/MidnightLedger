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
  'Gas': '⛽',
  'Shopping': '🛒',
  'Pet': '🐾',
  'Entertainment': '🎮',
  'Debt & Credit': '💳',
  'Savings': '🏦',
  'Other': '💸',
};

export const getCategoryEmoji = (category?: string): string => {
  if (!category) return '💸';
  return CATEGORY_EMOJIS[category] || '💸';
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

export const triggerConfetti = () => {
  const emojis = ['🎉', '💜'];
  document.querySelectorAll('.confetti-emoji').forEach(el => el.remove());
  
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-emoji';
    el.textContent = emojis[i % 2];
    el.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-20px;font-size:24px;animation:fall ${2.5 + Math.random() * 1.5}s linear forwards;z-index:9999;pointer-events:none;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
};
