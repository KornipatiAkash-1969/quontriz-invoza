import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Save,
  Calculator,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Layers,
  Scale,
  Receipt,
  UserCheck,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Globe
} from 'lucide-react';
import { invoiceApi, vendorApi, categoryApi, vendorTypeApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';
import { formatCurrency } from '../utils/formatters';
import RawOcrViewerModal from '../components/review/RawOcrViewerModal';
import DuplicateWarningModal from '../components/review/DuplicateWarningModal';
import VendorCreateModal from '../components/review/VendorCreateModal';
import { Spinner } from '../components/ui';

export default function InvoiceReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const { broadcastUpdate } = useUpdates();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const extractedData = location.state?.extractedData;

  // Redirect if no extracted data in history
  useEffect(() => {
    if (!extractedData) {
      navigate('/upload');
    }
  }, [extractedData, navigate]);

  // Master lists
  const [vendorsList, setVendorsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [vendorTypesList, setVendorTypesList] = useState([]);
  const [supportedUnitsList, setSupportedUnitsList] = useState([]);

  // Split-Screen Layout & Document Viewer controls
  const [showDocumentViewer, setShowDocumentViewer] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [documentZoom, setDocumentZoom] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Form State - Vendor
  const [vendorSelectionMode, setVendorSelectionMode] = useState(
    extractedData?.vendor?.matched ? 'existing' : 'new'
  );
  const [selectedVendorId, setSelectedVendorId] = useState(
    extractedData?.vendor?.matchedVendor?.id || extractedData?.vendor?.id || ''
  );
  const [vendorData, setVendorData] = useState({
    vendor_name: extractedData?.vendor?.candidate?.vendor_name || extractedData?.vendor?.vendor_name || extractedData?.invoice?.vendorName || '',
    vendor_type: extractedData?.vendor?.candidate?.vendor_type || extractedData?.vendor?.vendor_type || 'General Supplier',
    gstin: extractedData?.vendor?.candidate?.gstin || extractedData?.vendor?.gstin || extractedData?.invoice?.gstin || '',
    address: extractedData?.vendor?.candidate?.address || extractedData?.vendor?.address || '',
    contact: extractedData?.vendor?.contact || '',
    email: extractedData?.vendor?.email || '',
    notes: 'Imported via Invoice OCR'
  });

  // Form State - Buyer
  const [buyerData, setBuyerData] = useState({
    company_name: extractedData?.buyer?.company_name || extractedData?.buyer?.name || '',
    gstin: extractedData?.buyer?.gstin || '',
    billing_address: extractedData?.buyer?.billing_address || extractedData?.buyer?.address || '',
    shipping_address: extractedData?.buyer?.shipping_address || ''
  });

  // Form State - Invoice Header
  const initialTotal = Number(extractedData?.invoice?.grand_total || extractedData?.invoice?.total || 0);
  const initialAdvancePaid = Number(extractedData?.invoice?.advance_paid || 0);
  const initialAmountPaid = Number(extractedData?.invoice?.amount_paid || extractedData?.invoice?.paid || 0);
  const initialOutstanding = extractedData?.invoice?.outstanding_balance !== undefined
    ? Number(extractedData.invoice.outstanding_balance)
    : Math.max(0, parseFloat((initialTotal - initialAdvancePaid - initialAmountPaid).toFixed(2)));

  // Form State - Invoice Header
  const [invoiceHeader, setInvoiceHeader] = useState({
    invoiceNumber: extractedData?.invoice?.invoice_number || extractedData?.invoice?.invoiceNumber || '',
    invoiceDate: extractedData?.invoice?.invoice_date || extractedData?.invoice?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: extractedData?.invoice?.due_date || extractedData?.invoice?.dueDate || '',
    poNumber: extractedData?.invoice?.po_number || extractedData?.invoice?.poNumber || '',
    paymentTerms: extractedData?.invoice?.payment_terms || '30 Days Credit',
    paymentMethod: extractedData?.invoice?.payment_method || 'Bank Transfer',
    category: extractedData?.invoice?.category || 'Snacks & Food',
    placeOfSupply: extractedData?.invoice?.place_of_supply || '',
    currency: extractedData?.invoice?.currency || 'INR',
    subtotal: Number(extractedData?.invoice?.subtotal || 0),
    discount: Number(extractedData?.invoice?.discount || 0),
    taxableAmount: Number(extractedData?.invoice?.taxable_amount || 0),
    tax: Number(extractedData?.invoice?.tax || extractedData?.invoice?.total_gst || 0),
    cgst: Number(extractedData?.invoice?.cgst || 0),
    sgst: Number(extractedData?.invoice?.sgst || 0),
    igst: Number(extractedData?.invoice?.igst || 0),
    freightCharges: Number(extractedData?.invoice?.freight_charges || 0),
    otherCharges: Number(extractedData?.invoice?.other_charges || 0),
    roundOff: Number(extractedData?.invoice?.round_off || 0),
    total: initialTotal,
    advancePaid: initialAdvancePaid,
    amountPaid: initialAmountPaid,
    paid: initialAmountPaid,
    outstandingBalance: initialOutstanding,
    isTaxInclusive: Boolean(extractedData?.invoice?.is_tax_inclusive),
    status: 'Pending Approval'
  });

  // Form State - Line Items with Dynamic Units and Measurement
  const [items, setItems] = useState(() => {
    const rawItems = extractedData?.items || [];
    return rawItems.map((it, idx) => ({
      line_number: it.line_number || (idx + 1),
      item_name: it.item_name || it.itemName || 'Invoice Item',
      item_description: it.item_description || it.description || '',
      sku: it.sku || '',
      hsn_code: it.hsn_code || it.hsn || '',
      category: it.category || it.category_name || 'Other',
      categoryId: it.categoryId || it.category_id || null,
      quantity: (it.quantity !== undefined && it.quantity !== null && it.quantity !== '')
        ? Number(it.quantity)
        : (it.qty !== undefined && it.qty !== null && it.qty !== '' ? Number(it.qty) : 1),
      unit_original: it.unit_original || it.unit || 'pcs',
      unit_normalized: it.unit_normalized || it.unit || 'pcs',
      unit_flagged: Boolean(it.unit_flagged),
      unit_price: Number(it.unit_price || it.unitPrice || 0),
      price_unit_quantity: Number(it.price_unit_quantity) > 0 ? Number(it.price_unit_quantity) : 1,
      price_unit_measure: it.price_unit_measure || null,
      discount_amount: Number(it.discount_amount || it.discount || 0),
      taxable_value: Number(it.taxable_value || 0),
      gst_rate: Number(it.gst_rate || 0),
      cgst_amount: Number(it.cgst_amount || 0),
      sgst_amount: Number(it.sgst_amount || 0),
      igst_amount: Number(it.igst_amount || 0),
      line_total: Number(it.line_total || it.total_price || it.totalPrice || 0),
      calculation_valid: it.calculation_valid !== undefined ? Boolean(it.calculation_valid) : true,
      confidence: Number(it.classification_confidence || it.confidence || 1.0)
    }));
  });

  // Reconciliation & Duplicate status
  const [reconciliation, setReconciliation] = useState(extractedData?.reconciliation || null);
  const [warnings, setWarnings] = useState(extractedData?.warnings || []);
  const [duplicateInfo, setDuplicateInfo] = useState(extractedData?.duplicate || null);
  const [showWarningsList, setShowWarningsList] = useState(false);

  // Modals
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);

  // Load master dropdowns and supported units
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [vRes, cRes, vtRes, uRes] = await Promise.all([
          vendorApi.getAll().catch(() => ({ data: [] })),
          categoryApi.getAll().catch(() => ({ data: [] })),
          vendorTypeApi.getAll().catch(() => ({ data: [] })),
          invoiceApi.getSupportedUnits().catch(() => ({ data: [] }))
        ]);
        setVendorsList(vRes.data || []);
        setCategoriesList(cRes.data || []);
        setVendorTypesList(vtRes.data || []);
        setSupportedUnitsList(uRes.data || []);
      } catch (err) {
        console.error('Error loading master lists:', err);
      }
    }
    loadMasterData();
  }, []);

  // Real-time duplicate checking when user edits invoice number or supplier
  useEffect(() => {
    const currentInvNo = invoiceHeader.invoiceNumber?.trim();
    if (!currentInvNo) {
      setDuplicateInfo(null);
      return;
    }

    const effectiveVendorId = vendorSelectionMode === 'existing' ? selectedVendorId : null;
    const effectiveVendorName = vendorSelectionMode === 'existing'
      ? vendorsList.find(v => String(v.id) === String(selectedVendorId))?.vendor_name
      : vendorData?.vendor_name;

    const timer = setTimeout(async () => {
      try {
        const res = await invoiceApi.checkDuplicate({
          invoiceNumber: currentInvNo,
          vendorId: effectiveVendorId,
          vendorName: effectiveVendorName,
          invoiceDate: invoiceHeader.invoiceDate,
          grandTotal: invoiceHeader.total
        });
        if (res.data) {
          setDuplicateInfo(res.data.isDuplicate ? res.data : null);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    invoiceHeader.invoiceNumber,
    selectedVendorId,
    vendorData?.vendor_name,
    vendorSelectionMode,
    invoiceHeader.invoiceDate,
    invoiceHeader.total,
    vendorsList
  ]);

  if (!extractedData) return null;

  // File Preview URL
  const fileUrl = extractedData.file?.viewUrl ||
    (extractedData.file?.storedPath ? `/uploads/${extractedData.file.storedPath.split(/[/\\]/).pop()}` : '');
  const isPdf = extractedData.file?.isPdf ?? (extractedData.file?.fileName?.toLowerCase().endsWith('.pdf') || true);

  // Quick unit normalizer helper for live badge updates
  const getNormalizedUnitBadge = (rawUnit) => {
    if (!rawUnit) return { text: '—', isCustom: false };
    const clean = rawUnit.trim().toLowerCase();
    const map = {
      'kgs': 'kg', 'kg': 'kg', 'k.g.': 'kg', 'kilogram': 'kg', 'g': 'g', 'gm': 'g', 'gms': 'g', 'gram': 'g',
      'pcs': 'pcs', 'pc': 'pcs', 'pieces': 'pcs', 'nos': 'pcs', 'units': 'units', 'each': 'each', 'dozen': 'dozen',
      'ltr': 'L', 'ltrs': 'L', 'l': 'L', 'litre': 'L', 'litres': 'L', 'ml': 'mL',
      'pkt': 'packet', 'packet': 'packet', 'packets': 'packet', 'box': 'box', 'boxes': 'box',
      'ctn': 'carton', 'carton': 'carton', 'bag': 'bag', 'bags': 'bag', 'bottle': 'bottle', 'bottles': 'bottle',
      'm': 'm', 'metre': 'm', 'meter': 'm', 'cm': 'cm', 'sq m': 'sq m', 'sq ft': 'sq ft'
    };
    if (map[clean]) {
      return { text: map[clean], isCustom: false };
    }
    return { text: rawUnit, isCustom: true };
  };

  // Recalculate line arithmetic locally
  const recalculateLineMath = (item, isTaxInclusive = false) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unit_price) || 0;
    const basis = Number(item.price_unit_quantity) > 0 ? Number(item.price_unit_quantity) : 1;
    const disc = Number(item.discount_amount) || 0;
    const gstRate = Number(item.gst_rate) || 0;

    let taxable = 0;
    let taxAmt = 0;
    let total = 0;

    if (isTaxInclusive) {
      // In tax-inclusive mode (e.g. MRP rates), rate already includes GST
      const gross = Math.max(0, ((qty / basis) * rate) - disc);
      total = parseFloat(gross.toFixed(2));
      if (gstRate > 0) {
        taxable = parseFloat((gross / (1 + gstRate / 100)).toFixed(2));
        taxAmt = parseFloat((gross - taxable).toFixed(2));
      } else {
        taxable = gross;
        taxAmt = 0;
      }
    } else {
      // Pre-tax rate mode
      const preTax = (qty / basis) * rate;
      taxable = Math.max(0, parseFloat((preTax - disc).toFixed(2)));
      taxAmt = parseFloat((taxable * (gstRate / 100)).toFixed(2));
      total = parseFloat((taxable + taxAmt).toFixed(2));
    }

    const cgst = parseFloat((taxAmt / 2).toFixed(2));
    const sgst = parseFloat((taxAmt / 2).toFixed(2));
    const norm = getNormalizedUnitBadge(item.unit_original);

    return {
      ...item,
      taxable_value: taxable,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: 0,
      line_total: total,
      unit_normalized: norm.text,
      unit_flagged: norm.isCustom,
      calculation_valid: true
    };
  };

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    let it = { ...updated[index], [field]: value };

    // Auto-recalculate if math fields changed
    if (['quantity', 'unit_price', 'price_unit_quantity', 'discount_amount', 'gst_rate', 'unit_original'].includes(field)) {
      it = recalculateLineMath(it, invoiceHeader.isTaxInclusive);
    }

    updated[index] = it;
    setItems(updated);
    recalculateDocumentTotals(updated);
  };

  // Add Item Row
  const handleAddItemRow = () => {
    const newItem = recalculateLineMath({
      line_number: items.length + 1,
      item_name: 'New Line Item',
      item_description: '',
      sku: '',
      hsn_code: '',
      category: 'Other',
      categoryId: null,
      quantity: 1,
      unit_original: 'pcs',
      unit_normalized: 'pcs',
      unit_flagged: false,
      unit_price: 0,
      price_unit_quantity: 1,
      price_unit_measure: 'pcs',
      discount_amount: 0,
      taxable_value: 0,
      gst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      line_total: 0,
      calculation_valid: true,
      confidence: 1.0
    }, invoiceHeader.isTaxInclusive);

    const updated = [...items, newItem];
    setItems(updated);
    recalculateDocumentTotals(updated);
    toastSuccess('New line item added.');
  };

  // Duplicate Item Row
  const handleDuplicateRow = (index) => {
    const source = items[index];
    const clone = recalculateLineMath({
      ...source,
      item_name: `${source.item_name} (Copy)`,
      line_number: items.length + 1
    }, invoiceHeader.isTaxInclusive);
    const updated = [...items];
    updated.splice(index + 1, 0, clone);
    setItems(updated);
    recalculateDocumentTotals(updated);
    toastSuccess(`Duplicated item #${index + 1}.`);
  };

  // Remove Item Row
  const handleRemoveRow = (index) => {
    if (items.length <= 1) {
      toastWarning('An invoice must have at least one line item.');
      return;
    }
    const updated = items.filter((_, i) => i !== index).map((it, idx) => ({
      ...it,
      line_number: idx + 1
    }));
    setItems(updated);
    recalculateDocumentTotals(updated);
  };

  // Toggle Tax Inclusive / Exclusive mode
  const handleToggleTaxMode = () => {
    const newTaxInclusive = !invoiceHeader.isTaxInclusive;
    const recomputedItems = items.map(it => recalculateLineMath(it, newTaxInclusive));
    setItems(recomputedItems);
    recalculateDocumentTotals(recomputedItems, { isTaxInclusive: newTaxInclusive });
    toastSuccess(newTaxInclusive ? 'Switched to Tax-Inclusive pricing (MRP)' : 'Switched to Tax-Exclusive pricing (GST added)');
  };

  // Recalculate document totals across items
  const recalculateDocumentTotals = (currentItems, headerOverrides = {}) => {
    const isTaxInclusive = headerOverrides.isTaxInclusive !== undefined
      ? Boolean(headerOverrides.isTaxInclusive)
      : Boolean(invoiceHeader.isTaxInclusive);

    let subtotal = 0;
    let itemDiscounts = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let itemsTotal = 0;

    currentItems.forEach((it) => {
      const basis = Number(it.price_unit_quantity) > 0 ? Number(it.price_unit_quantity) : 1;
      subtotal += ((Number(it.quantity) || 0) / basis) * (Number(it.unit_price) || 0);
      itemDiscounts += Number(it.discount_amount) || 0;
      cgst += Number(it.cgst_amount) || 0;
      sgst += Number(it.sgst_amount) || 0;
      igst += Number(it.igst_amount) || 0;
      itemsTotal += Number(it.line_total) || 0;
    });

    if (currentItems.length === 0 || subtotal === 0) {
      subtotal = headerOverrides.subtotal !== undefined
        ? Number(headerOverrides.subtotal)
        : (Number(invoiceHeader.subtotal) || 0);
    }

    const headerDisc = headerOverrides.discount !== undefined
      ? Number(headerOverrides.discount)
      : (Number(invoiceHeader.discount) || 0);

    const effectiveDiscount = itemDiscounts > 0 ? itemDiscounts : headerDisc;
    
    // Effective taxable
    let effectiveTaxable;
    if (isTaxInclusive) {
      const gross = Math.max(0, subtotal - effectiveDiscount);
      const taxSum = cgst + sgst + igst;
      effectiveTaxable = Math.max(0, parseFloat((gross - taxSum).toFixed(2)));
    } else {
      effectiveTaxable = Math.max(0, parseFloat((subtotal - effectiveDiscount).toFixed(2)));
    }
    
    // Tax calculation: line items tax, or header override / preset
    let totalTax = parseFloat((cgst + sgst + igst).toFixed(2));
    if (headerOverrides.tax !== undefined) {
      totalTax = Number(headerOverrides.tax) || 0;
      cgst = parseFloat((totalTax / 2).toFixed(2));
      sgst = parseFloat((totalTax / 2).toFixed(2));
      igst = 0;
    } else if (headerOverrides.gstRate !== undefined) {
      const gRate = Number(headerOverrides.gstRate) || 0;
      totalTax = parseFloat((effectiveTaxable * (gRate / 100)).toFixed(2));
      cgst = parseFloat((totalTax / 2).toFixed(2));
      sgst = parseFloat((totalTax / 2).toFixed(2));
      igst = 0;
    } else if (totalTax === 0 && Number(invoiceHeader.tax) > 0) {
      totalTax = Number(invoiceHeader.tax);
      if (cgst === 0 && sgst === 0 && igst === 0) {
        cgst = parseFloat((totalTax / 2).toFixed(2));
        sgst = parseFloat((totalTax / 2).toFixed(2));
      }
    }

    const otherCharges = headerOverrides.otherCharges !== undefined
      ? Number(headerOverrides.otherCharges)
      : (Number(invoiceHeader.otherCharges) || 0);

    const freightCharges = headerOverrides.freightCharges !== undefined
      ? Number(headerOverrides.freightCharges)
      : (Number(invoiceHeader.freightCharges) || 0);

    const roundOff = headerOverrides.roundOff !== undefined
      ? Number(headerOverrides.roundOff)
      : (Number(invoiceHeader.roundOff) || 0);

    // Final Grand Total
    let finalTotal;
    if (headerOverrides.total !== undefined) {
      finalTotal = Math.max(0, parseFloat(Number(headerOverrides.total).toFixed(2)));
    } else if (isTaxInclusive) {
      finalTotal = Math.max(0, parseFloat((subtotal - effectiveDiscount + otherCharges + freightCharges + roundOff).toFixed(2)));
    } else {
      finalTotal = Math.max(0, parseFloat((effectiveTaxable + totalTax + otherCharges + freightCharges + roundOff).toFixed(2)));
    }

    const advancePaid = headerOverrides.advancePaid !== undefined
      ? Number(headerOverrides.advancePaid)
      : (Number(invoiceHeader.advancePaid) || 0);

    const amountPaid = headerOverrides.amountPaid !== undefined
      ? Number(headerOverrides.amountPaid)
      : (invoiceHeader.amountPaid !== undefined ? Number(invoiceHeader.amountPaid) : Number(invoiceHeader.paid || 0));

    let outstandingBalance;
    if (headerOverrides.outstandingBalance !== undefined) {
      outstandingBalance = Math.max(0, parseFloat(Number(headerOverrides.outstandingBalance).toFixed(2)));
    } else {
      outstandingBalance = Math.max(0, parseFloat((finalTotal - advancePaid - amountPaid).toFixed(2)));
    }

    setInvoiceHeader((prev) => ({
      ...prev,
      isTaxInclusive,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxableAmount: effectiveTaxable,
      discount: parseFloat(effectiveDiscount.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      tax: totalTax,
      total_gst: totalTax,
      otherCharges,
      freightCharges,
      roundOff,
      total: finalTotal,
      advancePaid,
      paid: amountPaid,
      amountPaid,
      outstandingBalance
    }));
  };

  // Server-side recalculate review
  const handleServerRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const payload = {
        invoice: {
          ...invoiceHeader,
          grand_total: invoiceHeader.total,
          total_gst: invoiceHeader.tax,
          other_charges: invoiceHeader.otherCharges,
          freight_charges: invoiceHeader.freightCharges,
          round_off: invoiceHeader.roundOff,
          advance_paid: invoiceHeader.advancePaid,
          amount_paid: invoiceHeader.amountPaid,
          paid: invoiceHeader.amountPaid,
          outstanding_balance: invoiceHeader.outstandingBalance,
          is_tax_inclusive: invoiceHeader.isTaxInclusive
        },
        items: items,
        vendor: vendorSelectionMode === 'existing' ? { id: selectedVendorId } : vendorData,
        buyer: buyerData
      };

      const res = await invoiceApi.recalculateReview(payload);
      if (res.data) {
        if (res.data.items) setItems(res.data.items);
        if (res.data.invoice) {
          const adv = res.data.invoice.advance_paid !== undefined ? Number(res.data.invoice.advance_paid) : invoiceHeader.advancePaid;
          const pmt = res.data.invoice.amount_paid !== undefined ? Number(res.data.invoice.amount_paid) : (res.data.invoice.paid !== undefined ? Number(res.data.invoice.paid) : invoiceHeader.amountPaid);
          const bal = res.data.invoice.outstanding_balance !== undefined
            ? Number(res.data.invoice.outstanding_balance)
            : Math.max(0, parseFloat((res.data.invoice.grand_total - adv - pmt).toFixed(2)));

          setInvoiceHeader((prev) => ({
            ...prev,
            subtotal: res.data.invoice.subtotal,
            discount: res.data.invoice.discount,
            taxableAmount: res.data.invoice.taxable_amount,
            cgst: res.data.invoice.cgst,
            sgst: res.data.invoice.sgst,
            igst: res.data.invoice.igst,
            tax: res.data.invoice.total_gst,
            total: res.data.invoice.grand_total,
            advancePaid: adv,
            amountPaid: pmt,
            paid: pmt,
            outstandingBalance: bal,
            isTaxInclusive: res.data.invoice.is_tax_inclusive !== undefined ? Boolean(res.data.invoice.is_tax_inclusive) : prev.isTaxInclusive
          }));
        }
        if (res.data.reconciliation) setReconciliation(res.data.reconciliation);
        if (res.data.warnings) setWarnings(res.data.warnings);
        toastSuccess('Reconciliation and arithmetic checked!');
      }
    } catch (err) {
      toastError(err.message || 'Recalculation error');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Save Confirmed Invoice
  const handleSaveInvoice = async (bypassDuplicateCheck = false) => {
    if (!invoiceHeader.invoiceNumber.trim()) {
      toastError('Invoice number is required.');
      return;
    }

    if (vendorSelectionMode === 'existing' && !selectedVendorId) {
      toastError('Please select a supplier from the list or create a new one.');
      return;
    }

    if (vendorSelectionMode === 'new' && !vendorData.vendor_name.trim()) {
      toastError('Supplier name is required.');
      return;
    }

    // Dynamic duplicate verification before saving
    if (!bypassDuplicateCheck) {
      try {
        const effectiveVendorId = vendorSelectionMode === 'existing' ? selectedVendorId : null;
        const effectiveVendorName = vendorSelectionMode === 'existing'
          ? vendorsList.find(v => String(v.id) === String(selectedVendorId))?.vendor_name
          : vendorData?.vendor_name;

        const checkRes = await invoiceApi.checkDuplicate({
          invoiceNumber: invoiceHeader.invoiceNumber.trim(),
          vendorId: effectiveVendorId,
          vendorName: effectiveVendorName,
          invoiceDate: invoiceHeader.invoiceDate,
          grandTotal: invoiceHeader.total
        });

        if (checkRes.data?.isDuplicate) {
          setDuplicateInfo(checkRes.data);
          setShowDuplicateModal(true);
          return;
        } else {
          setDuplicateInfo(null);
        }
      } catch (err) {
        console.warn('Pre-save duplicate check warning:', err);
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoice: {
          invoice_number: invoiceHeader.invoiceNumber,
          invoice_date: invoiceHeader.invoiceDate,
          due_date: invoiceHeader.dueDate,
          po_number: invoiceHeader.poNumber,
          place_of_supply: invoiceHeader.placeOfSupply,
          currency: invoiceHeader.currency,
          payment_terms: invoiceHeader.paymentTerms,
          payment_method: invoiceHeader.paymentMethod,
          category: invoiceHeader.category,
          subtotal: invoiceHeader.subtotal,
          discount: invoiceHeader.discount,
          taxable_amount: invoiceHeader.taxableAmount,
          tax: invoiceHeader.tax,
          cgst: invoiceHeader.cgst,
          sgst: invoiceHeader.sgst,
          igst: invoiceHeader.igst,
          total_gst: invoiceHeader.tax,
          freight_charges: invoiceHeader.freightCharges,
          other_charges: invoiceHeader.otherCharges,
          round_off: invoiceHeader.roundOff,
          total: invoiceHeader.total,
          grand_total: invoiceHeader.total,
          advance_paid: invoiceHeader.advancePaid,
          paid: invoiceHeader.amountPaid,
          amount_paid: invoiceHeader.amountPaid,
          outstanding_balance: invoiceHeader.outstandingBalance,
          is_tax_inclusive: invoiceHeader.isTaxInclusive,
          pdf_path: extractedData.file?.storedPath,
          ocr_text: extractedData.ocr?.rawText,
          status: invoiceHeader.status || 'Pending Approval'
        },
        items: items.map((it, idx) => ({
          line_number: idx + 1,
          item_name: it.item_name,
          item_description: it.item_description,
          sku: it.sku,
          hsn_code: it.hsn_code,
          category: it.category,
          category_id: it.categoryId,
          quantity: it.quantity,
          unit: it.unit_normalized || it.unit_original || 'pcs',
          unit_original: it.unit_original,
          unit_normalized: it.unit_normalized,
          unit_price: it.unit_price,
          price_unit_quantity: it.price_unit_quantity,
          price_unit_measure: it.price_unit_measure,
          discount_amount: it.discount_amount,
          taxable_value: it.taxable_value,
          gst_rate: it.gst_rate,
          cgst_amount: it.cgst_amount,
          sgst_amount: it.sgst_amount,
          igst_amount: it.igst_amount,
          line_total: it.line_total,
          calculation_valid: it.calculation_valid ? 1 : 0,
          unit_flagged: it.unit_flagged ? 1 : 0,
          classification_confidence: it.confidence || 1.0
        })),
        vendor: vendorSelectionMode === 'existing' ? { id: selectedVendorId } : vendorData,
        buyer: buyerData,
        aiLog: extractedData.aiLog || null,
        userId: user?.id || null,
        userRole: user?.role || (isOwner ? 'owner' : 'staff'),
        created_by_user_id: user?.id || null
      };

      const res = await invoiceApi.save(payload);
      toastSuccess(`Invoice #${invoiceHeader.invoiceNumber} confirmed & saved!`);
      if (broadcastUpdate) broadcastUpdate();
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      toastError(err.message || 'Failed to save invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-4 pb-20 px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <span>Invoice Review & Reconciliation</span>
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ready for Review</span>
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Vision Active (All Devices)</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side verification: Compare extracted line items against the original document, adjust units, and confirm.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDocumentViewer(!showDocumentViewer)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              showDocumentViewer
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{showDocumentViewer ? 'Hide Document' : 'Show Document'}</span>
          </button>

          <button
            type="button"
            onClick={handleServerRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            <Calculator className={`w-4 h-4 text-indigo-600 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>{isRecalculating ? 'Checking...' : 'Recalculate Math'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition"
            title="Upload a different PDF invoice"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Upload Other PDF</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition"
            title="Discard this invoice draft"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Discard Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveInvoice(false)}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition active:scale-[0.98] disabled:opacity-50 ${
              isOwner
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {isSubmitting ? <Spinner size="xs" variant="white" /> : <Save className="w-4 h-4" />}
            <span>{isSubmitting ? 'Saving...' : 'Confirm & Save'}</span>
          </button>
        </div>
      </div>

      {/* Warnings & Discrepancies Alert Banner */}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowWarningsList(!showWarningsList)}>
            <div className="flex items-center gap-2.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{warnings.length} Verification Notice(s) Detected</span>
            </div>
            <button className="text-amber-700 hover:underline flex items-center gap-1">
              <span>{showWarningsList ? 'Hide Details' : 'View Details'}</span>
              {showWarningsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          {showWarningsList && (
            <ul className="mt-3 space-y-1.5 pl-6 list-disc border-t border-amber-200/60 pt-2 text-amber-800">
              {warnings.map((w, idx) => (
                <li key={idx} className="leading-relaxed">{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Duplicate Warning Callout */}
      {duplicateInfo?.isDuplicate && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 text-xs text-rose-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Possible Duplicate Invoice Registered</p>
              <p className="text-rose-700 mt-0.5">{duplicateInfo.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDuplicateModal(true)}
            className="px-3 py-1.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition"
          >
            Review Duplicate
          </button>
        </div>
      )}

      {/* Datalist for Supported Measurement Units Autocomplete */}
      <datalist id="commonUnitsList">
        {supportedUnitsList.map((u, i) => (
          <option key={i} value={u.code}>{u.name} ({u.category})</option>
        ))}
        <option value="kg">kg (Kilogram)</option>
        <option value="g">g (Gram)</option>
        <option value="pcs">pcs (Pieces)</option>
        <option value="units">units (Units)</option>
        <option value="nos">nos (Numbers)</option>
        <option value="each">each</option>
        <option value="dozen">dozen (12 pcs)</option>
        <option value="L">L (Litre)</option>
        <option value="mL">mL (Millilitre)</option>
        <option value="packet">packet (PKT)</option>
        <option value="box">box</option>
        <option value="carton">carton (CTN)</option>
        <option value="bottle">bottle</option>
        <option value="can">can</option>
        <option value="sack">sack</option>
        <option value="bag">bag</option>
        <option value="bundle">bundle</option>
        <option value="m">m (Metre)</option>
        <option value="hour">hour</option>
      </datalist>

      {/* MAIN SIDE-BY-SIDE SPLIT SCREEN WORKSPACE */}
      <div className={`grid grid-cols-1 ${showDocumentViewer ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 items-start`}>
        
        {/* LEFT PANE: Interactive Document Viewer */}
        {showDocumentViewer && (
          <div className="lg:col-span-5 xl:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden static lg:sticky lg:top-4 flex flex-col h-80 sm:h-96 lg:h-[calc(100vh-140px)] min-h-[260px] lg:min-h-[600px]">
            {/* Viewer Controls Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs border-b border-slate-800">
              <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs">
                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="font-semibold truncate" title={extractedData.file?.fileName}>
                  {extractedData.file?.fileName || 'Invoice Document'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentZoom((z) => Math.max(0.5, z - 0.15))}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-300 w-11 text-center">
                  {Math.round(documentZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setDocumentZoom((z) => Math.min(2.5, z + 0.15))}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentZoom(1.0)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300"
                >
                  Reset
                </button>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Viewer Screen Frame */}
            <div className="flex-1 bg-slate-100 overflow-auto relative">
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#zoom=${Math.round(documentZoom * 100)}`}
                  className="w-full h-full border-0"
                  title="Invoice Document Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={fileUrl}
                    alt="Invoice Preview"
                    style={{ transform: `scale(${documentZoom})`, transformOrigin: 'top center' }}
                    className="shadow-lg rounded-xl max-w-full transition-transform duration-100"
                  />
                </div>
              )}
            </div>

            {/* Viewer Footer Status */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Pages: {extractedData.ocr?.pageCount || 1} • Format: {isPdf ? 'PDF' : 'Image'}</span>
              <span className="text-emerald-700 font-semibold">Ready for review</span>
            </div>
          </div>
        )}

        {/* RIGHT PANE: Structured Data Cards & Dynamic Line Items Table */}
        <div className={`${showDocumentViewer ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'} space-y-5`}>
          
          {/* Section 1: Supplier & Buyer Cards in 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Supplier / Vendor Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Supplier Information</h3>
                </div>
                
                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setVendorSelectionMode('existing')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      vendorSelectionMode === 'existing' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorSelectionMode('new')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      vendorSelectionMode === 'new' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    New Supplier
                  </button>
                </div>
              </div>

              {vendorSelectionMode === 'existing' ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-1">Select Supplier</label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => {
                        const vId = e.target.value;
                        setSelectedVendorId(vId);
                        const matched = vendorsList.find((v) => String(v.id) === String(vId));
                        if (matched) {
                          setVendorData({
                            vendor_name: matched.vendor_name,
                            vendor_type: matched.vendor_type || 'General Supplier',
                            gstin: matched.gstin || '',
                            address: matched.address || '',
                            contact: matched.contact || '',
                            email: matched.email || '',
                            notes: matched.notes || ''
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
                    >
                      <option value="">-- Choose registered supplier --</option>
                      {vendorsList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendor_name} {v.gstin ? `(${v.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {vendorData.gstin && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      GSTIN: <span className="font-mono font-bold text-slate-800">{vendorData.gstin}</span> • {vendorData.address}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Supplier Company Name *</label>
                    <input
                      type="text"
                      value={vendorData.vendor_name}
                      onChange={(e) => setVendorData({ ...vendorData, vendor_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                      placeholder="e.g. FreshMart Suppliers Pvt Ltd"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">GSTIN</label>
                      <input
                        type="text"
                        value={vendorData.gstin}
                        onChange={(e) => setVendorData({ ...vendorData, gstin: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                        placeholder="27AABCU9603R1ZM"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Supplier Category</label>
                      <input
                        type="text"
                        value={vendorData.vendor_type}
                        onChange={(e) => setVendorData({ ...vendorData, vendor_type: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Address</label>
                    <input
                      type="text"
                      value={vendorData.address}
                      onChange={(e) => setVendorData({ ...vendorData, address: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                      placeholder="Street, City, State, PIN"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Buyer Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Buyer (Billed To)</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Recipient</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Buyer Company / Name</label>
                  <input
                    type="text"
                    value={buyerData.company_name}
                    onChange={(e) => setBuyerData({ ...buyerData, company_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                    placeholder="e.g. Metro Retail Supermarket"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Buyer GSTIN</label>
                  <input
                    type="text"
                    value={buyerData.gstin}
                    onChange={(e) => setBuyerData({ ...buyerData, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                    placeholder="27AAGCB2026M1ZR"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-semibold mb-0.5">Billing Address</label>
                  <input
                    type="text"
                    value={buyerData.billing_address}
                    onChange={(e) => setBuyerData({ ...buyerData, billing_address: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                    placeholder="Buyer address"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Metadata Header Fields */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Invoice Details</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">Invoice Number *</label>
                <input
                  type="text"
                  value={invoiceHeader.invoiceNumber}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceHeader.invoiceDate}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">Due Date</label>
                <input
                  type="date"
                  value={invoiceHeader.dueDate}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, dueDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">PO Number</label>
                <input
                  type="text"
                  value={invoiceHeader.poNumber}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, poNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                  placeholder="PO-2026-001"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={invoiceHeader.placeOfSupply}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, placeOfSupply: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                  placeholder="State / Code"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">Currency</label>
                <select
                  value={invoiceHeader.currency}
                  onChange={(e) => setInvoiceHeader({ ...invoiceHeader, currency: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-semibold"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Items Table with Multi-Unit Support */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Line Items & Dynamic Measurement Units ({items.length} items)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatic unit detection per line item. Supports mixed units (kg, pcs, L, packet, box) and pricing bases.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-semibold text-xs shadow-xs transition ${
                  isOwner
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Scrollable Editable Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[190px]">Item Name & Description</th>
                    <th className="py-2.5 px-3 min-w-[110px] w-28 text-center bg-indigo-50/70 text-indigo-950 font-black border-x border-indigo-200/50">
                      Quantity
                    </th>
                    <th className="py-2.5 px-3 min-w-[115px] w-32">Unit (Detected)</th>
                    <th className="py-2.5 px-3 min-w-[95px] w-24 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Pricing Basis</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Category</th>
                    <th className="py-2.5 px-3 w-20 text-right">Disc (₹)</th>
                    <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-2.5 px-3 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const normBadge = getNormalizedUnitBadge(item.unit_original);
                    return (
                      <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                        {/* Line number */}
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-center">
                          {index + 1}
                        </td>

                        {/* Item Name & Details */}
                        <td className="py-2.5 px-3 space-y-1">
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
                            placeholder="Item name"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.hsn_code || ''}
                              onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                              className="w-24 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500"
                              placeholder="HSN Code"
                              title="HSN Code"
                            />
                            <input
                              type="text"
                              value={item.sku || ''}
                              onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                              className="w-24 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500"
                              placeholder="SKU"
                              title="SKU"
                            />
                          </div>
                        </td>

                        {/* Quantity (prominently displayed with badge) */}
                        <td className="py-2.5 px-3 min-w-[110px] w-28 bg-indigo-50/20 border-x border-indigo-100/50">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 font-mono font-black text-slate-900 text-sm text-center bg-white shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="1"
                            />
                          </div>
                          {/* Clear, unmistakable visual quantity indicator */}
                          <div className="text-center mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-indigo-800 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-md shadow-2xs">
                              <span className="text-indigo-500 font-normal">Qty:</span>
                              <span className="text-indigo-950 font-black">{item.quantity ?? 1}</span>
                              <span className="text-indigo-600">{item.unit_original || item.unit_normalized || 'pcs'}</span>
                            </span>
                          </div>
                        </td>

                        {/* Unit: Original + Live Normalized Tag */}
                        <td className="py-2.5 px-3 space-y-1">
                          <input
                            type="text"
                            list="commonUnitsList"
                            value={item.unit_original}
                            onChange={(e) => handleItemChange(index, 'unit_original', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-medium text-xs uppercase"
                            placeholder="kg, pcs, L..."
                          />
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              normBadge.isCustom
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              norm: {normBadge.text}
                            </span>
                            {normBadge.isCustom && (
                              <span className="text-[9px] text-amber-600 font-bold" title="Unfamiliar or custom supplier unit">
                                (custom)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Unit Price (Rate) */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 text-xs text-right"
                          />
                        </td>

                        {/* Pricing Basis (e.g. per 1 kg, or per 100 pcs) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span>per</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.price_unit_quantity || 1}
                              onChange={(e) => handleItemChange(index, 'price_unit_quantity', e.target.value)}
                              className="w-12 px-1.5 py-1 rounded border border-slate-200 font-mono text-center text-xs"
                              title="Quantity basis for price"
                            />
                            <span className="font-semibold text-slate-700">{normBadge.text}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.category || 'Other'}
                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] bg-white font-medium"
                          >
                            {categoriesList.map((c) => (
                              <option key={c.id} value={c.category_name}>{c.category_name}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                          {item.confidence && item.confidence < 0.7 && (
                            <span className="text-[10px] text-amber-600 block mt-0.5">⚠️ Low AI conf</span>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.discount_amount}
                            onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs text-right font-mono"
                          />
                        </td>

                        {/* GST % & GST Amount */}
                        <td className="py-2.5 px-3 min-w-[105px]">
                          <select
                            value={item.gst_rate}
                            onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border border-slate-200 text-xs bg-white font-mono font-semibold"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                          {Number(item.gst_rate) > 0 && (
                            <div className="mt-1 flex items-center justify-between text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold border border-indigo-100">
                              <span>GST:</span>
                              <span>+{formatCurrency(Number(item.cgst_amount || 0) + Number(item.sgst_amount || 0) + Number(item.igst_amount || 0) || Number(item.tax || 0))}</span>
                            </div>
                          )}
                        </td>

                        {/* Line Total & Taxable */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-bold text-slate-900 text-xs font-mono">
                            {formatCurrency(item.line_total)}
                          </div>
                          {Number(item.gst_rate) > 0 && (
                            <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                              Taxable: {formatCurrency(item.taxable_value)}
                            </div>
                          )}
                          <span className={`text-[9px] font-semibold px-1 py-0.2 rounded inline-block mt-0.5 ${
                            item.calculation_valid
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}>
                            {item.calculation_valid ? '✓ Valid' : '⚠️ Review'}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(index)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Duplicate row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Document Financial Totals & Balance Reconciliation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Financial Totals & Balance Reconciliation</h3>
              </div>

              {/* Tax Mode and Balance status pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleTaxMode}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border transition flex items-center gap-1.5 ${
                    invoiceHeader.isTaxInclusive
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="Toggle whether unit prices already include GST or GST is added on top"
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{invoiceHeader.isTaxInclusive ? 'Tax-Inclusive (MRP Rates)' : 'Tax-Exclusive (+ GST Added)'}</span>
                </button>

                {reconciliation?.isBalanced ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Balanced & Verified</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Difference: ₹{reconciliation?.summary?.discrepancyDiff || 0}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Items Subtotal</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(invoiceHeader.subtotal)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Discount</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-emerald-600 font-bold text-xs">- ₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.discount}
                    onChange={(e) => {
                      const discVal = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { discount: discVal });
                    }}
                    className="w-20 px-1 py-0.5 rounded border border-slate-300 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Taxable Value</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(invoiceHeader.taxableAmount)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total GST (Tax)</span>
                  {invoiceHeader.tax > 0 && invoiceHeader.taxableAmount > 0 && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded font-mono">
                      {Math.round((invoiceHeader.tax / invoiceHeader.taxableAmount) * 100)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-indigo-700 font-bold text-xs">{invoiceHeader.isTaxInclusive ? 'incl. ₹' : '+ ₹'}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.tax}
                    onChange={(e) => {
                      const taxVal = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { tax: taxVal });
                    }}
                    className="w-20 px-1 py-0.5 rounded border border-slate-300 text-xs font-mono font-bold text-indigo-700"
                    title="Total GST Amount"
                  />
                </div>
                {(invoiceHeader.cgst > 0 || invoiceHeader.sgst > 0) ? (
                  <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                    CGST: ₹{invoiceHeader.cgst} | SGST: ₹{invoiceHeader.sgst}
                  </span>
                ) : invoiceHeader.igst > 0 ? (
                  <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                    IGST: ₹{invoiceHeader.igst}
                  </span>
                ) : (
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">
                    No GST
                  </span>
                )}
                {/* Quick GST % Presets */}
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-200/60">
                  <span className="text-[9px] text-slate-400">Add:</span>
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => recalculateDocumentTotals(items, { gstRate: rate })}
                      className="px-1 py-0.2 text-[9px] rounded font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                      title={`Apply ${rate}% GST`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Freight / Hamali</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-slate-500 font-bold text-xs">+ ₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.freightCharges || 0}
                    onChange={(e) => {
                      const fc = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { freightCharges: fc });
                    }}
                    className="w-16 px-1 py-0.5 rounded border border-slate-300 text-xs font-mono"
                    title="Freight / Hamali / Delivery Charges"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Round-off</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceHeader.roundOff}
                    onChange={(e) => {
                      const ro = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { roundOff: ro });
                    }}
                    className="w-16 px-1 py-0.5 rounded border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200">
                <span className="text-indigo-600 text-[10px] uppercase font-black block">Grand Total</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-bold text-indigo-700 text-xs">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.total}
                    onChange={(e) => {
                      const tVal = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { total: tVal });
                    }}
                    className="w-24 px-1 py-0.5 rounded border border-indigo-200 text-sm font-mono font-black text-indigo-700 bg-white"
                    title="Edit Grand Total"
                  />
                </div>
              </div>
            </div>

            {/* Payment Settlement & Pending Balance */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/50 p-3 rounded-xl">
              <div className="flex items-center gap-4 flex-wrap">
                {invoiceHeader.paymentMethod && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Method: <strong className="text-slate-800">{invoiceHeader.paymentMethod}</strong></span>
                  </div>
                )}
                {invoiceHeader.paymentTerms && (
                  <div className="text-slate-600">
                    <span>Terms: <strong className="text-slate-800">{invoiceHeader.paymentTerms}</strong></span>
                  </div>
                )}
                {invoiceHeader.category && (
                  <div className="text-slate-600">
                    <span>Category: <strong className="text-slate-800">{invoiceHeader.category}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="font-semibold text-slate-500">Advance Paid: ₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.advancePaid}
                    onChange={(e) => {
                      const advVal = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { advancePaid: advVal });
                    }}
                    className="w-20 px-1.5 py-0.5 rounded border border-slate-300 text-xs font-mono font-bold text-slate-800"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="font-semibold text-emerald-700">Amount Paid: ₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={invoiceHeader.amountPaid}
                    onChange={(e) => {
                      const paidVal = parseFloat(e.target.value) || 0;
                      recalculateDocumentTotals(items, { amountPaid: paidVal });
                    }}
                    className="w-20 px-1.5 py-0.5 rounded border border-slate-300 text-xs font-mono font-bold text-emerald-700"
                    placeholder="0.00"
                  />
                </div>

                <div className="text-slate-600 font-semibold px-2">
                  <span>Total Paid: </span>
                  <strong className="font-mono text-slate-800">{formatCurrency(Number(invoiceHeader.advancePaid || 0) + Number(invoiceHeader.amountPaid || 0))}</strong>
                </div>

                <div className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                  invoiceHeader.outstandingBalance === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  <span>Balance Due: </span>
                  <span className="font-mono text-sm">{formatCurrency(invoiceHeader.outstandingBalance)}</span>
                  {invoiceHeader.outstandingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const fullPay = Math.max(0, invoiceHeader.total - invoiceHeader.advancePaid);
                        recalculateDocumentTotals(items, { amountPaid: fullPay, outstandingBalance: 0 });
                      }}
                      className="ml-1 text-[10px] px-1.5 py-0.5 bg-white text-amber-900 hover:bg-amber-200 rounded border border-amber-300 transition"
                      title="Set Amount Paid to full balance"
                    >
                      Settle Full
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{items.length} line items ready.</span> Saved transactionally into PostgreSQL schema.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => handleSaveInvoice(false)}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition active:scale-[0.98] disabled:opacity-50 ${
                  isOwner
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {isSubmitting ? <Spinner size="xs" variant="white" /> : <Save className="w-4 h-4" />}
                <span>{isSubmitting ? 'Saving Invoice...' : 'Confirm & Save Invoice'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      <RawOcrViewerModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        ocrData={extractedData.ocr}
      />

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        duplicateInfo={duplicateInfo}
        onSaveAnyway={() => {
          setShowDuplicateModal(false);
          handleSaveInvoice(true);
        }}
      />

      <VendorCreateModal
        isOpen={showCreateVendorModal}
        onClose={() => setShowCreateVendorModal(false)}
        initialData={vendorData}
        vendorTypes={vendorTypesList}
        onVendorCreated={(newV) => {
          setVendorsList((prev) => [...prev, newV]);
          setSelectedVendorId(newV.id);
          setVendorSelectionMode('existing');
        }}
      />
    </div>
  );
}
