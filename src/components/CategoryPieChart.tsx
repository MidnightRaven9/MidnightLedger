import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AssignedBill, ExtraExpense } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryColors';

interface CategoryPieChartProps {
  assignedBills: AssignedBill[];
  extraExpenses?: ExtraExpense[];
  height?: number;
  showLegend?: boolean;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  assignedBills,
  extraExpenses = [],
  height = 260,
  showLegend = true,
}) => {
  const [isPieActive, setIsPieActive] = React.useState(false);

  // Aggregate bills & tracked expenses by category for current pay period
  const categoryDataMap: Record<string, number> = {};
  const categoryItemsMap: Record<string, { name: string; myShare: number; fullTotal?: number; isSplit?: boolean; type: 'bill' | 'expense' }[]> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = Number(item.effectiveAmount) || 0;
    const fullTotal = item.effectiveFullTotal ?? item.bill.fullTotal ?? item.bill.amount;

    categoryDataMap[cat] = Math.round(((categoryDataMap[cat] || 0) + myShare) * 100) / 100;
    totalPeriodAmount = Math.round((totalPeriodAmount + myShare) * 100) / 100;

    if (!categoryItemsMap[cat]) categoryItemsMap[cat] = [];
    categoryItemsMap[cat].push({
      name: item.bill.name,
      myShare,
      fullTotal,
      isSplit: !!item.bill.isSplit,
      type: 'bill',
    });
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = Number(exp.amount) || 0;

    categoryDataMap[cat] = Math.round(((categoryDataMap[cat] || 0) + amt) * 100) / 100;
    totalPeriodAmount = Math.round((totalPeriodAmount + amt) * 100) / 100;

    if (!categoryItemsMap[cat]) categoryItemsMap[cat] = [];
    categoryItemsMap[cat].push({
      name: exp.description,
      myShare: amt,
      isSplit: false,
      type: 'expense',
    });
  });

  const chartData = Object.entries(categoryDataMap)
    .map(([name, value]) => {
      const items = categoryItemsMap[name] || [];
      const billCount = items.filter(i => i.type === 'bill').length;
      const expCount = items.filter(i => i.type === 'expense').length;
      const typeStr = billCount > 0 && expCount > 0 ? 'Mixed' : billCount > 0 ? 'Bills' : 'Expenses';
      return {
        name,
        value,
        percentage: totalPeriodAmount > 0 ? ((value / totalPeriodAmount) * 100).toFixed(1) : '0',
        color: getCategoryColor(name),
        bills: items,
        typeStr
      };
    })
    .sort((a, b) => b.value - a.value);

  if ((assignedBills.length === 0 && extraExpenses.length === 0) || totalPeriodAmount === 0) {
    return (
      <div 
        style={{ height }} 
        className="flex flex-col items-center justify-center p-6 bg-[#121212] rounded-2xl border border-dashed border-[#2A2A2A] text-center text-xs text-white/50"
      >
        <p className="font-medium">No bills or tracked expenses for this pay period.</p>
        <p className="text-[11px] mt-1 text-white/40">Add bills or log expenses to see category allocation.</p>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl bg-[#111] border border-zinc-800 p-3 min-w-[160px] max-w-[220px] shadow-xl z-50">
        <div className="flex justify-between items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-white truncate">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color || payload[0].fill }}
            />
            {data.name}
          </span>
          <span className="text-[12px] font-bold text-white shrink-0">
            {formatCurrency(data.value)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1 truncate">
          {data.percentage}% of current check
        </p>
      </div>
    );
  };

  if (!showLegend) {
    return (
      <div className="w-full flex items-center justify-center min-w-0 max-w-full overflow-hidden my-1">
        <div className="w-full max-w-[280px] h-[220px] relative min-w-0 p-2">
          <ResponsiveContainer width="100%" height={220} className="min-w-0 max-w-full" style={{ outline: 'none' }}>
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                style={{ outline: 'none' }}
                onMouseEnter={() => setIsPieActive(true)}
                onMouseLeave={() => setIsPieActive(false)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" style={{ outline: 'none' }} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                position={{ y: 0 }}
                offset={15}
                wrapperStyle={{ zIndex: 50, outline: 'none', border: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center label inside Donut */}
          <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center transition-opacity duration-150 ${isPieActive ? 'opacity-0' : 'opacity-100'}`}>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">MY SHARE</span>
            <span className="text-[18px] font-bold text-white leading-tight">
              {formatCurrency(totalPeriodAmount)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-4 min-w-0 max-w-full overflow-hidden">
      <div className="w-full md:w-1/2 h-[240px] relative min-w-0 max-w-full p-2">
        <ResponsiveContainer width="100%" height={220} className="min-w-0 max-w-full" style={{ outline: 'none' }}>
          <PieChart style={{ outline: 'none' }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              style={{ outline: 'none' }}
              onMouseEnter={() => setIsPieActive(true)}
              onMouseLeave={() => setIsPieActive(false)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" style={{ outline: 'none' }} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              position={{ y: 0 }}
              offset={15}
              wrapperStyle={{ zIndex: 50, outline: 'none', border: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label inside Donut */}
        <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center transition-opacity duration-150 ${isPieActive ? 'opacity-0' : 'opacity-100'}`}>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">MY SHARE</span>
          <span className="text-[18px] font-bold text-white leading-tight">
            {formatCurrency(totalPeriodAmount)}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full md:w-1/2 space-y-2 max-h-64 overflow-y-auto pr-1 min-w-0 max-w-full">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex justify-between items-center gap-3 w-full min-w-0 px-4 py-3.5 rounded-xl bg-[#222222] border border-[#2a2a2a] text-[14px] min-h-[56px] mb-2"
            title={item.bills.map(b => b.isSplit ? `${b.name}: ${formatCurrency(b.myShare)} (Full: ${formatCurrency(b.fullTotal)})` : `${b.name}: ${formatCurrency(b.myShare)}`).join(', ')}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold text-[14px] text-white truncate">
                {item.name}
              </span>
            </div>

            <div className="text-right flex items-center gap-3 shrink-0">
              <span className="font-bold text-[14px] text-white">
                {formatCurrency(item.value)}
              </span>
              <span className="text-[13px] text-zinc-400 min-w-10 text-right font-mono">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
