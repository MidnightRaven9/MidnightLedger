import React, { useState } from 'react';
import { 
  BarChart2, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Filter, 
  DollarSign, 
  Calendar, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { usePayday } from '../context/PaydayContext';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryColors';
import { BillCategory } from '../types';

const CATEGORIES_LIST: BillCategory[] = [
  'Housing',
  'Utilities',
  'Car',
  'Insurance',
  'Phone & Internet',
  'Subscriptions',
  'Food & Household',
  'Debt & Credit',
  'Savings',
  'Other',
];

// Custom dot renderers for high-contrast negative alerts
const CustomDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined) return null;
  const isNegative = value < 0;
  const dotColor = isNegative ? '#FF4D6A' : '#FFFFFF';
  const strokeColor = isNegative ? '#FF4D6A' : '#7C3AED';
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={5} 
      fill={dotColor} 
      stroke={strokeColor} 
      strokeWidth={2} 
    />
  );
};

const CustomActiveDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined) return null;
  const isNegative = value < 0;
  const dotColor = isNegative ? '#FF4D6A' : '#FFFFFF';
  const strokeColor = isNegative ? '#FF4D6A' : '#7C3AED';
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={7} 
      fill={dotColor} 
      stroke={strokeColor} 
      strokeWidth={3} 
    />
  );
};

