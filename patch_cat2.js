import fs from 'fs';
let code = fs.readFileSync('src/views/DashboardView.tsx', 'utf8');

code = code.replace(
  'const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number; billCount: number; expCount: number }> = {};',
  'const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number; billCount: number; expCount: number; items: any[] }> = {};'
);

code = code.replace(
  'categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0 };',
  'categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };'
);
code = code.replace(
  'categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0 };',
  'categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };'
);

code = code.replace(
  'categorySummaryMap[cat].billCount += 1;',
  'categorySummaryMap[cat].billCount += 1;\n    categorySummaryMap[cat].items.push({ id: item.bill.id, name: item.bill.name, emoji: item.bill.emoji || getCategoryEmoji(cat), amount: myShare, isBill: true });'
);

code = code.replace(
  'categorySummaryMap[cat].expCount += 1;',
  'categorySummaryMap[cat].expCount += 1;\n    categorySummaryMap[cat].items.push({ id: exp.id, name: exp.name, emoji: exp.emoji || getCategoryEmoji(cat), amount: amt, isBill: false });'
);

code = code.replace(
  'color: getCategoryColor(name),',
  'color: getCategoryColor(name),\n      items: data.items'
);

fs.writeFileSync('src/views/DashboardView.tsx', code);
console.log("Patched correctly");
