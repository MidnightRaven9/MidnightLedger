import React, { useState } from 'react';
import {
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp
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
  const strokeColor = isNegative ? '#FF4D6A' : 'var(--accent)';
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
  const strokeColor = isNegative ? '#FF4D6A' : 'var(--accent)';
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
  const { summaries, nextPaydaySummary, customBillCategories, customExpenseCategories } = usePayday();

  const allCategories = Array.from(
    new Set([
      ...CATEGORIES_LIST,
      ...(customBillCategories || []).map(c => c.name),
      ...(customExpenseCategories || []).map(c => c.name),
    ])
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaydayDate, setSelectedPaydayDate] = useState<string>(
    nextPaydaySummary?.payday.date || (summaries[0]?.payday.date || '')
  );

  const activeSummary = summaries.find(s => s.payday.date === selectedPaydayDate) || nextPaydaySummary || summaries[0];

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

  const activePeriodCategoryMap: Record<string, { amount: number; fullAmount: number; count: number }> = {};
  let activePeriodTotal = 0;
  
  if (activeSummary) {
    activeSummary.assignedBills
      .filter(b => isSelectedCategoryMatch(b.bill.category))
      .forEach(item => {
        const rawCat = item.bill.category || 'Other';
        const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
        const myShare = Number(item.effectiveAmount) || 0;
        const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
        activePeriodCategoryMap[cat] = activePeriodCategoryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
        activePeriodCategoryMap[cat].amount = Math.round((activePeriodCategoryMap[cat].amount + myShare) * 100) / 100;
        activePeriodCategoryMap[cat].fullAmount = Math.round((activePeriodCategoryMap[cat].fullAmount + fullBillAmt) * 100) / 100;
        activePeriodCategoryMap[cat].count += 1;
        activePeriodTotal = Math.round((activePeriodTotal + myShare) * 100) / 100;
      });

    activeSummary.extraExpenses
      .filter(e => isSelectedCategoryMatch(e.category))
      .forEach(exp => {
        const rawCat = exp.category || 'Other';
        const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
        const amt = Number(exp.amount) || 0;
        activePeriodCategoryMap[cat] = activePeriodCategoryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
        activePeriodCategoryMap[cat].amount = Math.round((activePeriodCategoryMap[cat].amount + amt) * 100) / 100;
        activePeriodCategoryMap[cat].fullAmount = Math.round((activePeriodCategoryMap[cat].fullAmount + amt) * 100) / 100;
        activePeriodCategoryMap[cat].count += 1;
        activePeriodTotal = Math.round((activePeriodTotal + amt) * 100) / 100;
      });
  }

  const activePeriodCategoriesList = Object.entries(activePeriodCategoryMap).map(([name, data]) => {
    const itemPctInt = activePeriodTotal > 0 ? Math.round((data.amount / activePeriodTotal) * 100) : 0;
    const itemPctDec = activePeriodTotal > 0 ? ((data.amount / activePeriodTotal) * 100).toFixed(1) : '0';
    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      itemPctInt,
      itemPctDec,
      color: getCategoryColor(name),
    };
  }).sort((a, b) => b.amount - a.amount);

  const incomeVsExpensesData = summaries.map(s => {
    const label = formatDate(s.payday.date, 'short');
    const income = s.estimatedCheck || 0;

    const filteredBillsTotal = s.assignedBills
      .filter(b => isSelectedCategoryMatch(b.bill.category))
      .reduce((sum, b) => sum + b.effectiveAmount, 0);

    const filteredExtraTotal = s.extraExpenses
      .filter(e => isSelectedCategoryMatch(e.category))
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

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--surface-2)] text-white p-3 rounded-2xl border border-zinc-800 shadow-xl text-xs space-y-1.5 z-50 pointer-events-none max-w-[220px]">
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

  const LineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const netVal = Number(data['Net Left Over'] || 0);
      const cumVal = Number(data['Cumulative Buffer'] || 0);
      
      const netColor = netVal < 0 ? '#FF4D6A' : 'var(--accent)';
      const cumColor = '#00FF94';
      
      const formatVal = (v: number) => {
        const isNeg = v < 0;
        const absVal = Math.abs(v).toFixed(2);
        return isNeg ? `-$${absVal}` : `$${absVal}`;
      };

      return (
        <div className="bg-[var(--surface-2)] text-white p-3 rounded-2xl border border-zinc-800 shadow-2xl text-xs space-y-1.5 z-50 pointer-events-none max-w-[220px]">
          <div className="font-bold pb-1 text-white border-b border-zinc-800">
            {data.fullLabel || data.shortLabel}
          </div>
          <div className="space-y-1 font-sans">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400 font-medium truncate">Net Left Over:</span>
              <span style={{ color: netColor }} className="font-bold shrink-0">
                {formatVal(netVal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400 font-medium truncate">Cumulative:</span>
              <span style={{ color: cumColor }} className="font-bold shrink-0">
                {formatVal(cumVal)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-[600px] mx-auto overflow-x-hidden min-h-screen bg-[var(--bg)] text-white p-4 pb-[100px]">
      
      <div className="rounded-[20px] bg-[#151515] border border-[var(--border)] p-6 flex flex-col gap-4 mb-4">
        <div className="flex gap-4 items-start">
          <div style={{ width: '52px', height: '52px', background: 'var(--accent-soft)', borderRadius: '16px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="M7 16V8"></path>
              <path d="M12 16V4"></path>
              <path d="M17 16v-6"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-[32px] font-extrabold leading-[1.1] text-white">Analytics</h1>
            <p className="text-[15px] text-[var(--muted)] mt-2 leading-[1.4]">
              Visual breakdown of your category allocations, income vs expense balance, and projected net left over.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-[16px] bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <span className="text-[12px] text-[var(--accent)]">▽</span>
          <span className="text-[13px] text-[var(--muted)] font-medium">Filter:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 sm:w-[200px] h-[40px] rounded-full bg-[var(--border)] border border-[#333333] px-4 text-[14px] font-semibold text-white cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat} className="bg-[var(--surface-2)]">
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[13px] text-[var(--faint)] font-medium whitespace-nowrap">
          Check: {activeSummary ? formatDate(activeSummary.payday.date, 'short') : 'Current'}
        </div>
      </div>

      <div className="p-5 rounded-[20px] bg-[var(--surface-2)] border border-[var(--border)] mb-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <h2 className="text-[18px] font-bold text-white leading-[1.2] flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[var(--accent)]" />
              Chart A — Category Allocation
            </h2>
            <p className="text-[14px] text-[var(--muted)] mt-1 leading-[1.4]">
              Interactive percentage & dollar breakdown of bills for selected check.
            </p>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-[13px] text-[var(--muted)] font-medium">Check:</span>
            <select
              value={selectedPaydayDate}
              onChange={e => setSelectedPaydayDate(e.target.value)}
              className="flex-1 h-[38px] rounded-full bg-[var(--border)] border border-[#333] px-3 text-[13px] font-semibold text-white truncate focus:outline-none cursor-pointer"
            >
              {summaries.map(s => (
                <option key={s.payday.date} value={s.payday.date} className="bg-[var(--surface-2)]">
                  {formatDate(s.payday.date, 'short')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CategoryPieChart
          assignedBills={filteredAssignedBills}
          extraExpenses={activeSummary ? activeSummary.extraExpenses.filter(e => isSelectedCategoryMatch(e.category)) : []}
          height={220}
          showLegend={false}
        />

        <div className="pt-2 border-t border-[var(--border)]">
          <div style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--faint)', margin: '14px 0 10px', fontWeight: 700, textTransform: 'uppercase' }}>
            CATEGORY BREAKDOWN ( {activeSummary ? formatDate(activeSummary.payday.date, 'short') : ''} )
          </div>
          <div className="space-y-2">
            {activePeriodCategoriesList.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)] italic py-2">No spending in this period.</p>
            ) : (
              activePeriodCategoriesList.map(cat => (
                <div
                  key={cat.name}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--surface-2)', borderRadius: '14px', marginBottom: '8px', border: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '14px' }} className="break-words leading-snug">{cat.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {cat.count} item{cat.count > 1 ? 's' : ''} ({cat.itemPctInt}%)
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '16px' }}>{formatCurrency(cat.amount)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{cat.itemPctDec}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-5 rounded-[20px] bg-[var(--surface-2)] border border-[var(--border)] mb-4 flex flex-col gap-4">
        <div className="pb-2 border-b border-[var(--border)]">
          <h2 className="text-[18px] font-bold text-white leading-[1.2] flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[var(--accent)]" />
            Chart B — Income vs Expenses
          </h2>
          <p className="text-[14px] text-[var(--muted)] mt-1 leading-[1.4]">
            Compare expected paycheck income against total obligations across upcoming pay periods.
          </p>
        </div>

        <div className="flex gap-4 justify-center items-center py-1 text-[12px] font-semibold">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 bg-[var(--accent)] rounded-xs shrink-0" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-3 h-3 bg-[#fbbf24] rounded-xs shrink-0" /> Bills
          </span>
        </div>

        <div className="w-full bg-[var(--surface-2)] rounded-[16px] p-3 overflow-x-auto">
          <div style={{ width: '100%', minWidth: Math.max(320, incomeVsExpensesData.length * 72), height: 240 }}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <BarChart
                data={incomeVsExpensesData}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                barGap={6}
                barCategoryGap="25%"
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  interval={0}
                  height={28}
                />
                <YAxis 
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={(val) => `$${val}`}
                  width={52}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="Income" fill="var(--accent)" barSize={16} radius={[4, 4, 0, 0]} name="Expected Check Income" />
                <Bar dataKey="Expenses" fill="#fbbf24" barSize={16} radius={[4, 4, 0, 0]} name="Total Bills & Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {incomeVsExpensesData.length > 5 && (
          <p className="text-[11px] text-[var(--faint)] -mt-2">Swipe sideways to see every pay period</p>
        )}
      </div>

      <div className="p-5 rounded-[20px] bg-[var(--surface-2)] border border-[var(--border)] mb-4 flex flex-col gap-4">
        <div className="pb-2 border-b border-[var(--border)]">
          <h2 className="text-[18px] font-bold text-white leading-[1.2] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
            Chart C — Future Net Left Over
          </h2>
          <p className="text-[14px] text-[var(--muted)] mt-1 leading-[1.4]">
            Projection of remaining net funds and cumulative savings buffer across future paydays.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold select-none py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-dashed border-[#38bdf8] bg-transparent shrink-0" />
            <span className="text-zinc-300 text-[12px]">Cumulative Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[var(--accent)] shrink-0" />
            <span className="text-zinc-300 text-[12px]">Net Left Over</span>
          </div>
        </div>

        <div className="w-full bg-[var(--surface-2)] rounded-[16px] p-3 overflow-x-auto">
          <div style={{ width: '100%', minWidth: Math.max(320, projectionData.length * 72), height: 240 }}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <LineChart
                data={projectionData}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.25} />
                <XAxis 
                  dataKey="shortLabel" 
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  interval={0}
                  height={28}
                />
                <YAxis 
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={(val) => val < 0 ? `-$${Math.abs(val)}` : `$${val}`}
                  width={52}
                />
                <Tooltip content={<LineTooltip />} offset={15} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <ReferenceLine y={0} stroke="#a1a1aa" strokeWidth={1} opacity={0.5} />
                <Line 
                  type="monotone" 
                  dataKey="Net Left Over" 
                  stroke="var(--accent)" 
                  strokeWidth={3}
                  dot={<CustomDot />}
                  activeDot={<CustomActiveDot />}
                  name="Net Left Over Per Check"
                />
                <Line 
                  type="monotone" 
                  dataKey="Cumulative Buffer" 
                  stroke="#38bdf8" 
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={{ r: 5, fill: '#38bdf8', stroke: '#38bdf8' }}
                  name="Cumulative Buffer Growth"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {projectionData.length > 5 && (
          <p className="text-[11px] text-[var(--faint)] -mt-2">Swipe sideways to see every pay period</p>
        )}
      </div>

    </div>
  );
};
