import fs from 'fs';
let code = fs.readFileSync('src/views/DashboardView.tsx', 'utf8');

const targetStr = `  // Spending by Category aggregation
  const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number; billCount: number; expCount: number }> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = item.effectiveAmount;
    const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;

    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0 };
    categorySummaryMap[cat].amount += myShare;
    categorySummaryMap[cat].fullAmount += fullBillAmt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].billCount += 1;
    totalPeriodAmount += myShare;
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = exp.amount;

    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0 };
    categorySummaryMap[cat].amount += amt;
    categorySummaryMap[cat].fullAmount += amt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].expCount += 1;
    totalPeriodAmount += amt;
  });

  const categoriesList = Object.entries(categorySummaryMap).map(([name, data]) => {
    const percentage = totalPeriodAmount > 0 ? Math.round((data.amount / totalPeriodAmount) * 100) : 0;
    let subtitle = '';
    if (data.billCount > 0 && data.expCount > 0) {
      subtitle = \`\${data.billCount} bill\${data.billCount !== 1 ? 's' : ''}, \${data.expCount} exp\${data.expCount !== 1 ? 's' : ''}\`;
    } else if (data.expCount > 0) {
      subtitle = \`\${data.expCount} expense\${data.expCount !== 1 ? 's' : ''}\`;
    } else {
      subtitle = \`\${data.billCount} bill\${data.billCount !== 1 ? 's' : ''}\`;
    }

    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      subtitle,
      percentage,
      color: getCategoryColor(name),
    };
  }).sort((a, b) => b.amount - a.amount);`;

const replacement = `  // Spending by Category aggregation
  const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number; billCount: number; expCount: number; items: any[] }> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = item.effectiveAmount;
    const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;

    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };
    categorySummaryMap[cat].amount += myShare;
    categorySummaryMap[cat].fullAmount += fullBillAmt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].billCount += 1;
    categorySummaryMap[cat].items.push({ id: item.bill.id, name: item.bill.name, emoji: item.bill.emoji || getCategoryEmoji(cat), amount: myShare, isBill: true });
    totalPeriodAmount += myShare;
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = exp.amount;

    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };
    categorySummaryMap[cat].amount += amt;
    categorySummaryMap[cat].fullAmount += amt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].expCount += 1;
    categorySummaryMap[cat].items.push({ id: exp.id, name: exp.name, emoji: exp.emoji || getCategoryEmoji(cat), amount: amt, isBill: false });
    totalPeriodAmount += amt;
  });

  const categoriesList = Object.entries(categorySummaryMap).map(([name, data]) => {
    const percentage = totalPeriodAmount > 0 ? Math.round((data.amount / totalPeriodAmount) * 100) : 0;
    let subtitle = '';
    if (data.billCount > 0 && data.expCount > 0) {
      subtitle = \`\${data.billCount} bill\${data.billCount !== 1 ? 's' : ''}, \${data.expCount} exp\${data.expCount !== 1 ? 's' : ''}\`;
    } else if (data.expCount > 0) {
      subtitle = \`\${data.expCount} expense\${data.expCount !== 1 ? 's' : ''}\`;
    } else {
      subtitle = \`\${data.billCount} bill\${data.billCount !== 1 ? 's' : ''}\`;
    }

    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      subtitle,
      percentage,
      color: getCategoryColor(name),
      items: data.items
    };
  }).sort((a, b) => b.amount - a.amount);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/views/DashboardView.tsx', code);
  console.log("Patched categories logic");
} else {
  console.log("Categories logic target not found");
}
