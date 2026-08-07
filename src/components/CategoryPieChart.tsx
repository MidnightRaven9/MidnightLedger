import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AssignedBill, ExtraExpense } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryColors';

interface CategoryPieChartProps {
  assignedBills: AssignedBill[];
  extraExpenses?: ExtraExpense[];
  height?: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  assignedBills,
  extraExpenses = [],
  height = 260,
}) => {
  // Aggregate bills & tracked expenses by category for current pay period
  const categoryDataMap: Record<string, number> = {};
  const categoryItemsMap: Record<string, { name: string; myShare: number; fullTotal?: number; isSplit?: boolean }[]> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = item.effectiveAmount;
    const fullTotal = item.effectiveFullTotal ?? item.bill.fullTotal ?? item.bill.amount;

    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + myShare;
    totalPeriodAmount += myShare;

    if (!categoryItemsMap[cat]) categoryItemsMap[cat] = [];
    categoryItemsMap[cat].push({
      name: item.bill.name,
      myShare,
      fullTotal,
      isSplit: !!item.bill.isSplit,
    });
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = exp.amount;

    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + amt;
    totalPeriodAmount += amt;

    if (!categoryItemsMap[cat]) categoryItemsMap[cat] = [];
    categoryItemsMap[cat].push({
      name: exp.description,
      myShare: amt,
      isSplit: false,
    });
  });

  const chartData = Object.entries(categoryDataMap)
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalPeriodAmount > 0 ? ((value / totalPeriodAmount) * 100).toFixed(1) : '0',
      color: getCategoryColor(name),
      bills: categoryItemsMap[name] || [],
    }))
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
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#121212] text-white p-3.5 rounded-2xl border border-[#2A2A2A] shadow-2xl text-xs space-y-2 max-w-xs z-50">
          <div className="flex items-center gap-2 font-bold border-b border-[#2A2A2A] pb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.color }}
            />
            <span>{data.name}</span>
            <span className="ml-auto text-[#A78BFA] font-extrabold text-sm">
              {formatCurrency(data.value)}
            </span>
          </div>

          <div className="text-white/60 text-[11px]">
            {data.percentage}% of current check bills (My Share)
          </div>

          {data.bills.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#2A2A2A]">
              {data.bills.map((b: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px] text-white/80">
                  <span className="truncate max-w-[140px]">{b.name}:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(b.myShare)}
                    {b.isSplit && (
                      <span className="text-[10px] text-[#C084FC] ml-1">
                        (Full: {formatCurrency(b.fullTotal)})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-4">
      <div className="w-full md:w-1/2 h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label inside Donut */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">My Share</span>
          <span className="text-sm font-extrabold text-white">
            {formatCurrency(totalPeriodAmount)}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full md:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#1E1E1E]/50 border border-transparent hover:border-[#2A2A2A] hover:bg-[#1E1E1E] transition-colors group"
            title={item.bills.map(b => b.isSplit ? `${b.name}: ${formatCurrency(b.myShare)} (Full: ${formatCurrency(b.fullTotal)})` : `${b.name}: ${formatCurrency(b.myShare)}`).join(', ')}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-white/80">
                {item.name}
              </span>
            </div>

            <div className="text-right flex items-center gap-2">
              <span className="font-bold text-white">
                {formatCurrency(item.value)}
              </span>
              <span className="text-[10px] text-white/50 min-w-8 text-right font-mono">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
