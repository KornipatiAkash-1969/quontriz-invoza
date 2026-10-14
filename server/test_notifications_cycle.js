const BASE_URL = 'http://localhost:5000/api';

async function req(url, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
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

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE NOTIFICATION CYCLE TEST');
  console.log('=====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Authenticate Owner
    console.log('1. Authenticating Owner & Staff...');
    const ownerLogin = await req('/auth/login', 'POST', {
      email: 'owner@supermarket.com',
      password: 'owner123',
      portalRole: 'owner',
    });
    const ownerToken = ownerLogin.token;
    assert(!!ownerToken, 'Owner authenticated successfully');

    // Authenticate Staff
    const staffLogin = await req('/auth/login', 'POST', {
      email: 'staff@supermarket.com',
      password: 'staff123',
      portalRole: 'staff',
    });
    const staffToken = staffLogin.token;
    assert(!!staffToken, 'Staff authenticated successfully');

    // 2. Clear existing notifications to establish baseline
    console.log('\n2. Baseline: Resetting existing notifications...');
    await req('/notifications/mark-all-viewed', 'POST', {}, ownerToken);
    await req('/notifications/mark-all-viewed', 'POST', {}, staffToken);

    const ownerBase = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerBase.data.totalUpdatesCount === 0, 'Owner baseline updates count is 0');

    const staffBase = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffBase.data.totalUpdatesCount === 0, 'Staff baseline updates count is 0');

    // 3. Test: Staff creates a requirement
    console.log('\n3. Testing Staff creates requirement -> Owner gets notified...');
    const testReqRes = await req('/requirements', 'POST', {
      item_name: 'Test Basmati Rice',
      specification: '25 KG Super A Grade',
      quantity: 5,
      unit: 'bags',
      priority: 'High',
      notes: 'Automated test requisition',
    }, staffToken);

    const createdReqId = testReqRes.data.id;
    assert(!!createdReqId, `Staff created requirement #${createdReqId}`);

    // Check Owner notifications
    const ownerAfterStaffReq = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerAfterStaffReq.data.requirementsRouteBadge >= 1, `Owner requirements badge is ${ownerAfterStaffReq.data.requirementsRouteBadge} (>= 1)`);
    assert(ownerAfterStaffReq.data.totalUpdatesCount >= 1, `Owner totalUpdatesCount is ${ownerAfterStaffReq.data.totalUpdatesCount} (>= 1)`);

    // Check Staff notifications (Staff should NOT be notified for their own creation)
    const staffAfterStaffReq = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterStaffReq.data.requirementsRouteBadge === 0, 'Staff has 0 unviewed notifications for their own creation');

    // 4. Test: Owner views the requirement -> Owner badge clears
    console.log('\n4. Testing Owner marks requirement viewed -> Owner badge clears...');
    await req(`/notifications/requirements/${createdReqId}/view`, 'POST', {}, ownerToken);

    const ownerAfterView = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerAfterView.data.requirementsRouteBadge === 0, 'Owner requirements badge successfully cleared to 0');

    // 5. Test: Owner updates requirement status -> Staff gets notified!
    console.log('\n5. Testing Owner updates requirement -> Staff gets notified...');
    await req(`/requirements/${createdReqId}`, 'PUT', {
      status: 'Approved',
      notes: 'Approved by Owner for procurement',
    }, ownerToken);

    const staffAfterOwnerUpdate = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterOwnerUpdate.data.requirementsRouteBadge >= 1, `Staff requirements badge is ${staffAfterOwnerUpdate.data.requirementsRouteBadge} (>= 1) upon Owner update`);
    assert(staffAfterOwnerUpdate.data.hasNewUpdates === true, 'Staff hasNewUpdates flag is true');

    const ownerAfterOwnerUpdate = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerAfterOwnerUpdate.data.requirementsRouteBadge === 0, 'Owner badge remains 0 (they made the update)');

    // 6. Test: Staff marks requirement viewed -> Staff badge clears
    console.log('\n6. Testing Staff marks requirement viewed -> Staff badge clears...');
    await req(`/notifications/requirements/${createdReqId}/view`, 'POST', {}, staffToken);

    const staffAfterView = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterView.data.requirementsRouteBadge === 0, 'Staff requirements badge successfully cleared to 0');

    // 7. Test: Staff saves a new invoice -> Owner gets notified
    console.log('\n7. Testing Staff saves invoice -> Owner gets notified...');
    const testInvNum = `TEST-CYCLE-${Date.now().toString().slice(-6)}`;
    const testInvRes = await req('/invoices', 'POST', {
      invoiceNumber: testInvNum,
      invoiceDate: new Date().toISOString().slice(0, 10),
      total: 1250,
      subtotal: 1250,
      vendor: { vendor_name: 'Test Cycle Vendor Supplies' },
      items: [
        { item_name: 'Supermarket Inventory Supplies', quantity: 10, unit: 'pcs', unit_price: 125, line_total: 1250 },
      ],
    }, staffToken);

    const createdInvId = testInvRes.data.id;
    assert(!!createdInvId, `Staff saved invoice #${createdInvId} (${testInvNum})`);

    const ownerAfterStaffInv = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerAfterStaffInv.data.invoicesRouteBadge >= 1, `Owner invoices badge is ${ownerAfterStaffInv.data.invoicesRouteBadge} (>= 1)`);
    assert(ownerAfterStaffInv.data.totalUpdatesCount >= 1, `Owner totalUpdatesCount is ${ownerAfterStaffInv.data.totalUpdatesCount} (>= 1)`);

    const staffAfterStaffInv = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterStaffInv.data.invoicesRouteBadge === 0, 'Staff invoices badge is 0 (Staff uploaded it)');

    // 8. Test: Owner approves and pays the invoice -> Staff gets notified!
    console.log('\n8. Testing Owner approves & pays invoice -> Staff gets notified...');
    await req(`/invoices/${createdInvId}/approve-pay`, 'POST', {
      paymentMethod: 'Bank Transfer',
      paymentReference: `NEFT-${Date.now().toString().slice(-6)}`,
      paymentNotes: 'Approved & Paid test payment',
    }, ownerToken);

    const staffAfterPay = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterPay.data.invoicesRouteBadge >= 1, `Staff invoices badge is ${staffAfterPay.data.invoicesRouteBadge} (>= 1) after Owner approval & payment`);

    const ownerAfterPay = await req('/notifications/updates', 'GET', null, ownerToken);
    assert(ownerAfterPay.data.invoicesRouteBadge === 0, 'Owner invoices badge is 0');

    // 9. Test: Staff marks invoice viewed -> Staff badge clears
    console.log('\n9. Testing Staff marks invoice viewed -> Staff badge clears...');
    await req(`/notifications/invoices/${createdInvId}/view`, 'POST', {}, staffToken);

    const staffAfterInvView = await req('/notifications/updates', 'GET', null, staffToken);
    assert(staffAfterInvView.data.invoicesRouteBadge === 0, 'Staff invoices badge cleared to 0');

    // 10. Clean up test records
    console.log('\n10. Cleaning up test records...');
    await req(`/requirements/${createdReqId}`, 'DELETE', null, ownerToken);
    await req(`/invoices/${createdInvId}`, 'DELETE', null, ownerToken);
    console.log('  Cleaned up test requirement and test invoice.');

    console.log(`\n=====================================================`);
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log(`=====================================================\n`);
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.data || err.message);
    process.exit(1);
  }
}

runTests();
