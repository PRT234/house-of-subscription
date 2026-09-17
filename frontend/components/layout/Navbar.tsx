'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  CreditCard,
  Calendar as CalendarIcon,
  BarChart3,
  UploadCloud,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/import', label: 'Import', icon: UploadCloud },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-surface-dark/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <span className="text-xl">🏠</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  House of Subscriptions
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Recurring Tracker
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm border border-white/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Side: User Profile & Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="flex items-center gap-2.5">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-8 h-8 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-semibold text-xs">
                      {user.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {user.display_name || user.email.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">
                      {user.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20 ml-2"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:bg-white/5 border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-slate-900/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3 animate-slide-up">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-semibold text-xs">
                  {user.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">
                    {user.display_name}
                  </span>
                  <span className="text-[11px] text-slate-400">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
