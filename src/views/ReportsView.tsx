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
  const filteredAssignedBills = activeSummary
    ? activeSummary.assignedBills.filter(b => selectedCategory === 'ALL' || b.bill.category === selectedCategory)
    : [];

  // Active period categories list for breakdown display below Chart A
  const activePeriodCategoryMap: Record<string, { amount: number; fullAmount: number; count: number }> = {};
  let activePeriodTotal = 0;
  
  if (activeSummary) {
    activeSummary.assignedBills
      .filter(b => selectedCategory === 'ALL' || b.bill.category === selectedCategory)
      .forEach(item => {
        const cat = item.bill.category || 'Other';
        const myShare = item.effectiveAmount;
        const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
        activePeriodCategoryMap[cat] = activePeriodCategoryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
        activePeriodCategoryMap[cat].amount += myShare;
        activePeriodCategoryMap[cat].fullAmount += fullBillAmt;
        activePeriodCategoryMap[cat].count += 1;
        activePeriodTotal += myShare;
      });

    activeSummary.extraExpenses
      .filter(e => selectedCategory === 'ALL' || e.category === selectedCategory)
      .forEach(exp => {
        const cat = exp.category || 'Other';
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
    const label = formatDate(s.payday.date, 'short');
    const income = s.estimatedCheck || 0;
    const outflow = s.totalOutflow;
    const netThisCheck = income - outflow;
    runningCumulativeBuffer += netThisCheck;

    return {
      date: s.payday.date,
      label: `Check #${index + 1} (${label})`,
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
        <div className="bg-[#121212] text-white p-3 rounded-xl border border-[#2A2A2A] shadow-xl text-xs space-y-1.5 z-50">
          <div className="font-bold border-b border-[#2A2A2A] pb-1 text-white/70">
            Paycheck: {label}
          </div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span style={{ color: item.color }} className="font-medium">
                {item.name}:
              </span>
              <span className="font-bold">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Line Chart
  const LineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const netLeftOverObj = payload.find((p: any) => p.dataKey === 'Net Left Over');
      const cumulativeBufferObj = payload.find((p: any) => p.dataKey === 'Cumulative Buffer');
      
      const netVal = netLeftOverObj ? netLeftOverObj.value : 0;
      const cumVal = cumulativeBufferObj ? cumulativeBufferObj.value : 0;
      
      const netColor = netVal < 0 ? '#FF4D6A' : '#A78BFA';
      const cumColor = '#00FF94';
      
      const formattedNet = netVal < 0 ? `-$${Math.abs(netVal)}` : `$${netVal}`;
      const formattedCum = cumVal < 0 ? `-$${Math.abs(cumVal)}` : `$${cumVal}`;

      return (
        <div className="relative bg-[#0F0F15] text-white p-3.5 rounded-xl border border-[#7C3AED] shadow-2xl text-xs space-y-1.5 z-50">
          <div className="font-black pb-1 text-white border-b border-[#2A2A2A]">
            {label}
          </div>
          <div className="space-y-1 font-sans">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/70 font-medium">Net Left Over:</span>
              <span style={{ color: netColor }} className="font-bold">
                {formattedNet}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/70 font-medium">Cumulative:</span>
              <span style={{ color: cumColor }} className="font-bold">
                {formattedCum}
              </span>
            </div>
          </div>
          {/* Small arrow pointing down to data point */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-[#0F0F15] border-r border-b border-[#7C3AED] rotate-45" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white p-3 sm:p-6 pb-28 space-y-5">
      
      {/* 1. Page Hero Card */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[#121212] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <BarChart2 className="w-7 h-7 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-[30px] leading-[1.1] font-black tracking-tight text-white">
              Budget Analytics
            </h1>
            <p className="text-[15px] leading-6 text-zinc-400 mt-3 max-w-[90%]">
              Visual breakdown of your category allocations, income vs expense balance, and projected net left over.
            </p>
          </div>
        </div>

        {/* Category Filter inside hero */}
        <div className="flex items-center gap-2 bg-[#1E1E1E] p-2 rounded-2xl border border-zinc-800">
          <Filter className="w-4 h-4 text-[#A78BFA]" />
          <span className="text-xs font-semibold text-white/70">Category Filter:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES_LIST.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CHART A SECTION */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2A2A] pb-4">
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <PieChartIcon className="w-5 h-5 text-[#A78BFA]" />
              Chart A — Category Allocation
            </div>
            <p className="text-xs text-white/60">
              Interactive percentage & dollar breakdown of bills for selected check.
            </p>
          </div>

          {/* Payday Selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Check:</span>
            <select
              value={selectedPaydayDate}
              onChange={e => setSelectedPaydayDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-xs font-semibold focus:outline-none focus:border-[#7C3AED]"
            >
              {summaries.map(s => (
                <option key={s.payday.date} value={s.payday.date} className="bg-[#121212]">
                  {formatDate(s.payday.date, 'medium')} ({formatCurrency(s.totalBills)} due)
                </option>
              ))}
            </select>
          </div>
        </div>

        <CategoryPieChart
          assignedBills={filteredAssignedBills}
          extraExpenses={activeSummary ? activeSummary.extraExpenses.filter(e => selectedCategory === 'ALL' || e.category === selectedCategory) : []}
          height={280}
        />

        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-3">
            Category Breakdown List (Selected Payday)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activePeriodCategoriesList.length === 0 ? (
              <p className="text-xs text-white/50 italic py-1 col-span-2">No spending in this period.</p>
            ) : (
              activePeriodCategoriesList.map(cat => (
                <div key={cat.name} className="p-3 rounded-xl bg-[#1E1E1E]/60 border border-[#2A2A2A]/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <div>
                      <span className="text-xs font-bold text-white block">{cat.name}</span>
                      <span className="text-[10px] text-white/50 block">
                        {cat.count} item{cat.count !== 1 ? 's' : ''} ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-sm font-extrabold text-white">{formatCurrency(cat.amount)}</span>
                    {cat.fullAmount > cat.amount && (
                      <span className="text-[10px] text-white/40 font-semibold">(Full {formatCurrency(cat.fullAmount)})</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CHART B SECTION */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 space-y-4">
        <div className="border-b border-[#2A2A2A] pb-4">
          <div className="flex items-center gap-2 text-white font-extrabold text-base">
            <BarChart2 className="w-5 h-5 text-[#A78BFA]" />
            Chart B — Income vs Expenses
          </div>
          <p className="text-xs text-white/60">
            Compare expected paycheck income against total obligations across upcoming pay periods.
          </p>
        </div>

        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={incomeVsExpensesData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" opacity={0.6} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                axisLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis 
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<BarTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}
              />
              <Bar dataKey="Income" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Expected Check Income" />
              <Bar dataKey="Expenses" fill="#C084FC" radius={[6, 6, 0, 0]} name="Total Bills & Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART C SECTION */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 space-y-4">
        <div className="border-b border-[#2A2A2A] pb-4">
          <div className="flex items-center gap-2 text-white font-extrabold text-base">
            <TrendingUp className="w-5 h-5 text-[#C084FC]" />
            Chart C — Future Net Left Over
          </div>
          <p className="text-xs text-white/60">
            Projection of remaining net funds and cumulative savings buffer across future paydays.
          </p>
        </div>

        <div className="w-full h-80 pt-2 relative">
          {/* Legend Overlay at top left inside chart area */}
          <div className="absolute left-16 top-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold select-none z-10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-dashed border-[#00FF94] bg-transparent shrink-0" />
              <span className="text-white text-[12px]">Cumulative Buffer Growth</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#7C3AED] shrink-0" />
              <span className="text-white text-[12px]">Net Left Over Per Check</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 40, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" opacity={0.25} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                axisLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis 
                tick={{ fill: '#FFFFFF', fontSize: 12 }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickFormatter={(val) => val < 0 ? `-$${Math.abs(val)}` : `$${val}`}
              />
              <Tooltip content={<LineTooltip />} offset={20} />
              <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={1} />
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