export const ReportsView: React.FC = () => {
  const { summaries, bills, nextPaydaySummary } = usePayday();

  // Category Filter State for reports breakdown
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Payday selector for Chart A
  const [selectedPaydayDate, setSelectedPaydayDate] = useState<string>(
    nextPaydaySummary?.payday.date || (summaries[0]?.payday.date || '')
  );

  // Active payday summary for Chart A
  const activeSummary = summaries.find(s => s.payday.date === selectedPaydayDate) || nextPaydaySummary || summaries[0];

  // Filter bills for Chart A if category filter is active
  const isSelectedCategoryMatch = (cat?: string) => {
    if (selectedCategory === 'ALL') return true;
    if (cat === selectedCategory) return true;
    if (selectedCategory === 'Subscriptions' && cat === 'Streaming Subscriptions') return true;
    if (selectedCategory === 'Streaming Subscriptions' && cat === 'Subscriptions') return true;
    return false;
  };

  const filteredAssignedBills = activeSummary
    ? activeSummary.assignedBills.filter(b => isSelectedCategoryMatch(b.bill.category))
    : [];

  // Active period categories list for breakdown display below Chart A
  const activePeriodCategoryMap: Record<string, { amount: number; fullAmount: number; count: number }> = {};
  let activePeriodTotal = 0;
  
  if (activeSummary) {
    activeSummary.assignedBills
      .filter(b => isSelectedCategoryMatch(b.bill.category))
      .forEach(item => {
        const rawCat = item.bill.category || 'Other';
        const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
        const myShare = item.effectiveAmount;
        const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
        activePeriodCategoryMap[cat] = activePeriodCategoryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
        activePeriodCategoryMap[cat].amount += myShare;
        activePeriodCategoryMap[cat].fullAmount += fullBillAmt;
        activePeriodCategoryMap[cat].count += 1;
        activePeriodTotal += myShare;
      });

    activeSummary.extraExpenses
      .filter(e => isSelectedCategoryMatch(e.category))
      .forEach(exp => {
        const rawCat = exp.category || 'Other';
        const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
        const amt = exp.amount;
        activePeriodCategoryMap[cat] = activePeriodCategoryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
        activePeriodCategoryMap[cat].amount += amt;
        activePeriodCategoryMap[cat].fullAmount += amt;
        activePeriodCategoryMap[cat].count += 1;
        activePeriodTotal += amt;
      });
  }

  const activePeriodCategoriesList = Object.entries(activePeriodCategoryMap).map(([name, data]) => {
    const percentage = activePeriodTotal > 0 ? Math.round((data.amount / activePeriodTotal) * 100) : 0;
    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      percentage,
      color: getCategoryColor(name),
    };
  }).sort((a, b) => b.amount - a.amount);

  // Data for Chart B: Income vs Expenses over pay periods
  const incomeVsExpensesData = summaries.map(s => {
    const label = formatDate(s.payday.date, 'short');
    const income = s.estimatedCheck || 0;

    // Filter expenses if category is selected
    const filteredBillsTotal = s.assignedBills
      .filter(b => selectedCategory === 'ALL' || b.bill.category === selectedCategory)
      .reduce((sum, b) => sum + b.effectiveAmount, 0);

    const filteredExtraTotal = s.extraExpenses
      .filter(e => selectedCategory === 'ALL' || e.category === selectedCategory)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = filteredBillsTotal + filteredExtraTotal;

    return {
      date: s.payday.date,
      label,
      Income: income,
      Expenses: totalExpenses,
      LeftOver: income - totalExpenses,
    };
  });

  // Data for Chart C: Future Projection of Money Left Over
  let runningCumulativeBuffer = 0;
  const projectionData = summaries.map((s, index) => {
    const shortDate = formatDate(s.payday.date, 'short');
    const income = s.estimatedCheck || 0;
    const outflow = s.totalOutflow;
    const netThisCheck = income - outflow;
    runningCumulativeBuffer += netThisCheck;

    return {
      date: s.payday.date,
      shortLabel: shortDate,
      fullLabel: `Check #${index + 1} (${shortDate})`,
      'Income': income,
      'Total Bills & Outflow': outflow,
      'Net Left Over': netThisCheck,
      'Cumulative Buffer': runningCumulativeBuffer,
    };
  });

  // Custom Recharts Tooltip for Income vs Expenses
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111111] text-white p-3 rounded-2xl border border-zinc-800 shadow-xl text-xs space-y-1.5 z-50 pointer-events-none max-w-[220px]">
          <div className="font-bold border-b border-zinc-800 pb-1 text-zinc-400">
            Paycheck: {label}
          </div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <span style={{ color: item.color }} className="font-medium truncate">
                {item.name}:
              </span>
              <span className="font-bold shrink-0">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Line Chart
  const LineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const netVal = data['Net Left Over'];
      const cumVal = data['Cumulative Buffer'];
      
      const netColor = netVal < 0 ? '#FF4D6A' : '#A78BFA';
      const cumColor = '#00FF94';
      
      const formattedNet = netVal < 0 ? `-$${Math.abs(netVal)}` : `$${netVal}`;
      const formattedCum = cumVal < 0 ? `-$${Math.abs(cumVal)}` : `$${cumVal}`;

      return (
        <div className="bg-[#111111] text-white p-3 rounded-2xl border border-zinc-800 shadow-2xl text-xs space-y-1.5 z-50 pointer-events-none max-w-[220px]">
          <div className="font-bold pb-1 text-white border-b border-zinc-800">
            {data.fullLabel || data.shortLabel}
          </div>
          <div className="space-y-1 font-sans">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400 font-medium truncate">Net Left Over:</span>
              <span style={{ color: netColor }} className="font-bold shrink-0">
                {formattedNet}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400 font-medium truncate">Cumulative:</span>
              <span style={{ color: cumColor }} className="font-bold shrink-0">
                {formattedCum}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white pb-[100px] space-y-4">
      
      {/* 1. Header Section */}
      <div className="w-full min-w-0 max-w-full px-4 pt-4">
        <h1 className="text-[28px] font-black text-white leading-none tracking-tight">Analytics</h1>
        <p className="text-[13px] text-zinc-400 mt-2 leading-[1.4] max-w-[320px]">
          Visual breakdown of your category allocations, income vs expense balance, and projected net left over.
        </p>
      </div>

      {/* Filter Row */}
      <div className="mx-3 p-2.5 rounded-full bg-[#181818] border border-zinc-800/50 flex items-center gap-2 w-auto min-w-0">
        <span className="shrink-0 text-[11px] font-bold text-zinc-500 pl-2">▽ Filter:</span>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="flex-1 min-w-0 h-8 rounded-full bg-[#252525] px-3 text-[13px] font-bold text-white truncate appearance-none focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES_LIST.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* CHART A SECTION */}
      <div className="mx-3 rounded-[24px] border border-zinc-800/50 bg-[#121212] p-4 sm:p-6 space-y-4 w-auto min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <PieChartIcon className="w-5 h-5 text-[#A78BFA]" />
              Chart A — Category Allocation
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Interactive percentage & dollar breakdown of bills for selected check.
            </p>
          </div>

          {/* Payday Selector dropdown */}
          <div className="flex items-center gap-2 w-full min-w-0 mt-2 sm:mt-0">
            <span className="shrink-0 text-[13px] text-zinc-500">Check:</span>
            <select
              value={selectedPaydayDate}
              onChange={e => setSelectedPaydayDate(e.target.value)}
              className="flex-1 min-w-0 h-9 rounded-full bg-[#1e1e1e] border border-zinc-800 px-3 text-[13px] font-bold text-white truncate appearance-none focus:outline-none cursor-pointer"
            >
              {summaries.map(s => (
                <option key={s.payday.date} value={s.payday.date} className="bg-[#121212]">
                  {formatDate(s.payday.date, 'short')} ({formatCurrency(s.totalBills)} due)
                </option>
              ))}
            </select>
          </div>
        </div>

        <CategoryPieChart
          assignedBills={filteredAssignedBills}
          extraExpenses={activeSummary ? activeSummary.extraExpenses.filter(e => selectedCategory === 'ALL' || e.category === selectedCategory) : []}
          height={260}
        />

        <div className="mt-4 pt-4 border-t border-zinc-800/60">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">
            Category Breakdown List (Selected Payday)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activePeriodCategoriesList.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-1 col-span-2">No spending in this period.</p>
            ) : (
              activePeriodCategoriesList.map(cat => (
                <div key={cat.name} className="flex justify-between items-center gap-2 w-full min-w-0 p-3 rounded-2xl bg-[#1a1a1a] border border-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">{cat.name}</span>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {cat.count} item{cat.count !== 1 ? 's' : ''} ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col shrink-0">
                    <span className="text-sm font-extrabold text-white">{formatCurrency(cat.amount)}</span>
                    {cat.fullAmount > cat.amount && (
                      <span className="text-[10px] text-zinc-500 font-semibold truncate">(Full {formatCurrency(cat.fullAmount)})</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CHART B SECTION */}
      <div className="mx-3 rounded-[24px] border border-zinc-800/50 bg-[#121212] p-4 sm:p-6 space-y-3 w-auto min-w-0 overflow-hidden">
        <div className="border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-base">
            <BarChart2 className="w-5 h-5 text-[#A78BFA]" />
            Chart B — Income vs Expenses
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Compare expected paycheck income against total obligations across upcoming pay periods.
          </p>
        </div>

        {/* Custom Legend */}
        <div className="flex gap-4 justify-center items-center py-1 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 bg-[#7C3AED] rounded-xs shrink-0" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 bg-[#C084FC] rounded-xs shrink-0" /> Bills
          </span>
        </div>

        <div className="w-full min-w-0 h-[260px] bg-[#0a0a0a] rounded-2xl p-2 overflow-hidden border-none outline-none">
          <ResponsiveContainer width="100%" height={250} style={{ outline: 'none' }}>
            <BarChart
              data={incomeVsExpensesData}
              margin={{ top: 10, right: 8, left: -10, bottom: 20 }}
              style={{ outline: 'none' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" opacity={0.6} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#2A2A2A' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={35}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="Income" fill="#7C3AED" barSize={12} radius={[4, 4, 0, 0]} name="Expected Check Income" />
              <Bar dataKey="Expenses" fill="#C084FC" barSize={12} radius={[4, 4, 0, 0]} name="Total Bills & Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART C SECTION */}
      <div className="mx-3 rounded-[24px] border border-zinc-800/50 bg-[#121212] p-4 sm:p-6 space-y-3 w-auto min-w-0 overflow-hidden">
        <div className="border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-base">
            <TrendingUp className="w-5 h-5 text-[#C084FC]" />
            Chart C — Future Net Left Over
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Projection of remaining net funds and cumulative savings buffer across future paydays.
          </p>
        </div>

        {/* Custom Legend Overlay */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold select-none py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-dashed border-[#00FF94] bg-transparent shrink-0" />
            <span className="text-zinc-300 text-[11px]">Cumulative Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#7C3AED] shrink-0" />
            <span className="text-zinc-300 text-[11px]">Net Left Over</span>
          </div>
        </div>

        <div className="w-full min-w-0 h-[260px] bg-[#0a0a0a] rounded-2xl p-2 overflow-hidden border-none outline-none relative">
          <ResponsiveContainer width="100%" height={250} style={{ outline: 'none' }}>
            <LineChart
              data={projectionData}
              margin={{ top: 10, right: 8, left: -10, bottom: 20 }}
              style={{ outline: 'none' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" opacity={0.25} />
              <XAxis 
                dataKey="shortLabel" 
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#2A2A2A' }}
                interval={1}
                angle={-25}
                textAnchor="end"
                height={35}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickFormatter={(val) => val < 0 ? `-$${Math.abs(val)}` : `$${val}`}
              />
              <Tooltip content={<LineTooltip />} offset={15} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={1} opacity={0.4} />
              <Line 
                type="monotone" 
                dataKey="Net Left Over" 
                stroke="#7C3AED" 
                strokeWidth={3}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                name="Net Left Over Per Check"
              />
              <Line 
                type="monotone" 
                dataKey="Cumulative Buffer" 
                stroke="#00FF94" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#00FF94', stroke: '#00FF94' }}
                name="Cumulative Buffer Growth"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
