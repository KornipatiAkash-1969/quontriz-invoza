import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Zap,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { classifierApi, settingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';

export default function SettingsPage() {
  const { isOwner } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  // Active AI Provider: 'openai' | 'gemini'
  const [activeProvider, setActiveProvider] = useState('openai');

  // OpenAI Configuration State
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openaiStatus, setOpenaiStatus] = useState('Checking...');
  const [isOpenaiConfigured, setIsOpenaiConfigured] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState(null);

  // Google Gemini Configuration State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [geminiStatus, setGeminiStatus] = useState('Free Tier Available');
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState(null);

  // Global Saving State
  const [savingSettings, setSavingSettings] = useState(false);

  // Classifier Sandbox State
  const [testItem, setTestItem] = useState('Samsung 55 inch LED TV');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Database Info State
  const [dbInfo, setDbInfo] = useState({
    engine: 'PostgreSQL 16+ (Render / Cloud Managed)',
    journalMode: 'ACID Multiversion Concurrency Control (MVCC)'
  });

  // Load Settings on Mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await settingsApi.get();
        if (res.success && res.data) {
          const { openai = {}, gemini = {}, activeProvider: prov = 'openai', database = {} } = res.data;

          setActiveProvider(prov);

          // OpenAI
          setOpenaiModel(openai.model || 'gpt-4o');
          setIsOpenaiConfigured(Boolean(openai.isConfigured));
          setOpenaiStatus(openai.status || 'Configured');
          setOpenaiApiKey(openai.keyPreview || '');

          // Gemini
          setGeminiModel(gemini.model || 'gemini-1.5-flash');
          setIsGeminiConfigured(Boolean(gemini.isConfigured));
          setGeminiStatus(gemini.status || 'Free Key Available');
          setGeminiApiKey(gemini.keyPreview || '');

          // Database
          if (database && database.engine) {
            setDbInfo(database);
          }
        }
      } catch (err) {
        console.warn('Failed to load initial settings:', err.message);
      }
    }
    loadSettings();
  }, []);

  const sampleQueries = [
    'Samsung 55 inch LED TV',
    'Executive Hardbound Diary - A5',
    'Daily Planner Diary - B5',
    'Pocket Diary - A6',
    'Coca Cola 500ml',
    'Lays Chips 50g',
    'Desk Calendar & Diary Gift Set',
    'Surf Excel Detergent 1kg'
  ];

  const handleTestClassification = async (itemToTest = testItem) => {
    if (!itemToTest.trim()) {
      toastError('Please enter an item name to test.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await classifierApi.test(itemToTest.trim());
      setTestResult(res.data);
    } catch (err) {
      toastError(err.message || 'Classification test failed.');
    } finally {
      setTesting(false);
    }
  };

  // Test OpenAI Connection (tests real chat completions quota)
  const handleTestOpenAi = async () => {
    setTestingOpenAi(true);
    setOpenaiTestResult(null);
    try {
      const res = await settingsApi.testOpenAI({
        apiKey: openaiApiKey,
        model: openaiModel
      });
      const data = res.data || {};
      setOpenaiTestResult(data);
      if (data.connected) {
        setIsOpenaiConfigured(true);
        setOpenaiStatus(`Connected with Credits (${openaiModel})`);
        toastSuccess(data.message || 'OpenAI API connected successfully!');
      } else {
        if (data.quotaExhausted) {
          toastError('OpenAI Quota Exhausted: 0 credits remaining. Switch to Google Gemini or add credits.');
        } else {
          toastError(data.message || 'OpenAI connection failed.');
        }
      }
    } catch (err) {
      toastError(err.message || 'OpenAI test failed.');
    } finally {
      setTestingOpenAi(false);
    }
  };

  // Test Google Gemini Connection
  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await settingsApi.testGemini({
        apiKey: geminiApiKey,
        model: geminiModel
      });
      const data = res.data || {};
      setGeminiTestResult(data);
      if (data.connected) {
        setIsGeminiConfigured(true);
        setGeminiStatus(`Connected (${geminiModel})`);
        toastSuccess(data.message || 'Google Gemini API connected successfully!');
      } else {
        toastError(data.message || 'Google Gemini connection failed.');
      }
    } catch (err) {
      toastError(err.message || 'Gemini test failed.');
    } finally {
      setTestingGemini(false);
    }
  };

  // Save All AI Settings & Provider
  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        provider: activeProvider,
        openaiApiKey,
        openaiModel,
        geminiApiKey,
        geminiModel
      };

      const res = await settingsApi.save(payload);
      if (res.success) {
        toastSuccess('AI settings & API keys saved successfully!');
        if (res.data?.openai) {
          setIsOpenaiConfigured(res.data.openai.isConfigured);
        }
        if (res.data?.gemini) {
          setIsGeminiConfigured(res.data.gemini.isConfigured);
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Document AI & System Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure Multimodal Vision engines (Google Gemini or OpenAI) for invoice extraction, OCR, and classification.
        </p>
      </div>

      {/* MULTIMODAL DOCUMENT AI CONFIGURATION CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md ${
                isOwner
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-100'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-100'
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Multimodal Vision AI Engine</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    activeProvider === 'gemini'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : isOwner
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Active: {activeProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Understands handwritten bills, mobile photos, complex GST tables, and scanned chits
              </p>
            </div>
          </div>

          {/* Provider Toggle Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveProvider('openai')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeProvider === 'openai'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              OpenAI (GPT-4o)
            </button>
            <button
              type="button"
              onClick={() => setActiveProvider('gemini')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeProvider === 'gemini'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Google Gemini</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 font-extrabold px-1 rounded">FREE</span>
            </button>
          </div>
        </div>

        {/* Informational Callout Banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Recommendation for High Accuracy with Zero Credit Exhaustion:</span>
            <p className="leading-relaxed">
              OpenAI requires paid billing credits and will stop working with error <strong>429 (credit_balance_exhausted)</strong> when credits expire.
              You can switch to <strong>Google Gemini (1.5 Flash)</strong> for generous free-tier multimodal vision with native handwriting recognition.
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold underline pt-0.5"
            >
              <span>Get your free Google Gemini API Key at Google AI Studio (No Credit Card Required)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* PROVIDER 1: GOOGLE GEMINI SETTINGS */}
        <div className={`p-5 rounded-2xl border transition-all ${
          activeProvider === 'gemini' ? 'bg-blue-50/30 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h4 className="font-bold text-slate-800 text-sm">Google Gemini Configuration</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {geminiStatus}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Free Tier: 15 Requests / min</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gemini API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Gemini API Key (starts with AIzaSy...)</span>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  {showGeminiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showGeminiKey ? 'Hide' : 'Reveal'}</span>
                </button>
              </label>
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none font-mono bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-400">Generate at Google AI Studio without entering any credit card.</p>
            </div>

            {/* Gemini Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Gemini Vision Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none font-medium bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, Free & High-Accuracy Vision - Recommended)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen Multimodal Reasoning)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Document Analysis)</option>
              </select>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingGemini ? <Spinner size="sm" /> : <Activity className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{testingGemini ? 'Testing Gemini...' : 'Test Gemini Connection'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gemini Test Result */}
          {geminiTestResult && (
            <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              geminiTestResult.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {geminiTestResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{geminiTestResult.message}</span>
            </div>
          )}
        </div>

        {/* PROVIDER 2: OPENAI SETTINGS */}
        <div className={`p-5 rounded-2xl border transition-all ${
          activeProvider === 'openai' ? 'bg-indigo-50/20 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h4 className="font-bold text-slate-800 text-sm">OpenAI Configuration</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {openaiStatus}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Requires paid credits on platform.openai.com</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>OpenAI API Key (starts with sk-proj-...)</span>
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  {showOpenaiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showOpenaiKey ? 'Hide' : 'Reveal'}</span>
                </button>
              </label>
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none font-mono bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <p className="text-[11px] text-slate-400">Must have active positive billing balance to avoid HTTP 429 quota exhaustion.</p>
            </div>

            {/* OpenAI Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">OpenAI Vision Model</label>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="gpt-4o">gpt-4o (High-Precision Multimodal Vision - Recommended)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (Faster, Lower Cost)</option>
              </select>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestOpenAi}
                  disabled={testingOpenAi}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingOpenAi ? <Spinner size="sm" /> : <Activity className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{testingOpenAi ? 'Testing OpenAI...' : 'Test OpenAI Live Quota'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* OpenAI Test Result */}
          {openaiTestResult && (
            <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              openaiTestResult.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : openaiTestResult.quotaExhausted
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {openaiTestResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">
                  {openaiTestResult.connected ? 'OpenAI Live Quota Verified' : 'OpenAI Quota / Billing Notice'}
                </span>
                <p className="leading-relaxed">{openaiTestResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Global Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Keys are encrypted and stored securely in your private environment configuration.
          </p>

          <button
            type="button"
            onClick={handleSaveAllSettings}
            disabled={savingSettings}
            className={`px-6 py-2.5 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 ${
              isOwner
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {savingSettings ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
            <span>{savingSettings ? 'Saving Settings...' : 'Save AI Configuration'}</span>
          </button>
        </div>
      </div>

      {/* AI Classifier Sandbox Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Live Item Classifier Sandbox</h3>
            <p className="text-xs text-slate-500">
              Type any product name to see the category mapping and confidence score
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Test Product Name</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={testItem}
              onChange={(e) => setTestItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestClassification()}
              placeholder="e.g. Executive Hardbound Diary - A5, Lays Classic Chips 50g..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-medium"
            />
            <button
              onClick={() => handleTestClassification()}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              {testing ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
              <span>Classify</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Quick examples:</span>
            {sampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setTestItem(q);
                  handleTestClassification(q);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium text-[11px] transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Classification Result Box */}
        {testResult && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Classification Result
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  !testResult.lowConfidence
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {!testResult.lowConfidence ? 'High Confidence' : 'Manual Review Recommended'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Input Item</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{testResult.item}</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium">Assigned Category</span>
                <p className="font-extrabold text-indigo-700 text-sm mt-0.5">
                  {testResult.category}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium">Confidence Score</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {Math.round(testResult.confidence * 100)}% ({testResult.confidence})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Security & Password Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">Account Security & Password</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your account password with enterprise bcrypt encryption. Works for both Owner and Staff accounts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-[0.98] flex-shrink-0"
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Account Password</span>
        </button>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* System Architecture & Engine Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document AI Stack */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-sm">Document Processing Stack</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Active AI Vision:</span>
              <span className={`font-semibold ${isOwner ? 'text-indigo-700' : 'text-emerald-700'}`}>
                {activeProvider === 'gemini' ? `Google Gemini (${geminiModel})` : `OpenAI (${openaiModel})`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Multimodal Engines:</span>
              <span className="font-semibold text-slate-800">Google Gemini & OpenAI Vision</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Local OCR Engine:</span>
              <span className="font-semibold text-slate-800">Tesseract.js v5 + PDF Vector Parser</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Max Upload Size:</span>
              <span className="font-semibold text-slate-800">15 MB</span>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-sm">Database & Active Learning</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Database Engine:</span>
              <span className="font-semibold text-slate-800">{dbInfo.engine || 'PostgreSQL 16+ (Render / Cloud Managed)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Active Learning Memory:</span>
              <span className={`font-semibold ${isOwner ? 'text-indigo-600' : 'text-emerald-600'}`}>Enabled (ai_learned_vendor_templates)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Transaction / Mode:</span>
              <span className="font-semibold text-slate-800">{dbInfo.journalMode || 'ACID Multiversion Concurrency Control (MVCC)'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Financial Storage:</span>
              <span className="font-semibold text-slate-800">NUMERIC(12,2) precision</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
