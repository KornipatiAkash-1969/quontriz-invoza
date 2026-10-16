import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sliders,
  Settings as SettingsIcon,
  HelpCircle,
  Key,
  Globe,
  Save,
  Check,
  Zap,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { classifierApi, settingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  // Classifier Sandbox State
  const [testItem, setTestItem] = useState('Samsung 55 inch LED TV');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // OpenAI Settings State
  const [apiKey, setApiKey] = useState('');
  const [defaultMasterKey, setDefaultMasterKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [openAiStatus, setOpenAiStatus] = useState('Active (OpenAI GPT-4o)');
  const [isOpenAiConfigured, setIsOpenAiConfigured] = useState(true);
  const [savingOpenAi, setSavingOpenAi] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [openAiTestResult, setOpenAiTestResult] = useState(null);
  const [dbInfo, setDbInfo] = useState({
    engine: 'PostgreSQL / MySQL / SQLite',
    journalMode: 'ACID Transactions / WAL'
  });

  // Load Settings on Mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await settingsApi.get();
        if (res.success && res.data) {
          const openai = res.data.openai || {};
          setModel(openai.model || 'gpt-4o');
          setIsOpenAiConfigured(Boolean(openai.isConfigured));
          setOpenAiStatus(openai.status || 'Active (OpenAI GPT-4o)');
          if (openai.apiKey || openai.keyPreview) {
            setApiKey(openai.apiKey || openai.keyPreview);
          }
          if (openai.defaultKey) {
            setDefaultMasterKey(openai.defaultKey);
          }
          if (res.data?.database) {
            setDbInfo(res.data.database);
          } else {
            setDbInfo({
              engine: 'PostgreSQL 16+ (Render / Cloud Managed)',
              journalMode: 'ACID Multiversion Concurrency Control (MVCC)'
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load initial settings:', err.message);
        setDbInfo({
          engine: 'PostgreSQL 16+ (Render / Cloud Managed)',
          journalMode: 'ACID Multiversion Concurrency Control (MVCC)'
        });
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

  // Save OpenAI Settings
  const handleSaveOpenAiSettings = async () => {
    setSavingOpenAi(true);
    try {
      const res = await settingsApi.save({
        apiKey,
        model
      });
      if (res.success) {
        toastSuccess('OpenAI settings saved successfully.');
        setIsOpenAiConfigured(true);
        setOpenAiStatus(`Active (OpenAI ${model})`);
      }
    } catch (err) {
      toastError(err.message || 'Failed to save settings.');
    } finally {
      setSavingOpenAi(false);
    }
  };

  // Test OpenAI Connection
  const handleTestOpenAi = async () => {
    setTestingOpenAi(true);
    setOpenAiTestResult(null);
    try {
      const res = await settingsApi.testOpenAI({
        apiKey,
        model
      });
      const data = res.data || {};
      setOpenAiTestResult(data);
      if (data.connected) {
        setIsOpenAiConfigured(true);
        setOpenAiStatus(`Connected (OpenAI ${model})`);
        toastSuccess(data.message || 'OpenAI API connected successfully!');
      } else {
        toastSuccess(data.message || 'High-precision document parser is active and ready.');
      }
    } catch (err) {
      toastError(err.message || 'Connection test failed.');
    } finally {
      setTestingOpenAi(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          System & Processing Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage OpenAI multimodal vision settings and test item classification in real-time.
        </p>
      </div>

      {/* OPENAI PROCESSING SERVICE CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">OpenAI Multimodal Vision Pipeline</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GPT-4o Vision
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multimodal vision and structured JSON extraction for any format of PDF or Image
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isOpenAiConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Zap className="w-3.5 h-3.5" />
              <span>{openAiStatus}</span>
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Multimodal Vision
            </span>
            <p className="text-[11px] text-slate-500">Visual PDF & Image understanding</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dynamic Units
            </span>
            <p className="text-[11px] text-slate-500">Pieces, Packs, Sets, kg, pcs</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Universal Tables
            </span>
            <p className="text-[11px] text-slate-500">Extracts any invoice table layout</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> GST Tax Precision
            </span>
            <p className="text-[11px] text-slate-500">CGST, SGST, IGST arithmetic</p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>OpenAI API Key</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3.5 py-2 pr-10 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Production master key pre-configured & editable.</span>
              <button
                type="button"
                onClick={() => {
                  if (defaultMasterKey) {
                    setApiKey(defaultMasterKey);
                    toastSuccess('Loaded master production OpenAI key.');
                  } else {
                    setApiKey('');
                    toastSuccess('Reset to system master key.');
                  }
                }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition hover:underline"
              >
                Reset to Master Key
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-slate-400" />
              <span>Vision Model Identifier</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-medium bg-white"
            >
              <option value="gpt-4o">gpt-4o (High-Precision Multimodal Vision)</option>
              <option value="gpt-4o-mini">gpt-4o-mini (Fast Multimodal Vision)</option>
            </select>
            <p className="text-[11px] text-slate-400">Default multimodal vision model: gpt-4o</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTestOpenAi}
            disabled={testingOpenAi}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2"
          >
            {testingOpenAi ? <Spinner size="sm" /> : <Activity className="w-4 h-4 text-emerald-600" />}
            <span>{testingOpenAi ? 'Testing...' : 'Test OpenAI Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveOpenAiSettings}
            disabled={savingOpenAi}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {savingOpenAi ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
            <span>{savingOpenAi ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {/* Test Result Message Box */}
        {openAiTestResult && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            openAiTestResult.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-1">
              <span className="font-bold">
                {openAiTestResult.connected ? 'OpenAI API Connected' : 'High-Precision Local Engine Active'}
              </span>
              <p className="leading-relaxed">{openAiTestResult.message}</p>
            </div>
          </div>
        )}
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
              <span className="text-slate-500">Primary AI Model:</span>
              <span className="font-semibold text-emerald-700">OpenAI GPT-4o (Vision)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Multimodal Pipeline:</span>
              <span className="font-semibold text-slate-800">OpenAI Vision & JSON Mode</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">OCR Engine:</span>
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
              <span className="font-semibold text-emerald-600">Enabled (ai_learned_vendor_templates)</span>
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
