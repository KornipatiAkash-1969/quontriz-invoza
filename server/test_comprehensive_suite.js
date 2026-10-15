const db = require('./database/db');
const { getIstIsoString } = require('./utils/dateTime');

const BASE_URL = 'http://localhost:5000/api';

async function req(url, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json', 'x-test-suite': 'true' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE NOTIFICATION & CALCULATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PART 1: AUTHENTICATION & BASELINE
    // -------------------------------------------------------------
    console.log('--- 1. AUTHENTICATION & ROLE-BASED ACCESS ---');
    const ownerAuth = await req('/auth/login', 'POST', {
      email: 'developer@gmail.com',
      password: 'developer123',
      portalRole: 'owner'
    });
    const ownerToken = ownerAuth.token;
    assert(!!ownerToken && ownerAuth.user.role === 'owner', 'Owner authenticated with role "owner"');

    // Create a temporary staff member for notification cycle testing
    const tempStaffEmail = 'temp.staff.suite@gmail.com';
    let tempStaffUser = await db.get('SELECT id FROM users WHERE email = ?', [tempStaffEmail]);
    if (!tempStaffUser) {
      const createdStaff = await req('/auth/users', 'POST', {
        name: 'Suite Staff',
        email: tempStaffEmail,
        password: 'staffpassword123',
        role: 'staff',
        skipOtp: true
      }, ownerToken);
      tempStaffUser = createdStaff.user;
    }

    const staffAuth = await req('/auth/login', 'POST', {
      email: tempStaffEmail,
      password: 'staffpassword123',
      portalRole: 'staff'
    });
    const staffToken = staffAuth.token;
    assert(!!staffToken && staffAuth.user.role === 'staff', 'Staff authenticated with role "staff"');

    // Reset baseline
    await req('/notifications/mark-all-read', 'POST', {}, ownerToken);
    await req('/notifications/mark-all-read', 'POST', {}, staffToken);

    // -------------------------------------------------------------
    // PART 2: NOTIFICATIONS SYSTEM (STAFF & OWNER CYCLES)
    // -------------------------------------------------------------
    console.log('\n--- 2. NOTIFICATIONS SYSTEM VERIFICATION ---');

    // 2a. Staff creates requirement -> Owner receives persistent notification & badge
    const reqRes = await req('/requirements', 'POST', {
      item_name: 'Super Premium Basmati Rice',
      specification: '25 KG Bag',
      quantity: 10,
      unit: 'bags',
      priority: 'High',
      notes: 'Store inventory replenishment request'
    }, staffToken);

    const testReqId = reqRes.data.id;
    assert(!!testReqId, `Staff created requirement #${testReqId}`);

    // Verify Owner gets notification
    const ownerUpdatesAfterReq = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerUpdatesAfterReq.data.requirementsRouteBadge >= 1, `Owner requirements badge incremented (>= 1)`);
    assert(ownerUpdatesAfterReq.data.totalUpdatesCount >= 1, `Owner totalUpdatesCount reflects pending items`);

    // Verify Staff does NOT receive notification for their own action
    const staffUpdatesAfterOwnReq = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffUpdatesAfterOwnReq.data.requirementsRouteBadge === 0, `Staff requirements badge is 0 (own action)`);

    // Verify notifications table has persistent record with IST timestamp
    const ownerNotifs = await req('/notifications?limit=10', 'GET', null, ownerToken);
    const reqNotif = ownerNotifs.data.notifications.find(n => n.related_type === 'requirement' && n.related_id === testReqId);
    assert(!!reqNotif, `Persistent notification created in notifications table for requirement #${testReqId}`);
    assert(reqNotif.target_role === 'owner', `Notification correctly targeted to owner`);
    assert(reqNotif.is_read === 0, `Notification is marked unread initially`);

    // 2b. Owner marks requirement viewed -> badge clears
    await req(`/notifications/requirements/${testReqId}/view`, 'POST', {}, ownerToken);
    const ownerUpdatesCleared = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerUpdatesCleared.data.requirementsRouteBadge === 0, `Owner requirements badge successfully cleared to 0`);

    // 2c. Owner updates requirement -> Staff gets persistent notification
    await req(`/requirements/${testReqId}`, 'PUT', {
      status: 'Approved',
      notes: 'Approved by Owner for wholesale procurement'
    }, ownerToken);

    const staffUpdatesAfterOwnerApproval = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffUpdatesAfterOwnerApproval.data.requirementsRouteBadge >= 1, `Staff requirements badge incremented on Owner approval`);

    const staffNotifs = await req('/notifications?limit=10', 'GET', null, staffToken);
    const approvalNotif = staffNotifs.data.notifications.find(n => n.related_type === 'requirement' && n.related_id === testReqId);
    assert(!!approvalNotif && approvalNotif.target_role === 'staff', `Staff persistent notification delivered for Owner approval`);

    // Staff marks viewed
    await req(`/notifications/requirements/${testReqId}/view`, 'POST', {}, staffToken);
    const staffUpdatesCleared = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffUpdatesCleared.data.requirementsRouteBadge === 0, `Staff requirements badge successfully cleared to 0`);

    // 2d. Notification deduplication test: rapid duplicate triggers are prevented
    const notificationService = require('./services/NotificationService');
    const firstNotif = notificationService.createNotification({
      target_role: 'owner',
      type: 'test_duplicate_check',
      title: 'Duplicate Test',
      message: 'Checking duplicate prevention',
      related_id: 99999,
      related_type: 'invoice'
    });
    const secondNotif = notificationService.createNotification({
      target_role: 'owner',
      type: 'test_duplicate_check',
      title: 'Duplicate Test',
      message: 'Checking duplicate prevention',
      related_id: 99999,
      related_type: 'invoice'
    });
    assert(firstNotif && secondNotif && firstNotif.id === secondNotif.id, 'Duplicate notification within 15s window successfully deduplicated');
    if (firstNotif?.id) {
      notificationService.deleteNotification(firstNotif.id);
    }

    // -------------------------------------------------------------
    // PART 3: INVOICE MATHEMATICAL CALCULATIONS
    // -------------------------------------------------------------
    console.log('\n--- 3. INVOICE MATHEMATICAL CALCULATIONS ---');

    // Scenario:
    // Subtotal: ₹10,000
    // Discount: ₹1,000
    // Taxable Amount: ₹9,000
    // GST: 18% (CGST 9% = ₹810, SGST 9% = ₹810) -> Tax = ₹1,620
    // Invoice Grand Total: ₹10,620
    // Advance Paid: ₹2,000
    // Balance Due / Outstanding Balance: ₹8,620

    // 3a. Test calculation via recalculateReview API
    const recalcPayload = {
      invoice: {
        invoice_number: `INV-CALC-${Date.now().toString().slice(-5)}`,
        subtotal: 10000,
        discount: 1000,
        other_charges: 0,
        freight_charges: 0,
        round_off: 0,
        advance_paid: 2000,
        amount_paid: 0
      },
      items: [
        {
          item_name: 'Supermarket Grocery Stock',
          quantity: 10,
          unit_price: 1000,
          price_unit_quantity: 1,
          discount_amount: 1000,
          gst_rate: 18
        }
      ]
    };

    const recalcRes = await req('/invoices/review/recalculate', 'POST', recalcPayload, staffToken);
    const calculatedInv = recalcRes.data.invoice;

    assert(calculatedInv.subtotal === 10000, `Calculated Subtotal: ₹${calculatedInv.subtotal} === ₹10,000`);
    assert(calculatedInv.discount === 1000, `Calculated Discount: ₹${calculatedInv.discount} === ₹1,000`);
    assert(calculatedInv.taxable_amount === 9000, `Calculated Taxable Amount: ₹${calculatedInv.taxable_amount} === ₹9,000`);
    assert(calculatedInv.tax === 1620, `Calculated Tax (18%): ₹${calculatedInv.tax} === ₹1,620`);
    assert(calculatedInv.cgst === 810, `Calculated CGST split: ₹${calculatedInv.cgst} === ₹810`);
    assert(calculatedInv.sgst === 810, `Calculated SGST split: ₹${calculatedInv.sgst} === ₹810`);
    assert(calculatedInv.total === 10620, `Calculated Grand Total: ₹${calculatedInv.total} === ₹10,620`);
    assert(calculatedInv.advance_paid === 2000, `Advance Paid: ₹${calculatedInv.advance_paid} === ₹2,000`);
    assert(calculatedInv.outstanding_balance === 8620, `Balance Due: ₹${calculatedInv.outstanding_balance} === ₹8,620`);

    // Test Header GST Rate preset recalculation (e.g. 12% on ₹5,000 taxable = ₹600 tax)
    const headerGstPresetRes = await req('/invoices/review/recalculate', 'POST', {
      invoice: {
        gst_rate: 12,
        subtotal: 5000,
        discount: 0
      },
      items: [
        { item_name: 'Cooking Oil Cans', quantity: 5, unit_price: 1000 }
      ]
    }, staffToken);
    const presetInv = headerGstPresetRes.data.invoice;
    assert(presetInv.tax === 600, `Header GST Rate preset (12%): Tax is ₹${presetInv.tax} === ₹600`);
    assert(presetInv.cgst === 300 && presetInv.sgst === 300, `Header GST Rate split: CGST=₹${presetInv.cgst}, SGST=₹${presetInv.sgst}`);
    assert(presetInv.total === 5600, `Header GST Rate total: ₹${presetInv.total} === ₹5,600`);

    // 3b. Test persistence to Database
    const invNumber = `TEST-MATH-${Date.now().toString().slice(-6)}`;
    const saveRes = await req('/invoices', 'POST', {
      invoiceNumber: invNumber,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      subtotal: 10000,
      discount: 1000,
      taxableAmount: 9000,
      tax: 1620,
      cgst: 810,
      sgst: 810,
      total: 10620,
      advancePaid: 2000,
      paid: 0,
      amountPaid: 0,
      outstandingBalance: 8620,
      vendor: {
        vendor_name: 'Metro Supermarket Food Wholesalers',
        gstin: '29ABCDE1234F1Z5'
      },
      items: [
        {
          item_name: 'Bulk Wheat Flour Bags',
          quantity: 10,
          unit: 'bags',
          unit_price: 1000,
          price_unit_quantity: 1,
          discount_amount: 1000,
          taxable_value: 9000,
          gst_rate: 18,
          cgst_amount: 810,
          sgst_amount: 810,
          line_total: 10620
        }
      ]
    }, staffToken);

    const savedInvId = saveRes.data.id;
    assert(!!savedInvId, `Staff saved invoice #${savedInvId} (${invNumber})`);

    // Verify DB columns
    const dbInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [savedInvId]);
    assert(Number(dbInvoice.subtotal) === 10000, `Database subtotal is ₹10,000`);
    assert(Number(dbInvoice.discount) === 1000, `Database discount is ₹1,000`);
    assert(Number(dbInvoice.taxable_amount) === 9000, `Database taxable_amount is ₹9,000`);
    assert(Number(dbInvoice.total) === 10620, `Database grand total is ₹10,620`);
    assert(Number(dbInvoice.advance_paid) === 2000, `Database advance_paid is ₹2,000`);
    assert(Number(dbInvoice.outstanding_balance) === 8620, `Database outstanding_balance is ₹8,620`);

    // Verify Owner was notified of Staff invoice upload
    const ownerUpdatesAfterInv = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerUpdatesAfterInv.data.invoicesRouteBadge >= 1, `Owner invoices route badge incremented on Staff upload`);

    // 3c. Test Owner Approval & Payment Settlement
    // Formula:
    // Payment Settlement Transaction = Total - Advance Paid = ₹10,620 - ₹2,000 = ₹8,620
    // After Payment:
    // status = 'Paid'
    // outstanding_balance = 0
    // amount_paid = ₹10,620
    console.log('\n--- 4. PAYMENT SETTLEMENT & CLEARANCE ---');
    const payRes = await req(`/invoices/${savedInvId}/approve-pay`, 'POST', {
      paymentMethod: 'UPI',
      paymentReference: `UPI-${Date.now().toString().slice(-6)}`,
      paymentNotes: 'Settled remaining balance via store UPI register'
    }, ownerToken);

    const paidInv = payRes.data;
    assert(paidInv.status === 'Paid', `Invoice status transitioned to 'Paid'`);
    assert(Number(paidInv.outstanding_balance) === 0, `Outstanding balance successfully cleared to 0`);
    assert(Number(paidInv.amount_paid) === 10620, `Total amount paid reflects full settlement of ₹10,620`);
    assert(Number(paidInv.paid) === 8620, `Disbursed settlement transaction amount is ₹8,620 (Total - Advance)`);

    // Verify Staff received payment approval notification
    const staffUpdatesAfterPayment = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffUpdatesAfterPayment.data.invoicesRouteBadge >= 1, `Staff notified of payment approval`);

    const staffPaymentNotif = (await req('/notifications?limit=10', 'GET', null, staffToken)).data.notifications
      .find(n => n.related_type === 'invoice' && n.related_id === savedInvId && n.type === 'invoice_paid');
    assert(!!staffPaymentNotif, `Persistent notification 'invoice_paid' delivered to staff`);

    // 3d. Mark all read
    await req('/notifications/mark-all-read', 'POST', {}, staffToken);
    const staffFinal = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffFinal.data.totalUpdatesCount === 0, `Staff all notifications marked read successfully`);

    // -------------------------------------------------------------
    // PART 5: INVOICE HISTORY SORTING & ROLE VISIBILITY ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 5. INVOICE HISTORY SORTING & STAFF ISOLATION ---');

    // 5a. Staff Invoices List Query
    const staffInvoicesRes = await req('/invoices', 'GET', null, staffToken);
    assert(Array.isArray(staffInvoicesRes.data), 'Staff retrieved invoice history list');
    assert(staffInvoicesRes.data.length > 0, `Staff sees their invoices (count: ${staffInvoicesRes.data.length})`);
    
    // Check all visible invoices belong to the logged in staff member
    const allBelongToStaff = staffInvoicesRes.data.every(inv => inv.created_by_user_id === staffAuth.user.id);
    assert(allBelongToStaff, `All invoices visible to staff belong strictly to staff user ID (${staffAuth.user.id})`);

    // Check staff name is present on every invoice
    const allHaveStaffName = staffInvoicesRes.data.every(inv => !!inv.created_by_name);
    assert(allHaveStaffName, 'Every invoice displays the uploading staff member name');

    // 5b. Default Sorting: Newest first (created_at DESC, id DESC)
    let isSortedNewestFirst = true;
    for (let i = 0; i < staffInvoicesRes.data.length - 1; i++) {
      const curTime = new Date(staffInvoicesRes.data[i].created_at).getTime();
      const nextTime = new Date(staffInvoicesRes.data[i + 1].created_at).getTime();
      if (curTime < nextTime) {
        isSortedNewestFirst = false;
        break;
      }
    }
    assert(isSortedNewestFirst, 'Invoice History defaults to newest first by upload date');

    // 5c. Owner sees all invoices
    const ownerInvoicesRes = await req('/invoices', 'GET', null, ownerToken);
    assert(ownerInvoicesRes.data.length >= staffInvoicesRes.data.length, 'Owner has complete visibility of all store invoices');

    // Cleanup test records
    await req(`/requirements/${testReqId}`, 'DELETE', null, ownerToken);
    await req(`/invoices/${savedInvId}`, 'DELETE', null, ownerToken);
    await db.run("DELETE FROM notifications WHERE type = 'test_duplicate_check' OR title LIKE '%Duplicate Test%' OR related_id IN (?, ?, 99999)", [savedInvId, testReqId]);
    await db.run("DELETE FROM users WHERE email = 'temp.staff.suite@gmail.com'");
    console.log('  Cleaned up test invoice, requirement, test notifications, and temporary test staff.');

    console.log(`\n================================================================`);
    console.log(`🎉 ALL ${passed}/${total} AUTOMATED TESTS PASSED SUCCESSFULLY!`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('\n❌ Comprehensive test failed:', err.data || err.message);
    process.exit(1);
  }
}

runComprehensiveTests();
