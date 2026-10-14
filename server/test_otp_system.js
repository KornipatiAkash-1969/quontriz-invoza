const assert = require('assert');
const http = require('http');

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = { raw };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'GET',
      headers: { ...headers }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = { raw };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Comprehensive OTP System Verification Suite ---\n');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Staff Login with OTP
  console.log('1. Testing Send Login OTP for Store Staff (staff@supermarket.com)...');
  const sendStaffRes = await post(`${baseUrl}/auth/otp/send-login`, {
    email: 'staff@supermarket.com',
    portalRole: 'staff'
  });
  assert.strictEqual(sendStaffRes.status, 200, `Expected 200: ${JSON.stringify(sendStaffRes.data)}`);
  assert(sendStaffRes.data.success, 'Expected success=true');
  assert(sendStaffRes.data.debugOtp, 'Expected debugOtp in response');
  const staffOtp = sendStaffRes.data.debugOtp;
  console.log(`  ✓ PASS: Received 6-digit OTP: ${staffOtp}`);

  // 2. Reject incorrect OTP code
  console.log('2. Testing Incorrect OTP code rejection...');
  const wrongRes = await post(`${baseUrl}/auth/otp/verify-login`, {
    email: 'staff@supermarket.com',
    otp: '999999',
    portalRole: 'staff'
  });
  assert.strictEqual(wrongRes.status, 400);
  assert.strictEqual(wrongRes.data.success, false);
  console.log('  ✓ PASS: Wrong OTP successfully rejected');

  // 3. Complete Staff Login with OTP
  console.log('3. Testing Staff Login verification with valid OTP...');
  const verifyStaffRes = await post(`${baseUrl}/auth/otp/verify-login`, {
    email: 'staff@supermarket.com',
    otp: staffOtp,
    portalRole: 'staff'
  });
  assert.strictEqual(verifyStaffRes.status, 200, `Expected 200: ${JSON.stringify(verifyStaffRes.data)}`);
  assert(verifyStaffRes.data.token, 'Expected token');
  assert.strictEqual(verifyStaffRes.data.user.role, 'staff');
  assert(verifyStaffRes.headers['set-cookie'], 'Expected set-cookie header');
  console.log('  ✓ PASS: Staff OTP Login verified, JWT issued, cookie set');

  // 4. Owner Login with OTP
  console.log('4. Testing Send & Verify Login OTP for Store Owner (owner@supermarket.com)...');
  const sendOwnerRes = await post(`${baseUrl}/auth/otp/send-login`, {
    email: 'owner@supermarket.com',
    portalRole: 'owner'
  });
  assert.strictEqual(sendOwnerRes.status, 200);
  const ownerOtp = sendOwnerRes.data.debugOtp;
  const verifyOwnerRes = await post(`${baseUrl}/auth/otp/verify-login`, {
    email: 'owner@supermarket.com',
    otp: ownerOtp,
    portalRole: 'owner'
  });
  assert.strictEqual(verifyOwnerRes.status, 200);
  assert.strictEqual(verifyOwnerRes.data.user.role, 'owner');
  const ownerToken = verifyOwnerRes.data.token;
  console.log('  ✓ PASS: Owner OTP Login verified and authenticated');

  // 5. Portal Role Mismatch Enforced with OTP
  console.log('5. Testing Portal Role Mismatch Protection...');
  const mismatchRes = await post(`${baseUrl}/auth/otp/send-login`, {
    email: 'staff@supermarket.com',
    portalRole: 'owner'
  });
  assert.strictEqual(mismatchRes.status, 403);
  assert.strictEqual(mismatchRes.data.code, 'PORTAL_ROLE_MISMATCH');
  console.log('  ✓ PASS: Staff email blocked from Store Owner portal with 403');

  // 6. Register New Staff via OTP
  const uniqueId = Date.now();
  const newStaffEmail = `staff.${uniqueId}@supermarket.com`;
  const newStaffName = `Staff Member ${uniqueId}`;
  console.log(`6. Testing Self-Registration: New Staff with OTP (${newStaffEmail})...`);
  const regSend = await post(`${baseUrl}/auth/otp/send-register`, {
    name: newStaffName,
    email: newStaffEmail,
    role: 'staff'
  });
  assert.strictEqual(regSend.status, 200);
  const regOtp = regSend.data.debugOtp;

  const regVerify = await post(`${baseUrl}/auth/otp/verify-register`, {
    name: newStaffName,
    email: newStaffEmail,
    password: 'password123',
    role: 'staff',
    otp: regOtp
  });
  assert.strictEqual(regVerify.status, 201);
  assert.strictEqual(regVerify.data.user.email, newStaffEmail);
  assert.strictEqual(regVerify.data.user.role, 'staff');
  console.log('  ✓ PASS: New Staff registered & authenticated via OTP');

  // 7. Register New Owner via OTP
  const newOwnerEmail = `owner.${uniqueId}@supermarket.com`;
  const newOwnerName = `Store Owner ${uniqueId}`;
  console.log(`7. Testing Self-Registration: New Owner with OTP (${newOwnerEmail})...`);
  const regOwnerSend = await post(`${baseUrl}/auth/otp/send-register`, {
    name: newOwnerName,
    email: newOwnerEmail,
    role: 'owner'
  });
  assert.strictEqual(regOwnerSend.status, 200);
  const ownerRegOtp = regOwnerSend.data.debugOtp;

  const regOwnerVerify = await post(`${baseUrl}/auth/otp/verify-register`, {
    name: newOwnerName,
    email: newOwnerEmail,
    password: 'ownerpassword123',
    role: 'owner',
    otp: ownerRegOtp
  });
  assert.strictEqual(regOwnerVerify.status, 201);
  assert.strictEqual(regOwnerVerify.data.user.role, 'owner');
  console.log('  ✓ PASS: New Owner registered & authenticated via OTP');

  // 8. Prevent duplicate registration
  console.log('8. Testing Duplicate Registration Prevention...');
  const dupRes = await post(`${baseUrl}/auth/otp/send-register`, {
    name: newOwnerName,
    email: newOwnerEmail,
    role: 'owner'
  });
  assert.strictEqual(dupRes.status, 409);
  console.log('  ✓ PASS: Duplicate email/name blocked with HTTP 409');

  // 9. Owner Creates Staff Member with OTP in Users Management
  console.log('9. Testing Owner Creates Staff Member via OTP Verification in Users Page...');
  const memberEmail = `team.staff.${uniqueId}@supermarket.com`;
  const memberName = `Team Staff ${uniqueId}`;
  const memberSend = await post(
    `${baseUrl}/auth/otp/send-create-member`,
    { name: memberName, email: memberEmail, role: 'staff' },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(memberSend.status, 200);
  const memberOtp = memberSend.data.debugOtp;

  const memberVerify = await post(
    `${baseUrl}/auth/otp/verify-create-member`,
    {
      name: memberName,
      email: memberEmail,
      password: 'staffpassword123',
      role: 'staff',
      otp: memberOtp
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(memberVerify.status, 201);
  assert.strictEqual(memberVerify.data.user.email, memberEmail);
  assert.strictEqual(memberVerify.data.user.role, 'staff');
  console.log('  ✓ PASS: Owner created new Staff with OTP verification');

  // 10. Owner Creates Another Owner Member with OTP in Users Management
  console.log('10. Testing Owner Creates Partner Owner via OTP Verification in Users Page...');
  const partnerEmail = `partner.owner.${uniqueId}@supermarket.com`;
  const partnerName = `Partner Owner ${uniqueId}`;
  const partnerSend = await post(
    `${baseUrl}/auth/otp/send-create-member`,
    { name: partnerName, email: partnerEmail, role: 'owner' },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(partnerSend.status, 200);
  const partnerOtp = partnerSend.data.debugOtp;

  const partnerVerify = await post(
    `${baseUrl}/auth/otp/verify-create-member`,
    {
      name: partnerName,
      email: partnerEmail,
      password: 'partnerpassword123',
      role: 'owner',
      otp: partnerOtp
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(partnerVerify.status, 201);
  assert.strictEqual(partnerVerify.data.user.email, partnerEmail);
  assert.strictEqual(partnerVerify.data.user.role, 'owner');
  console.log('  ✓ PASS: Owner created new Owner with OTP verification');

  // 11. Dedicated Staff OTP Creation: Owner creates Staff requiring Staff OTP
  console.log('11. Testing Owner Creates Staff via Dedicated Staff OTP Flow...');
  const staffEmail2 = `staff.dedicated.${uniqueId}@supermarket.com`;
  const staffName2 = `Staff Dedicated ${uniqueId}`;
  
  // 11a. Should reject without Staff OTP
  const rejectStaff = await post(
    `${baseUrl}/auth/users/create-staff`,
    { name: staffName2, email: staffEmail2, password: 'staffpassword123' },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(rejectStaff.status, 400);
  assert(rejectStaff.data.error.includes('Staff OTP is required'), 'Expected error for missing Staff OTP');
  console.log('  ✓ PASS: Missing Staff OTP rejected with 400');

  // 11b. Send Staff OTP
  const sendStaffDedicatedRes = await post(
    `${baseUrl}/auth/users/send-staff-otp`,
    { name: staffName2, email: staffEmail2 },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(sendStaffDedicatedRes.status, 200);
  assert(sendStaffDedicatedRes.data.debugOtp, 'Expected debugOtp in response');
  const staffDedicatedOtp = sendStaffDedicatedRes.data.debugOtp;
  console.log(`  ✓ PASS: Staff OTP dispatched (${staffDedicatedOtp})`);

  // 11c. Create Staff with valid Staff OTP
  const createStaffRes = await post(
    `${baseUrl}/auth/users/create-staff`,
    {
      name: staffName2,
      email: staffEmail2,
      password: 'staffpassword123',
      staffOtp: staffDedicatedOtp
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(createStaffRes.status, 201);
  assert.strictEqual(createStaffRes.data.user.role, 'staff');
  console.log('  ✓ PASS: Staff created successfully via verified Staff OTP');

  // 12. Dedicated Dual-Owner Creation: Owner creates another Owner requiring Dual OTPs
  console.log('12. Testing Owner Creates Co-Owner via Dual-Authorization OTP Flow...');
  const ownerEmail2 = `owner.dual.${uniqueId}@supermarket.com`;
  const ownerName2 = `Owner CoOwner ${uniqueId}`;

  // 12a. Should reject without Dual OTPs
  const rejectOwner = await post(
    `${baseUrl}/auth/users/create-owner`,
    { name: ownerName2, email: ownerEmail2, password: 'ownerpassword123' },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(rejectOwner.status, 400);
  assert(rejectOwner.data.error.includes('required'), 'Expected error for missing dual OTPs');
  console.log('  ✓ PASS: Missing Dual OTPs rejected with 400');

  // 12b. Send Dual OTPs
  const sendDualRes = await post(
    `${baseUrl}/auth/users/send-owner-otps`,
    { name: ownerName2, email: ownerEmail2 },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(sendDualRes.status, 200);
  assert(sendDualRes.data.debugCurrentOwnerOtp, 'Expected debugCurrentOwnerOtp');
  assert(sendDualRes.data.debugNewOwnerOtp, 'Expected debugNewOwnerOtp');
  const currentOwnerAuthOtp = sendDualRes.data.debugCurrentOwnerOtp;
  const newOwnerVerifOtp = sendDualRes.data.debugNewOwnerOtp;
  console.log(`  ✓ PASS: Dual OTPs dispatched (Current Owner Auth: ${currentOwnerAuthOtp}, New Owner Verif: ${newOwnerVerifOtp})`);

  // 12c. Reject if Current Owner OTP is wrong
  const rejectBadCurrent = await post(
    `${baseUrl}/auth/users/create-owner`,
    {
      name: ownerName2,
      email: ownerEmail2,
      password: 'ownerpassword123',
      currentOwnerOtp: '999999',
      newOwnerOtp: newOwnerVerifOtp
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(rejectBadCurrent.status, 400);
  console.log('  ✓ PASS: Wrong Current Owner OTP rejected');

  // 12d. Reject if New Owner OTP is wrong
  const rejectBadNew = await post(
    `${baseUrl}/auth/users/create-owner`,
    {
      name: ownerName2,
      email: ownerEmail2,
      password: 'ownerpassword123',
      currentOwnerOtp: currentOwnerAuthOtp,
      newOwnerOtp: '999999'
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(rejectBadNew.status, 400);
  console.log('  ✓ PASS: Wrong New Owner OTP rejected');

  // 12e. Create Co-Owner with both valid OTPs
  // Resend fresh OTPs after previous failed attempts
  const resendDual = await post(
    `${baseUrl}/auth/users/send-owner-otps`,
    { name: ownerName2, email: ownerEmail2 },
    { Authorization: `Bearer ${ownerToken}` }
  );
  const freshCurrentOtp = resendDual.data.debugCurrentOwnerOtp;
  const freshNewOtp = resendDual.data.debugNewOwnerOtp;

  const createOwnerRes = await post(
    `${baseUrl}/auth/users/create-owner`,
    {
      name: ownerName2,
      email: ownerEmail2,
      password: 'ownerpassword123',
      currentOwnerOtp: freshCurrentOtp,
      newOwnerOtp: freshNewOtp
    },
    { Authorization: `Bearer ${ownerToken}` }
  );
  assert.strictEqual(createOwnerRes.status, 201);
  assert.strictEqual(createOwnerRes.data.user.role, 'owner');
  console.log('  ✓ PASS: Co-Owner created successfully with verified Dual OTPs');


  console.log('13. Testing Brute-Force Rate Limiting (5 incorrect attempts)...');
  const spamEmail = `spam.${uniqueId}@supermarket.com`;
  const spamSend = await post(`${baseUrl}/auth/otp/send-register`, {
    name: `Spam User ${uniqueId}`,
    email: spamEmail,
    role: 'staff'
  });
  assert.strictEqual(spamSend.status, 200);

  // Send 5 bad attempts
  for (let i = 1; i <= 5; i++) {
    await post(`${baseUrl}/auth/otp/verify-register`, {
      name: `Spam User ${uniqueId}`,
      email: spamEmail,
      password: 'somepassword',
      role: 'staff',
      otp: '000000'
    });
  }

  // 6th attempt should be blocked
  const lockedRes = await post(`${baseUrl}/auth/otp/verify-register`, {
    name: `Spam User ${uniqueId}`,
    email: spamEmail,
    password: 'somepassword',
    role: 'staff',
    otp: '000000'
  });
  assert.strictEqual(lockedRes.status, 400);
  assert(lockedRes.data.error.includes('Too many') || lockedRes.data.error.includes('locked'), 'Expected locked error message');
  console.log('  ✓ PASS: Brute-force rate limiting locked OTP after repeated failures');

  console.log('\n======================================================');
  console.log('All 13/13 OTP System Security & Functionality Tests PASSED!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
