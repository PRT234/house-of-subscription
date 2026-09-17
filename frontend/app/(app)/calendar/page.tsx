'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Subscription } from '@/components/subscriptions/SubscriptionCard';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getCategoryMeta } from '@/lib/constants';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CalendarPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<Subscription[]>('/api/subscriptions/');
        setSubscriptions(data.filter((s) => s.status === 'active'));
      } catch (err) {
        console.error('Failed to load subscriptions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  };

  // Build calendar matrix
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Map renewals by day of the month
  const renewalsByDay = useMemo(() => {
    const map: Record<number, Subscription[]> = {};
    subscriptions.forEach((sub) => {
      const renewalDate = new Date(sub.next_renewal_date);
      // If renewal falls in viewed year and month
      if (renewalDate.getFullYear() === year && renewalDate.getMonth() === month) {
        const day = renewalDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(sub);
      }
    });
    return map;
  }, [subscriptions, year, month]);

  const monthTotal = useMemo(() => {
    let total = 0;
    Object.values(renewalsByDay).forEach((subs) => {
      subs.forEach((s) => {
        total += Number(s.amount);
      });
    });
    return total;
  }, [renewalsByDay]);

  const selectedDayRenewals = useMemo(() => {
    if (!selectedDay) return [];
    if (selectedDay.getFullYear() === year && selectedDay.getMonth() === month) {
      return renewalsByDay[selectedDay.getDate()] || [];
    }
    return [];
  }, [selectedDay, year, month, renewalsByDay]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Renewal Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track exact renewal dates and payment milestones across the calendar month.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-200">
            Month Total:{' '}
            <span className="text-indigo-400 font-bold ml-1">
              {formatCurrency(monthTotal, 'INR')}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={setToday}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar View (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl glass-card border border-white/10 p-6 flex flex-col">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-xs font-bold uppercase tracking-wider text-slate-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Month Matrix */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {/* Empty prefix slots */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[75px] rounded-xl bg-white/[0.01] opacity-20" />
            ))}

            {/* Day slots */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day);
              const isToday =
                new Date().toDateString() === dateObj.toDateString();
              const isSelected =
                selectedDay && selectedDay.toDateString() === dateObj.toDateString();
              const renewals = renewalsByDay[day] || [];

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(dateObj)}
                  className={`min-h-[75px] p-2 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                      : isToday
                      ? 'border-indigo-500/40 bg-white/[0.03]'
                      : 'border-white/5 hover:border-white/20 bg-white/[0.015] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isSelected
                          ? 'text-indigo-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {renewals.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {renewals.length}
                      </span>
                    )}
                  </div>

                  {/* Indicators for renewals on this day */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {renewals.slice(0, 3).map((sub) => {
                      const cat = getCategoryMeta(sub.category);
                      return (
                        <span
                          key={sub.id}
                          title={`${sub.name} (${formatCurrency(sub.amount, sub.currency)})`}
                          className="w-2 h-2 rounded-full ring-1 ring-black/40"
                          style={{ backgroundColor: cat.color }}
                        />
                      );
                    })}
                    {renewals.length > 3 && (
                      <span className="text-[9px] text-slate-400 font-bold">
                        +{renewals.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Side Panel (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
          <div className="pb-4 border-b border-white/5 mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Selected Date
            </span>
            <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
              {selectedDay
                ? selectedDay.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Select a day'}
            </h3>
          </div>

          {selectedDayRenewals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-30" />
              <span>No renewals scheduled on this day</span>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {selectedDayRenewals.map((sub) => {
                const cat = getCategoryMeta(sub.category);
                return (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base border border-white/5 flex-shrink-0"
                        style={{ backgroundColor: cat.bgLight }}
                      >
                        {cat.emoji}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{sub.name}</h4>
                        <span className="text-[11px] text-slate-400">{cat.label}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-white">
                        {formatCurrency(sub.amount, sub.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {sub.billing_frequency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
