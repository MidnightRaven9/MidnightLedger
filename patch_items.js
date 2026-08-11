import fs from 'fs';
let code = fs.readFileSync('src/views/DashboardView.tsx', 'utf8');

const replacementBills = `    const [y, m] = payday.date.split('-');
    const day = item.bill.dueDay || item.bill.dueDate || 1;
    const dueDateStr = \`\${y}-\${m}-\${String(day).padStart(2, '0')}\`;
    categorySummaryMap[cat].items.push({ 
      id: item.bill.id, 
      name: item.bill.name, 
      category: item.bill.category,
      emoji: item.bill.emoji || getCategoryEmoji(cat), 
      amount: myShare, 
      type: 'bill',
      dueDate: dueDateStr
    });`;

code = code.replace(
  `categorySummaryMap[cat].items.push({ id: item.bill.id, name: item.bill.name, emoji: item.bill.emoji || getCategoryEmoji(cat), amount: myShare, isBill: true });`,
  replacementBills
);

const replacementExps = `    categorySummaryMap[cat].items.push({ 
      id: exp.id, 
      name: exp.description || (exp as any).name, 
      category: exp.category,
      emoji: exp.emoji || getCategoryEmoji(cat), 
      amount: amt, 
      type: 'expense',
      date: exp.date || exp.createdAt
    });`;

code = code.replace(
  `categorySummaryMap[cat].items.push({ id: exp.id, name: exp.name, emoji: exp.emoji || getCategoryEmoji(cat), amount: amt, isBill: false });`,
  replacementExps
);

const jsxTarget = `{cat.items.map((item: any, idx: number) => (
                            <div key={\`\${item.id}-\${idx}\`} className="flex justify-between items-center text-[13px]">
                              <span className="text-zinc-300">{item.emoji || ''} {item.name}</span>
                              <span className="text-zinc-400 font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}`;

const jsxReplacement = `{cat.items.map((item: any, idx: number) => (
                            <div key={\`\${item.id}-\${idx}\`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f1f1f' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                <span style={{ fontSize: '14px' }}>{item.emoji || (item.type === 'bill' ? '🧾' : '💸')}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#e5e7eb' }}>{item.name || item.title || item.description || 'Untitled'}</span>
                                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    {item.type === 'bill' || item.dueDate ? (
                                      \`Due \${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • \${item.category || cat.name}\`
                                    ) : (
                                      item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}`;

if (code.includes(jsxTarget)) {
  code = code.replace(jsxTarget, jsxReplacement);
  fs.writeFileSync('src/views/DashboardView.tsx', code);
  console.log("Patched items properly");
} else {
  console.log("Failed to find JSX target");
}
