import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
  Building2,
  Calculator,
  RefreshCw,
  RotateCcw,
  FlaskConical,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';
import { invoiceApi, vendorApi, categoryApi, vendorTypeApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';
import { formatFileSize, formatCurrency } from '../utils/formatters';
import ProcessingStepIndicator from '../components/upload/ProcessingStepIndicator';
import { Spinner, OcrScannerLoader } from '../components/ui';

export default function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isEmployee, isOwner } = useAuth();
  const { broadcastUpdate } = useUpdates();
  const { error: toastError, success: toastSuccess } = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manual'

  // --- Upload State ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [testSuiteCategories, setTestSuiteCategories] = useState([]);
  const [selectedTestCategory, setSelectedTestCategory] = useState('sample');
  const [processingTestFileName, setProcessingTestFileName] = useState('');

  // Reset upload state helper
  const resetUploadState = () => {
    setIsProcessing(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setCurrentStep(1);
    setErrorMessage('');
    setProcessingTestFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset upload pipeline whenever navigating to UploadPage (ensures never getting stuck on previous file/process)
  useEffect(() => {
    resetUploadState();
  }, [location.key, location.pathname]);

  // --- Manual Entry State ---
  const [vendorsList, setVendorsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [vendorTypesList, setVendorTypesList] = useState([]);
  const [submittingManual, setSubmittingManual] = useState(false);

  const [manualVendorMode, setManualVendorMode] = useState('existing');
  const [manualVendorId, setManualVendorId] = useState('');
  const [manualNewVendor, setManualNewVendor] = useState({
    vendor_name: '',
    vendor_type: 'General Supplier',
    gstin: '',
    address: '',
    contact: '',
    email: ''
  });

  const [manualInvoice, setManualInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    poNumber: '',
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    status: 'Pending Approval'
  });

  const [manualItems, setManualItems] = useState([
    { itemName: '', sku: '', category: 'Grocery', quantity: 1, unit: 'pcs', unitPrice: 0, discount: 0, tax: 0, totalPrice: 0 }
  ]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [vRes, cRes, vtRes, tfRes] = await Promise.all([
          vendorApi.getAll(),
          categoryApi.getAll(),
          vendorTypeApi.getAll(),
          invoiceApi.getTestingFiles().catch(() => ({ success: false }))
        ]);
        setVendorsList(vRes.data || []);
        setCategoriesList(cRes.data || []);
        setVendorTypesList(vtRes.data || []);
        if (tfRes?.success && Array.isArray(tfRes.categories)) {
          setTestSuiteCategories(tfRes.categories);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMasterData();
  }, []);

  // Handle file selection (PDF or Image)
  const handleFileSelect = (file) => {
    setErrorMessage('');
    setIsProcessing(false);
    if (!file) return;

    const validMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

    if (!validMimes.includes(file.type) && !validExts.includes(ext)) {
      setErrorMessage('Only PDF and Image files (PNG, JPG, WEBP) are allowed.');
      toastError('Only PDF and Image files are allowed.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds 15 MB limit.');
      toastError('File size exceeds 15 MB limit.');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    resetUploadState();
  };

  // Simulates progress steps
  const advanceStepSequence = async () => {
    setCurrentStep(1); // Uploading
    await new Promise((r) => setTimeout(r, 400));
    setCurrentStep(2); // Reading Document
    await new Promise((r) => setTimeout(r, 450));
    setCurrentStep(3); // Running OCR
    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep(4); // Extracting information
    await new Promise((r) => setTimeout(r, 400));
    setCurrentStep(5); // Identifying vendor
    await new Promise((r) => setTimeout(r, 400));
    setCurrentStep(6); // Classifying items
  };

  const processFile = async (fileToProcess = selectedFile) => {
    if (!fileToProcess) return;

    setIsProcessing(true);
    setErrorMessage('');
    setUploadProgress(10);

    const stepPromise = advanceStepSequence();

    try {
      const formData = new FormData();
      formData.append('pdf', fileToProcess);

      const response = await invoiceApi.upload(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        setUploadProgress(percentCompleted);
      });

      await stepPromise;
      setCurrentStep(7); // Completed

      toastSuccess('Document processed successfully! Redirecting to review...');
      setTimeout(() => {
        const extracted = response.data;
        resetUploadState();
        navigate('/invoices/review', { state: { extractedData: extracted } });
      }, 700);
    } catch (err) {
      console.error('Invoice processing failed:', err);
      setErrorMessage(err.message || 'Failed to process document.');
      toastError(err.message || 'Processing failed.');
      setIsProcessing(false);
    }
  };

  const handleProcessTestFile = async (file) => {
    if (!file || !file.relativePath) return;

    setIsProcessing(true);
    setProcessingTestFileName(file.displayName || file.filename);
    setErrorMessage('');
    setUploadProgress(15);

    const stepPromise = advanceStepSequence();

    try {
      const response = await invoiceApi.processTestFile(file.relativePath);

      await stepPromise;
      setCurrentStep(7); // Completed

      toastSuccess(`Processed "${file.displayName}" successfully! Redirecting to review...`);
      setTimeout(() => {
        const extracted = response.data;
        resetUploadState();
        navigate('/invoices/review', { state: { extractedData: extracted } });
      }, 700);
    } catch (err) {
      console.error('Test file processing failed:', err);
      setErrorMessage(err.message || 'Failed to process test document.');
      toastError(err.message || 'Processing failed.');
      setIsProcessing(false);
      setProcessingTestFileName('');
    }
  };

  // --- Manual Entry Helpers ---
  const handleManualItemChange = (index, field, value) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'tax') {
      const q = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      const p = parseFloat(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
      const d = parseFloat(field === 'discount' ? value : updated[index].discount) || 0;
      const t = parseFloat(field === 'tax' ? value : updated[index].tax) || 0;
      updated[index].totalPrice = parseFloat(((q * p) - d + t).toFixed(2));
    }
    setManualItems(updated);
  };

  const addManualItemRow = () => {
    setManualItems((prev) => [
      ...prev,
      { itemName: '', sku: '', category: 'Grocery', quantity: 1, unit: 'pcs', unitPrice: 0, discount: 0, tax: 0, totalPrice: 0 }
    ]);
  };

  const removeManualItemRow = (index) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateManualTotals = () => {
    const sub = manualItems.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || 0)), 0);
    const disc = manualItems.reduce((sum, it) => sum + Number(it.discount || 0), 0);
    const tx = manualItems.reduce((sum, it) => sum + Number(it.tax || 0), 0);
    const tot = sub - disc + tx;

    setManualInvoice((prev) => ({
      ...prev,
      subtotal: parseFloat(sub.toFixed(2)),
      discount: parseFloat(disc.toFixed(2)),
      tax: parseFloat(tx.toFixed(2)),
      total: parseFloat(tot.toFixed(2))
    }));
    toastSuccess('Totals calculated from items.');
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInvoice.invoiceNumber.trim()) {
      toastError('Invoice number is required.');
      return;
    }
    if (manualVendorMode === 'existing' && !manualVendorId) {
      toastError('Please select a vendor.');
      return;
    }
    if (manualVendorMode === 'new' && !manualNewVendor.vendor_name.trim()) {
      toastError('New vendor name is required.');
      return;
    }
    if (manualItems.length === 0 || !manualItems[0].itemName.trim()) {
      toastError('Please enter at least one item description.');
      return;
    }

    setSubmittingManual(true);
    try {
      const payload = {
        vendorId: manualVendorMode === 'existing' ? manualVendorId : null,
        newVendor: manualVendorMode === 'new' ? manualNewVendor : null,
        invoiceNumber: manualInvoice.invoiceNumber,
        invoiceDate: manualInvoice.invoiceDate,
        dueDate: manualInvoice.dueDate,
        poNumber: manualInvoice.poNumber,
        subtotal: manualInvoice.subtotal,
        discount: manualInvoice.discount,
        tax: manualInvoice.tax,
        total: manualInvoice.total,
        status: isEmployee ? 'Pending Approval' : 'Approved',
        pdfPath: null,
        ocrText: `Manually Entered Invoice by ${user?.name || 'Staff'}`,
        items: manualItems.map((it) => ({
          itemName: it.itemName,
          sku: it.sku,
          category: it.category,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discount: it.discount,
          tax: it.tax,
          totalPrice: it.totalPrice,
          classificationConfidence: 1.0
        })),
        userId: user?.id || null,
        userRole: user?.role || (isEmployee ? 'staff' : 'owner'),
        created_by_user_id: user?.id || null
      };

      const res = await invoiceApi.save(payload);
      toastSuccess(
        isEmployee
          ? 'Invoice submitted for Owner approval!'
          : 'Manual invoice saved to database!'
      );
      if (broadcastUpdate) broadcastUpdate();
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      toastError(err.message || 'Failed to submit manual invoice.');
    } finally {
      setSubmittingManual(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Invoice Intake Portal</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload supplier invoices as <strong>PDF or Image</strong> (PNG/JPG), or enter invoice line items manually.
          </p>
        </div>

        {/* User Role Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Signed in as:</span>
          <span className="font-bold text-slate-800">{user?.name || 'Guest'}</span>
          <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
            isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {user?.role || 'user'}
          </span>
        </div>
      </div>

      {/* Tabs: Upload Document vs Manual Entry */}
      <div data-tour="upload-tabs" className="flex flex-col sm:flex-row bg-slate-200/60 p-1 rounded-2xl max-w-md w-full gap-1 sm:gap-0">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'upload'
              ? isOwner
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload PDF / Image</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'manual'
              ? isOwner
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span className="hidden sm:inline">Manually Enter Entire Invoice</span>
          <span className="sm:hidden">Manual Invoice Entry</span>
        </button>
      </div>

      {/* Multimodal AI System Deployment Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/70 border border-blue-200/80 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">Multimodal AI Vision:</span>
          <span className="text-slate-600">Google Gemini active across all devices</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-200">
            <Globe className="w-3 h-3 text-blue-600" />
            <span>Universal Cloud Key</span>
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
            <Lock className="w-3 h-3 text-amber-600" />
            <span>Locked & Secured</span>
          </span>
        </div>
      </div>

      {/* TAB 1: UPLOAD PDF OR IMAGE */}
      {activeTab === 'upload' && (
        <>
          {isProcessing ? (
            <div className="py-6 space-y-6">
              {/* Role-Themed OCR Laser Scan Loader */}
              <OcrScannerLoader
                role={isOwner ? 'owner' : 'staff'}
                title={
                  processingTestFileName
                    ? `Testing: ${processingTestFileName}`
                    : currentStep <= 3
                    ? "Scanning & Reading Document..."
                    : "Extracting Invoice Data..."
                }
                subtitle={
                  processingTestFileName
                    ? "Running multimodal AI vision and OCR extraction on selected test invoice..."
                    : currentStep <= 2
                    ? "Uploading document to secure server..."
                    : currentStep === 3
                    ? "Running high-accuracy Tesseract OCR on document pages..."
                    : currentStep === 4
                    ? "Extracting invoice number, dates, totals, and line items..."
                    : "Finalizing verification and vendor classification..."
                }
              />

              <ProcessingStepIndicator currentStep={currentStep} />

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={resetUploadState}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel & Upload Other PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Card */}
              <div data-tour="upload-dropzone" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? isOwner
                        ? 'border-indigo-500 bg-indigo-50/60 scale-[1.005]'
                        : 'border-emerald-500 bg-emerald-50/60 scale-[1.005]'
                      : isOwner
                      ? 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70 bg-slate-50/30'
                      : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/70 bg-slate-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onClick={(e) => {
                      e.target.value = null;
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-inner ${
                      isOwner
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <h3 className="text-base font-semibold text-slate-800">
                    Drag and drop your supplier invoice (PDF or Image) here
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Supports digital PDFs, scanned receipts, and photos (PNG, JPG, WebP)
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                    Browse File
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span>PDF or Image (PNG/JPG)</span>
                    <span>•</span>
                    <span>Up to 15 MB</span>
                    <span>•</span>
                    <span>Automatic Tesseract OCR</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {selectedFile && (
                  <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                          selectedFile.name.endsWith('.pdf') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedFile.name.endsWith('.pdf') ? 'PDF' : 'IMG'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetUploadState();
                          fileInputRef.current?.click();
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 rounded-xl transition ${
                          isOwner
                            ? 'hover:text-indigo-600 hover:bg-indigo-50/50'
                            : 'hover:text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Change / Choose Other PDF</span>
                      </button>

                      <button
                        onClick={() => processFile()}
                        className={`flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] ${
                          isOwner
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                      >
                        <span>Process Invoice</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Suite Invoices Section */}
              {testSuiteCategories && testSuiteCategories.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isOwner ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Invoice Test Suite
                        </h4>
                        <p className="text-xs text-slate-500">
                          One-click testing with documents from <code className="text-slate-600 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">server/Testing files</code>
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>OCR & AI Extraction Ready</span>
                    </div>
                  </div>

                  {/* Categories Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {testSuiteCategories.map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedTestCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                          selectedTestCategory === cat.key
                            ? isOwner
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          selectedTestCategory === cat.key
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cat.files.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Grid of Test Files */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {(testSuiteCategories.find(c => c.key === selectedTestCategory)?.files || []).map((file, idx) => (
                      <div
                        key={idx}
                        className="group p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition bg-slate-50/50 hover:bg-white flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            file.filename.endsWith('.pdf') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {file.filename.endsWith('.pdf') ? 'PDF' : 'IMG'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate" title={file.displayName}>
                              {file.displayName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleProcessTestFile(file)}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            isOwner
                              ? 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                              : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                          }`}
                        >
                          <span>Test</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB 2: MANUALLY ENTER ENTIRE INVOICE */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-6">
          {/* Vendor Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2
                  className={`w-4 h-4 ${
                    isOwner ? 'text-indigo-600' : 'text-emerald-600'
                  }`}
                />
                <h3 className="font-semibold text-slate-800 text-sm">Supplier / Vendor Details</h3>
              </div>

              <div className="flex gap-3 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="manVendorMode"
                    checked={manualVendorMode === 'existing'}
                    onChange={() => setManualVendorMode('existing')}
                  />
                  <span>Select Existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="manVendorMode"
                    checked={manualVendorMode === 'new'}
                    onChange={() => setManualVendorMode('new')}
                  />
                  <span>New Supplier</span>
                </label>
              </div>
            </div>

            {manualVendorMode === 'existing' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose Vendor *
                </label>
                <select
                  value={manualVendorId}
                  onChange={(e) => setManualVendorId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendorsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vendor_name} ({v.vendor_type}) - GSTIN: {v.gstin || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualNewVendor.vendor_name}
                    onChange={(e) => setManualNewVendor((p) => ({ ...p, vendor_name: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholder="e.g. City Agro Distributors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Type
                  </label>
                  <select
                    value={manualNewVendor.vendor_type}
                    onChange={(e) => setManualNewVendor((p) => ({ ...p, vendor_type: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {vendorTypesList.map((vt) => (
                      <option key={vt.id || vt.type_name} value={vt.type_name}>
                        {vt.type_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={manualNewVendor.gstin}
                    onChange={(e) => setManualNewVendor((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white uppercase font-mono"
                    placeholder="15-char GSTIN"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice Header Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText
                className={`w-4 h-4 ${
                  isOwner ? 'text-indigo-600' : 'text-emerald-600'
                }`}
              />
              <h3 className="font-semibold text-slate-800 text-sm">Invoice Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualInvoice.invoiceNumber}
                  onChange={(e) => setManualInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={manualInvoice.invoiceDate}
                  onChange={(e) => setManualInvoice((p) => ({ ...p, invoiceDate: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={manualInvoice.dueDate}
                  onChange={(e) => setManualInvoice((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PO Number</label>
                <input
                  type="text"
                  value={manualInvoice.poNumber}
                  onChange={(e) => setManualInvoice((p) => ({ ...p, poNumber: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="PO-..."
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">
                Line Items ({manualItems.length})
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addManualItemRow}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                    isOwner
                      ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
                <button
                  type="button"
                  onClick={calculateManualTotals}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  <Calculator className="w-3.5 h-3.5 text-slate-500" />
                  <span>Calculate Totals</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3 w-[28%]">Item Description</th>
                    <th
                      className={`py-2.5 px-3 min-w-[95px] w-24 text-center font-black border-x ${
                        isOwner
                          ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200/50'
                          : 'bg-emerald-50/70 text-emerald-950 border-emerald-200/50'
                      }`}
                    >
                      Qty
                    </th>
                    <th className="py-2.5 px-3 w-[10%]">Unit</th>
                    <th className="py-2.5 px-3 w-[18%]">Category</th>
                    <th className="py-2.5 px-3 w-[12%]">SKU</th>
                    <th className="py-2.5 px-3 w-[14%]">Price (₹)</th>
                    <th className="py-2.5 px-3 w-[14%]">Total (₹)</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manualItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => handleManualItemChange(idx, 'itemName', e.target.value)}
                          placeholder="Product Name"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td
                        className={`py-2 px-3 min-w-[95px] w-24 border-x ${
                          isOwner
                            ? 'bg-indigo-50/20 border-indigo-100/50'
                            : 'bg-emerald-50/20 border-emerald-100/50'
                        }`}
                      >
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}
                          onChange={(e) => handleManualItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full px-2 py-1.5 border rounded-lg text-xs font-mono font-black text-center text-slate-900 bg-white shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isOwner ? 'border-indigo-300' : 'border-emerald-300'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleManualItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleManualItemChange(idx, 'category', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                        >
                          {categoriesList.map((c) => (
                            <option key={c.id || c.category_name} value={c.category_name}>
                              {c.category_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleManualItemChange(idx, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleManualItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.totalPrice}
                          onChange={(e) => handleManualItemChange(idx, 'totalPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeManualItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Zero horizontal scroll) */}
            <div className="md:hidden space-y-3">
              {manualItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-bold text-slate-600">Item #{idx + 1}</span>
                    {manualItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManualItemRow(idx)}
                        className="text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Description *</label>
                    <input
                      type="text"
                      required
                      value={item.itemName}
                      onChange={(e) => handleManualItemChange(idx, 'itemName', e.target.value)}
                      placeholder="e.g. Basmati Rice 5kg"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}
                        onChange={(e) => handleManualItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold text-center bg-white ${
                          isOwner ? 'border-indigo-300' : 'border-emerald-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleManualItemChange(idx, 'unit', e.target.value)}
                        placeholder="pcs / kg"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => handleManualItemChange(idx, 'category', e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                      >
                        {categoriesList.map((c) => (
                          <option key={c.id || c.category_name} value={c.category_name}>
                            {c.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">SKU / Code</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleManualItemChange(idx, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleManualItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Line Total (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.totalPrice}
                        onChange={(e) => handleManualItemChange(idx, 'totalPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financials & Submission */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Role-Based Workflow:</p>
              <p>
                {isEmployee
                  ? 'As an Employee, this invoice will be submitted with status "Pending Approval" for Owner review.'
                  : 'As an Owner, this invoice can be recorded immediately or approved for payment.'}
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-semibold">{formatCurrency(manualInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Tax / GST</span>
                {Number(manualInvoice.tax) > 0 ? (
                  <span
                    className={`font-semibold px-2 py-0.5 rounded border ${
                      isOwner
                        ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    + {formatCurrency(manualInvoice.tax)} (GST)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">₹0.00</span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total</span>
                <span
                  className={`font-extrabold ${
                    isOwner ? 'text-indigo-700' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(manualInvoice.total)}
                </span>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submittingManual}
                  className={`w-full py-3 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isOwner
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {submittingManual ? (
                    <>
                      <Spinner size="xs" variant="white" />
                      <span>Submitting Invoice...</span>
                    </>
                  ) : isEmployee ? (
                    'Submit for Owner Approval & Payment'
                  ) : (
                    'Save & Approve Invoice'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
