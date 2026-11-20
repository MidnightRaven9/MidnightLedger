import React, { useEffect, useState } from 'react';
import { X, Settings, Save, Check } from 'lucide-react';
import { ScheduleFrequency } from '../types';
import { usePayday } from '../context/PaydayContext';
import { toISODateString } from '../utils/dateUtils';
import { useEscapeToClose } from '../utils/useEscapeToClose';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEscapeToClose(isOpen, onClose);

  const { schedule, updateSchedule } = usePayday();

  const [frequency, setFrequency] = useState<ScheduleFrequency>(schedule.frequency);
  const [anchorDate, setAnchorDate] = useState(schedule.anchorDate || toISODateString(new Date()));
  const [firstDay, setFirstDay] = useState(schedule.firstDayOfMonth || 1);
  const [secondDay, setSecondDay] = useState(schedule.secondDayOfMonth || 15);
  const [monthlyDay, setMonthlyDay] = useState(schedule.monthlyDay || 15);

  // The modal stays mounted, so reload the draft each time it is opened.
  useEffect(() => {
    if (!isOpen) return;
    setFrequency(schedule.frequency);
    setAnchorDate(schedule.anchorDate || toISODateString(new Date()));
    setFirstDay(schedule.firstDayOfMonth || 1);
    setSecondDay(schedule.secondDayOfMonth || 15);
    setMonthlyDay(schedule.monthlyDay || 15);
  }, [isOpen, schedule]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchedule({
      frequency,
      anchorDate,
      firstDayOfMonth: firstDay,
      secondDayOfMonth: secondDay,
      monthlyDay,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)] flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Repeating Pay Schedule
              </h3>
              <p className="text-xs text-white/60">
                Automatically generate future payday dates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-2">
              Payday Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              
              <button
                type="button"
                onClick={() => setFrequency('biweekly')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  frequency === 'biweekly'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Bi-weekly</span>
                  {frequency === 'biweekly' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </div>
                <span className="text-[11px] text-white/50">Every 2 weeks (e.g., every other Friday)</span>
              </button>

              <button
                type="button"
                onClick={() => setFrequency('twice_monthly')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  frequency === 'twice_monthly'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Twice a Month</span>
                  {frequency === 'twice_monthly' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </div>
                <span className="text-[11px] text-white/50">1st & 15th (Semi-monthly)</span>
              </button>

              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  frequency === 'weekly'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Weekly</span>
                  {frequency === 'weekly' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </div>
                <span className="text-[11px] text-white/50">Every week (52 checks/yr)</span>
              </button>

              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  frequency === 'monthly'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Monthly</span>
                  {frequency === 'monthly' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </div>
                <span className="text-[11px] text-white/50">Once a month on a specific day</span>
              </button>

            </div>
          </div>

          {frequency === 'biweekly' || frequency === 'weekly' ? (
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Anchor / Start Payday Date
              </label>
              <input
                type="date"
                required
                value={anchorDate}
                onChange={e => setAnchorDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <p className="text-[11px] text-white/50 mt-1">
                Select one known upcoming payday to align future occurrences.
              </p>
            </div>
          ) : frequency === 'twice_monthly' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  First Payday of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={firstDay}
                  onChange={e => setFirstDay(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Second Payday of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={secondDay}
                  onChange={e => setSecondDay(parseInt(e.target.value) || 15)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Monthly Payday (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={monthlyDay}
                onChange={e => setMonthlyDay(parseInt(e.target.value) || 15)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white font-semibold text-xs shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              Apply Schedule
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
