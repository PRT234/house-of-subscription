'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CATEGORIES, BILLING_CYCLES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Layers,
  KeyRound,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface ParsedRow {
  id: string;
  selected: boolean;
  name: string;
  amount: number;
  currency: string;
  billing_frequency: string;
  next_renewal_date: string;
  category: string;
}

interface SettingsData {
  has_own_key: boolean;
  ai_imports_used: number;
  ai_imports_limit: number;
  currency: string;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'csv' | 'ai'>('csv');
  const [settings, setSettings] = useState<SettingsData | null>(null);

  // Tab 1: CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawData, setCsvRawData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    amount: '',
    currency: '',
    frequency: '',
    date: '',
    category: '',
  });
  const [isMappingConfirmed, setIsMappingConfirmed] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);

  // Tab 2: AI Statement state
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRows, setAiRows] = useState<ParsedRow[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Import execution progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{ total: number; succeeded: number } | null>(null);

  const fileInputRefCsv = useRef<HTMLInputElement>(null);
  const fileInputRefAi = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      const data = await api.get<SettingsData>('/api/settings/');
      setSettings(data);
    } catch (err) {
      // Ignore if unauthenticated
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // -------------------------------------------------------------
  // TAB 1: CSV Parsing & Mapping
  // -------------------------------------------------------------
  const handleCsvFileUpload = (file: File) => {
    setCsvFile(file);
    setIsMappingConfirmed(false);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvRawData(results.data || []);

        // Auto-match common header aliases
        const matchHeader = (keywords: string[]) => {
          return (
            headers.find((h) =>
              keywords.some((kw) => h.toLowerCase().includes(kw))
            ) || ''
          );
        };

        const initialMapping = {
          name: matchHeader(['name', 'merchant', 'service', 'subscription', 'description', 'title']),
          amount: matchHeader(['amount', 'cost', 'price', 'fee', 'charge', 'total', 'bill']),
          currency: matchHeader(['currency', 'curr']),
          frequency: matchHeader(['frequency', 'period', 'cycle', 'interval', 'billing']),
          date: matchHeader(['renewal', 'date', 'next', 'due', 'billing date']),
          category: matchHeader(['category', 'type', 'genre']),
        };

        setColumnMapping(initialMapping);
      },
      error: (err) => {
        alert(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleApplyMapping = () => {
    if (!columnMapping.name || !columnMapping.amount) {
      alert('Please map at least Name and Amount columns.');
      return;
    }

    const defaultCurrency = settings?.currency || 'INR';
    const today = new Date().toISOString().split('T')[0];

    const parsed: ParsedRow[] = csvRawData.map((row, idx) => {
      const rawName = String(row[columnMapping.name] || '').trim();
      const rawAmount = parseFloat(
        String(row[columnMapping.amount] || '')
          .replace(/[^0-9.-]+/g, '')
      ) || 0;

      const rawCurrency = columnMapping.currency && row[columnMapping.currency]
        ? String(row[columnMapping.currency]).trim().toUpperCase()
        : defaultCurrency;

      const rawFreq = columnMapping.frequency && row[columnMapping.frequency]
        ? String(row[columnMapping.frequency]).trim().toLowerCase()
        : 'monthly';

      const validFreq = ['weekly', 'monthly', 'quarterly', 'yearly'].includes(rawFreq)
        ? rawFreq
        : 'monthly';

      let rawDate = columnMapping.date && row[columnMapping.date]
        ? String(row[columnMapping.date]).trim()
        : today;

      // Basic date normalization check
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        try {
          const parsedD = new Date(rawDate);
          if (!isNaN(parsedD.getTime())) {
            rawDate = parsedD.toISOString().split('T')[0];
          } else {
            rawDate = today;
          }
        } catch {
          rawDate = today;
        }
      }

      const rawCategory = columnMapping.category && row[columnMapping.category]
        ? String(row[columnMapping.category]).trim().toLowerCase()
        : 'other';

      return {
        id: `csv-${idx}-${Date.now()}`,
        selected: rawAmount > 0 && Boolean(rawName),
        name: rawName || 'Untitled Subscription',
        amount: Math.abs(rawAmount),
        currency: rawCurrency || 'INR',
        billing_frequency: validFreq,
        next_renewal_date: rawDate,
        category: CATEGORIES.some((c) => c.id === rawCategory) ? rawCategory : 'other',
      };
    }).filter((r) => r.amount > 0);

    setCsvRows(parsed);
    setIsMappingConfirmed(true);
  };

  // -------------------------------------------------------------
  // TAB 2: AI Statement Import
  // -------------------------------------------------------------
  const handleStatementUpload = async (file: File) => {
    setStatementFile(file);
    setAiError(null);
    setImportSummary(null);
  };

  const handleRunAiExtraction = async () => {
    if (!statementFile) return;

    setIsAnalyzing(true);
    setAiError(null);

    const formData = new FormData();
    formData.append('file', statementFile);

    try {
      const response = await api.post<any[]>('/api/import/statement', formData);
      const today = new Date().toISOString().split('T')[0];

      const rows: ParsedRow[] = (response || []).map((item, idx) => ({
        id: `ai-${idx}-${Date.now()}`,
        selected: true,
        name: item.merchant || 'Subscription',
        amount: Math.abs(Number(item.amount) || 0),
        currency: item.currency || 'INR',
        billing_frequency: ['weekly', 'monthly', 'quarterly', 'yearly'].includes(item.frequency_guess)
          ? item.frequency_guess
          : 'monthly',
        next_renewal_date: item.date || today,
        category: 'other',
      }));

      setAiRows(rows);
      fetchSettings(); // refresh quota usage
    } catch (err: any) {
      setAiError(err?.message || 'AI statement analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -------------------------------------------------------------
  // BATCH IMPORT EXECUTION
  // -------------------------------------------------------------
  const handleBatchImport = async (rows: ParsedRow[], setRows: React.Dispatch<React.SetStateAction<ParsedRow[]>>) => {
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      alert('Please select at least one subscription to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportSummary(null);

    let successCount = 0;
    const total = selectedRows.length;

    for (let i = 0; i < total; i++) {
      const row = selectedRows[i];
      try {
        await api.post('/api/subscriptions/', {
          name: row.name,
          amount: row.amount,
          currency: row.currency,
          billing_frequency: row.billing_frequency,
          next_renewal_date: row.next_renewal_date,
          category: row.category,
          status: 'active',
          is_trial: false,
          notes: 'Imported via House of Subscriptions',
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to import ${row.name}:`, err);
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsImporting(false);
    setImportSummary({ total, succeeded: successCount });

    // Uncheck imported rows
    setRows((prev) =>
      prev.map((r) => (r.selected ? { ...r, selected: false } : r))
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Import Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Seamlessly bring your subscriptions from bank statements, credit card exports, or CSV spreadsheets.
          </p>
        </div>

        <Link href="/subscriptions">
          <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
            Go to Subscriptions
          </Button>
        </Link>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'csv'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV Spreadsheet</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'ai'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Bank Statement (AI Assistant)</span>
          {settings && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {settings.has_own_key
                ? 'Custom Key'
                : `${10 - settings.ai_imports_used}/10 left`}
            </span>
          )}
        </button>
      </div>

      {/* Success / Summary banner */}
      {importSummary && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Import Complete!</span> Successfully imported{' '}
              <strong>{importSummary.succeeded}</strong> of {importSummary.total} subscriptions.
            </div>
          </div>
          <Link href="/subscriptions">
            <Button variant="primary" size="sm">
              View Catalog
            </Button>
          </Link>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: CSV IMPORT */}
      {/* ========================================================= */}
      {activeTab === 'csv' && (
        <div className="space-y-6">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRefCsv.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleCsvFileUpload(e.dataTransfer.files[0]);
            }}
            className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 bg-white/[0.015] hover:bg-white/[0.03] rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 group"
          >
            <input
              ref={fileInputRefCsv}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleCsvFileUpload(e.target.files[0]);
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {csvFile ? csvFile.name : 'Drop your CSV file here, or browse'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports statements exported from Mint, Rocket Money, Bobby, bank portals, or custom spreadsheets.
            </p>
          </div>

          {/* Column Mapping Section */}
          {csvHeaders.length > 0 && !isMappingConfirmed && (
            <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-6 animate-slide-up">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Map Columns
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select which columns in your CSV correspond to each subscription field.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label="Subscription Name *"
                  value={columnMapping.name}
                  onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                  options={[
                    { value: '', label: '-- Select Column --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />

                <Select
                  label="Amount *"
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                  options={[
                    { value: '', label: '-- Select Column --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />

                <Select
                  label="Currency (Optional)"
                  value={columnMapping.currency}
                  onChange={(e) => setColumnMapping({ ...columnMapping, currency: e.target.value })}
                  options={[
                    { value: '', label: '-- Default (INR) --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />

                <Select
                  label="Frequency (Optional)"
                  value={columnMapping.frequency}
                  onChange={(e) => setColumnMapping({ ...columnMapping, frequency: e.target.value })}
                  options={[
                    { value: '', label: '-- Default (Monthly) --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />

                <Select
                  label="Renewal Date (Optional)"
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                  options={[
                    { value: '', label: '-- Default (Today) --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />

                <Select
                  label="Category (Optional)"
                  value={columnMapping.category}
                  onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value })}
                  options={[
                    { value: '', label: '-- Default (Other) --' },
                    ...csvHeaders.map((h) => ({ value: h, label: h })),
                  ]}
                />
              </div>

              {/* 3-Row Raw Preview */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Sample Data Preview (First 3 Rows)
                </span>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="p-2.5 font-semibold text-slate-200">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {csvRawData.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {csvHeaders.map((h) => (
                            <td key={h} className="p-2.5 truncate max-w-[160px]">
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="md" onClick={handleApplyMapping}>
                  Confirm Mapping & Preview ({csvRawData.length} records)
                </Button>
              </div>
            </div>
          )}

          {/* Editable Preview Table */}
          {isMappingConfirmed && csvRows.length > 0 && (
            <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Verify Subscriptions ({csvRows.filter((r) => r.selected).length} selected)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and edit parsed items before adding them to your catalog.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMappingConfirmed(false)}
                  >
                    Adjust Mapping
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isImporting}
                    onClick={() => handleBatchImport(csvRows, setCsvRows)}
                  >
                    Import Selected ({csvRows.filter((r) => r.selected).length})
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              {isImporting && (
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-900 border-b border-white/10 z-10">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={csvRows.every((r) => r.selected)}
                          onChange={(e) =>
                            setCsvRows(csvRows.map((r) => ({ ...r, selected: e.target.checked })))
                          }
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600"
                        />
                      </th>
                      <th className="p-3 font-semibold text-slate-200">Name</th>
                      <th className="p-3 font-semibold text-slate-200">Amount</th>
                      <th className="p-3 font-semibold text-slate-200">Currency</th>
                      <th className="p-3 font-semibold text-slate-200">Frequency</th>
                      <th className="p-3 font-semibold text-slate-200">Renewal Date</th>
                      <th className="p-3 font-semibold text-slate-200">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {csvRows.map((row, idx) => (
                      <tr key={row.id} className={row.selected ? 'bg-indigo-500/[0.04]' : 'opacity-60'}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, selected: e.target.checked } : r
                                )
                              )
                            }
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, name: e.target.value } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-full focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, amount: parseFloat(e.target.value) || 0 } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.currency}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, currency: e.target.value.toUpperCase() } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-16 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.billing_frequency}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, billing_frequency: e.target.value } : r
                                )
                              )
                            }
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {BILLING_CYCLES.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={row.next_renewal_date}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, next_renewal_date: e.target.value } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.category}
                            onChange={(e) =>
                              setCsvRows(
                                csvRows.map((r, i) =>
                                  i === idx ? { ...r, category: e.target.value } : r
                                )
                              )
                            }
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji} {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STATEMENT IMPORT (AI ASSISTANT) */}
      {/* ========================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Info Card / BYOK notice */}
          <div className="rounded-2xl glass-card border border-white/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Gemini 2.0 AI Document Extraction
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload PDF bank statements, e-bills, or credit card records. Gemini will automatically isolate recurring merchants, amounts, and cycles.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Quota Status</span>
                <span className="text-xs font-bold text-amber-300">
                  {settings?.has_own_key
                    ? 'Unlimited (BYOK Key)'
                    : `${10 - (settings?.ai_imports_used || 0)} free remaining`}
                </span>
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm" icon={<KeyRound className="w-3.5 h-3.5" />}>
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Statement Dropzone */}
          <div
            onClick={() => fileInputRefAi.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleStatementUpload(e.dataTransfer.files[0]);
            }}
            className="border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/[0.015] hover:bg-white/[0.03] rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 group"
          >
            <input
              ref={fileInputRefAi}
              type="file"
              accept=".pdf,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleStatementUpload(e.target.files[0]);
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {statementFile ? statementFile.name : 'Drop your bank statement PDF, CSV, or TXT'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports HDFC, ICICI, SBI, Chase, Amex, Revolut, or generic statement files up to 10MB.
            </p>

            {statementFile && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-slate-200">
                <span>{(statementFile.size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">Ready for extraction</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {statementFile && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleRunAiExtraction}
                isLoading={isAnalyzing}
                icon={<Sparkles className="w-4 h-4 text-amber-300" />}
              >
                {isAnalyzing ? 'Analyzing Statement with AI...' : 'Extract Recurring Subscriptions'}
              </Button>
            </div>
          )}

          {/* AI Error display */}
          {aiError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong className="block">Extraction Error:</strong>
                <span>{aiError}</span>
              </div>
            </div>
          )}

          {/* AI Parsed Results Table */}
          {aiRows.length > 0 && (
            <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Detected Recurring Subscriptions ({aiRows.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gemini identified the following charges as recurring. Verify or uncheck before importing.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                  onClick={() => handleBatchImport(aiRows, setAiRows)}
                >
                  Import Selected ({aiRows.filter((r) => r.selected).length})
                </Button>
              </div>

              {/* Progress bar */}
              {isImporting && (
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              )}

              <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-900 border-b border-white/10 z-10">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={aiRows.every((r) => r.selected)}
                          onChange={(e) =>
                            setAiRows(aiRows.map((r) => ({ ...r, selected: e.target.checked })))
                          }
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600"
                        />
                      </th>
                      <th className="p-3 font-semibold text-slate-200">Merchant</th>
                      <th className="p-3 font-semibold text-slate-200">Amount</th>
                      <th className="p-3 font-semibold text-slate-200">Currency</th>
                      <th className="p-3 font-semibold text-slate-200">Guessed Cycle</th>
                      <th className="p-3 font-semibold text-slate-200">Next Due</th>
                      <th className="p-3 font-semibold text-slate-200">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {aiRows.map((row, idx) => (
                      <tr key={row.id} className={row.selected ? 'bg-indigo-500/[0.04]' : 'opacity-60'}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, selected: e.target.checked } : r
                                )
                              )
                            }
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, name: e.target.value } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-full focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, amount: parseFloat(e.target.value) || 0 } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.currency}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, currency: e.target.value.toUpperCase() } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs w-16 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.billing_frequency}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, billing_frequency: e.target.value } : r
                                )
                              )
                            }
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {BILLING_CYCLES.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={row.next_renewal_date}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, next_renewal_date: e.target.value } : r
                                )
                              )
                            }
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.category}
                            onChange={(e) =>
                              setAiRows(
                                aiRows.map((r, i) =>
                                  i === idx ? { ...r, category: e.target.value } : r
                                )
                              )
                            }
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji} {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
