import { Bill, PaydaySummary, ExtraExpense, Payday } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';

export interface RavenContext {
  nextPaydaySummary: PaydaySummary | null;
  allPaydaySummaries: PaydaySummary[];
  bills: Bill[];
  extraExpenses: ExtraExpense[];
  categoryTotals: Record<string, number>;
  topCategory: { category: string; amount: number } | null;
  subscriptionsList: Bill[];
  subscriptionsTotal: number;
  debtBills: Bill[];
  totalDebtBalance: number;
}

export function extractRavenContext(
  bills: Bill[],
  paydays: Payday[],
  summaries: PaydaySummary[],
  extraExpenses: ExtraExpense[]
): RavenContext {
  const activeBills = bills.filter(b => b.isActive);
  const nextPaydaySummary = summaries.length > 0 ? summaries[0] : null;

  // Calculate category totals across active bills
  const categoryTotals: Record<string, number> = {};
  let topCategoryName = '';
  let topCategoryAmount = 0;

  activeBills.forEach(b => {
    const amt = b.amount;
    categoryTotals[b.category] = (categoryTotals[b.category] || 0) + amt;
    if (categoryTotals[b.category] > topCategoryAmount) {
      topCategoryAmount = categoryTotals[b.category];
      topCategoryName = b.category;
    }
  });

  const subscriptionsList = activeBills.filter(
    b => b.category === 'Subscriptions' || b.name.toLowerCase().includes('netflix') || b.name.toLowerCase().includes('spotify') || b.name.toLowerCase().includes('hulu')
  );
  const subscriptionsTotal = subscriptionsList.reduce((sum, b) => sum + b.amount, 0);

  const debtBills = activeBills.filter(
    b => b.isDebt || b.category === 'Debt & Credit' || b.name.toLowerCase().includes('card') || b.name.toLowerCase().includes('loan')
  );
  const totalDebtBalance = debtBills.reduce((sum, b) => sum + (b.totalBalance || b.amount), 0);

  return {
    nextPaydaySummary,
    allPaydaySummaries: summaries,
    bills: activeBills,
    extraExpenses,
    categoryTotals,
    topCategory: topCategoryName ? { category: topCategoryName, amount: topCategoryAmount } : null,
    subscriptionsList,
    subscriptionsTotal,
    debtBills,
    totalDebtBalance,
  };
}

