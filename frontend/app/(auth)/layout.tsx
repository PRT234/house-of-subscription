'use client';

import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-surface-dark selection:bg-indigo-500/30">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand header */}
      <div className="mb-8 flex flex-col items-center text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <span className="text-2xl">🏠</span>
          </div>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          House of Subscriptions
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Master recurring expenses. Privacy-first, zero clutter.
        </p>
      </div>

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 border border-white/10 shadow-2xl shadow-black/60 bg-slate-900/80 backdrop-blur-2xl">
          {children}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        &copy; {new Date().getFullYear()} House of Subscriptions. All rights reserved.
      </div>
    </div>
  );
}