export async function askRavenAdvisor(
  userPrompt: string,
  context: RavenContext
): Promise<string> {
  // First, try calling our Express server API
  try {
    const res = await fetch('/api/ai-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        budgetContext: {
          nextPaydayDate: context.nextPaydaySummary?.payday.date,
          nextPaydayCheck: context.nextPaydaySummary?.estimatedCheck,
          nextPaydayBillsTotal: context.nextPaydaySummary?.totalBills,
          nextPaydayExtraExpensesTotal: context.nextPaydaySummary?.totalExtraExpenses,
          nextPaydayLeftOver: context.nextPaydaySummary?.leftOver,
          nextPaydayBills: context.nextPaydaySummary?.assignedBills.map(ab => ({
            name: ab.bill.name,
            dueDay: ab.bill.dueDate,
            myShare: ab.effectiveAmount,
            category: ab.bill.category,
            isPaid: ab.isPaid,
          })),
          trackedExpenses: context.extraExpenses.map(e => ({
            description: e.description,
            amount: e.amount,
            category: e.category,
            paydayDate: e.paydayDate,
            date: e.date || e.paydayDate,
            paymentMethod: e.paymentMethod,
          })),
          allBillsCount: context.bills.length,
          topCategory: context.topCategory,
          subscriptions: context.subscriptionsList.map(s => ({ name: s.name, amount: s.amount })),
          subscriptionsTotal: context.subscriptionsTotal,
          debtBills: context.debtBills.map(d => ({
            name: d.name,
            monthlyPayment: d.amount,
            totalBalance: d.totalBalance,
            interestRate: d.interestRate,
          })),
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply && !data.reply.includes("I am analyzing your budget locally!")) {
        return data.reply;
      }
    }
  } catch {
    // Fallback to intelligent local engine
  }

  // Fallback intelligent local response engine (Personalized using exact user numbers)
  const query = userPrompt.toLowerCase();

  const currentLeftOver = context.nextPaydaySummary?.leftOver;
  const isOverspent = currentLeftOver !== null && currentLeftOver !== undefined && currentLeftOver < 0;

  // 1. SPECIFIC CATEGORY / MERCHANT SPENDING ENQUIRY
  const commonKeywords = ['gas', 'groceries', 'food', 'drinks', 'shopping', 'fun', 'coffee', 'walmart', 'dining', 'car', 'utilities'];
  const matchedKeyword = commonKeywords.find(kw => query.includes(kw));

  if (matchedKeyword || query.includes('how much did i spend') || query.includes('how much spent')) {
    const searchWord = matchedKeyword || query.replace('how much did i spend on', '').trim();
    const matchingExpenses = context.extraExpenses.filter(e =>
      e.description.toLowerCase().includes(searchWord) ||
      e.category?.toLowerCase().includes(searchWord)
    );

    if (matchingExpenses.length > 0) {
      const totalSpent = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const itemList = matchingExpenses
        .map(e => `• ${e.description}: ${formatCurrency(e.amount)} (${e.date ? formatDate(e.date, 'short') : formatDate(e.paydayDate, 'short')})`)
        .join('\n');

      let reply = `You have spent **${formatCurrency(totalSpent)}** on **${searchWord.toUpperCase()}** across ${matchingExpenses.length} transaction${matchingExpenses.length > 1 ? 's' : ''}:\n\n${itemList}`;

      if (isOverspent) {
        reply += `\n\n⚠️ **Heads Up**: Your upcoming check on ${formatDate(context.nextPaydaySummary!.payday.date, 'medium')} is currently overspent by **${formatCurrency(Math.abs(currentLeftOver!))}**! Cutting back on non-essentials will help bring your balance positive.`;
      }

      return reply;
    }
  }

  // 2. BILL DISCUSSION / WHAT IS DUE NEXT CHECK
  if (
    query.includes('due') ||
    query.includes('next check') ||
    query.includes('next payday') ||
    query.includes('upcoming') ||
    query.includes('what do i owe')
  ) {
    if (!context.nextPaydaySummary) {
      return "I couldn't find any upcoming paydays in your schedule yet. Try adding a payday date or setting up your schedule in the Paydays tab!";
    }

    const summary = context.nextPaydaySummary;
    const dateFormatted = formatDate(summary.payday.date, 'medium');
    const assigned = summary.assignedBills;

    if (assigned.length === 0 && summary.totalExtraExpenses === 0) {
      return `Good news! On your next payday (${dateFormatted}), you don't have any bills or expenses scheduled due. Your estimated check of ${summary.estimatedCheck !== null ? formatCurrency(summary.estimatedCheck) : '$0'} is completely clear!`;
    }

    const billItems = assigned
      .map(b => `• ${b.bill.name}: ${formatCurrency(b.effectiveAmount)} (Due on the ${b.bill.dueDate}th)`)
      .join('\n');

    let response = `On your next paycheck (${dateFormatted}), you have ${assigned.length} bill${assigned.length > 1 ? 's' : ''} due totaling ${formatCurrency(summary.totalBills)}:\n\n${billItems}\n\n`;

    if (summary.totalExtraExpenses > 0) {
      response += `Plus **${formatCurrency(summary.totalExtraExpenses)}** in tracked spending for this check!\n\n`;
    }

    if (summary.estimatedCheck !== null) {
      if (isOverspent) {
        response += `⚠️ **WARNING**: With an estimated check of ${formatCurrency(summary.estimatedCheck)}, your total obligations of ${formatCurrency(summary.totalOutflow)} leave you **OVERSPENT by ${formatCurrency(Math.abs(currentLeftOver!))}**!`;
      } else {
        response += `With an estimated check of ${formatCurrency(summary.estimatedCheck)}, you'll have **${formatCurrency(summary.leftOver || 0)} left over** after paying these obligations!`;
      }
    } else {
      response += `Set an estimated check amount on your Payday card to calculate your remaining left-over cash!`;
    }

    return response;
  }

  // 2. SAVE MONEY ANALYSIS
  if (
    query.includes('save') ||
    query.includes('cut') ||
    query.includes('reduce') ||
    query.includes('spend less') ||
    query.includes('lower')
  ) {
    if (context.bills.length === 0) {
      return "To give you personalized savings advice, start by adding a few of your recurring monthly bills!";
    }

    let insights: string[] = [];

    if (context.topCategory) {
      insights.push(`Your highest spending category right now is **${context.topCategory.category}** at **${formatCurrency(context.topCategory.amount)}/month**.`);
    }

    if (context.subscriptionsList.length > 0) {
      const subNames = context.subscriptionsList.map(s => `${s.name} (${formatCurrency(s.amount)})`).join(', ');
      insights.push(`You currently have **${context.subscriptionsList.length} subscription/entertainment bill${context.subscriptionsList.length > 1 ? 's' : ''}** (${subNames}) totaling **${formatCurrency(context.subscriptionsTotal)}/month**. Trimming 1 or 2 could save you $15-$30 every single month!`);
    } else {
      insights.push("You don't have any subscription bills listed right now, which is a great start!");
    }

    const variableBills = context.bills.filter(b => b.type === 'variable');
    if (variableBills.length > 0) {
      const varNames = variableBills.map(v => `${v.name} (${formatCurrency(v.amount)})`).join(', ');
      insights.push(`You also have **${variableBills.length} variable bill${variableBills.length > 1 ? 's' : ''}** (${varNames}). Lowering usage on these (e.g., thermostat adjustments or meal planning) can immediately free up extra cash.`);
    }

    return `Here are a few personalized ways to save money based on your actual numbers:\n\n` + insights.join('\n\n') + `\n\nWould you like me to analyze your debt payoff strategy next?`;
  }

  // 3. DEBT PAYOFF STRATEGY / WHICH BILL TO PAY FIRST
  if (
    query.includes('debt') ||
    query.includes('pay off') ||
    query.includes('snowball') ||
    query.includes('avalanche') ||
    query.includes('card') ||
    query.includes('loan') ||
    query.includes('which bill should i pay first') ||
    query.includes('pay first')
  ) {
    if (context.debtBills.length === 0) {
      return "I checked your bill list and didn't see any bills marked as Debt or in the Debt & Credit category! You can edit any bill and check 'Mark as Debt' or set its category to 'Debt & Credit' with total balance and interest rates.";
    }

    // Snowball: sort by balance asc
    const snowballList = [...context.debtBills].sort((a, b) => (a.totalBalance || a.amount) - (b.totalBalance || b.amount));
    
    // Avalanche: sort by interest rate desc
    const avalancheList = [...context.debtBills].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

    const smallest = snowballList[0];
    const highestApr = avalancheList[0];

    const missingAprs = context.debtBills.filter(d => !d.interestRate);

    let text = `Here is your custom debt payoff strategy for your ${context.debtBills.length} debt obligations:\n\n`;

    text += `❄️ **Debt Snowball Method** (Smallest Balance First for Quick Wins):\n`;
    text += `Focus extra payments on **${smallest.name}** (${smallest.totalBalance ? `Balance: ${formatCurrency(smallest.totalBalance)}` : `Min: ${formatCurrency(smallest.amount)}/mo`}). Knocking this out first gives you quick mental momentum!\n\n`;

    text += `⚡ **Debt Avalanche Method** (Highest Interest First to Save Money):\n`;
    if (highestApr.interestRate) {
      text += `Target **${highestApr.name}** first because it carries the highest APR at **${highestApr.interestRate}%**! Paying this down saves you the most money in interest charges over time.\n\n`;
    } else {
      text += `Target **${highestApr.name}**! (Tip: Enter your APR % when editing your debt bills so I can calculate exact interest savings!)\n\n`;
    }

    if (context.nextPaydaySummary?.leftOver && context.nextPaydaySummary.leftOver > 0) {
      text += `💡 You currently have **${formatCurrency(context.nextPaydaySummary.leftOver)} left over** on your next check. Putting even an extra $50–$100 towards ${smallest.name} will speed up your payoff timeline significantly!`;
    }

    if (missingAprs.length > 0) {
      text += `\n\n*(Note: Add APR % to ${missingAprs.map(m => m.name).join(', ')} in the bill editor for exact interest comparison!)*`;
    }

    return text;
  }

  // 4. SPENDING ANALYSIS
  if (
    query.includes('analyze') ||
    query.includes('spending') ||
    query.includes('summary') ||
    query.includes('overview') ||
    query.includes('breakdown')
  ) {
    const totalMonthly = context.bills.reduce((sum, b) => sum + b.amount, 0);
    const splitBillsCount = context.bills.filter(b => b.isSplit).length;

    let response = `Here is your complete financial snapshot:\n\n`;
    response += `• **Total Active Monthly Bills**: ${formatCurrency(totalMonthly)} across ${context.bills.length} bills.\n`;
    if (context.topCategory) {
      response += `• **Top Category**: ${context.topCategory.category} (${formatCurrency(context.topCategory.amount)}/mo).\n`;
    }
    if (splitBillsCount > 0) {
      response += `• **Split Bills**: You have ${splitBillsCount} split bill${splitBillsCount > 1 ? 's' : ''}, keeping your shared expenses lower!\n`;
    }

    if (context.nextPaydaySummary) {
      response += `• **Next Check Status**: ${formatDate(context.nextPaydaySummary.payday.date, 'medium')} has ${formatCurrency(context.nextPaydaySummary.totalBills)} in bills due, leaving you **${formatCurrency(context.nextPaydaySummary.leftOver || 0)}** left over.`;
    }

    return response;
  }

  // 5. DEFAULT / FRIENDLY ADVISOR GREETING
  const nextCheckLeft = context.nextPaydaySummary?.leftOver;
  return `I'm Raven, your bill & budget advisor! Here's a quick look at your numbers right now:\n\n` +
    `• Next Payday: **${context.nextPaydaySummary ? formatDate(context.nextPaydaySummary.payday.date, 'medium') : 'Not scheduled'}**\n` +
    `• Left Over Balance: **${nextCheckLeft !== undefined && nextCheckLeft !== null ? formatCurrency(nextCheckLeft) : 'N/A'}**\n` +
    `• Total Active Bills: **${context.bills.length} bills** (${formatCurrency(context.bills.reduce((a, b) => a + b.amount, 0))}/mo)\n\n` +
    `Ask me anything like *"What's due on my next check?"*, *"How can I save money?"*, or *"Which debt should I pay first?"*!`;
}
