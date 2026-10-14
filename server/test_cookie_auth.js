const http = require('http');
const jwt = require('jsonwebtoken');
const { getNextMidnight, JWT_SECRET } = require('./utils/authMiddleware');

function doRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed || data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Cookie Authentication & Midnight Expiry Verification ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Verify getNextMidnight returns exact 12:00:00 AM
  const midnight = getNextMidnight();
  assert(midnight.getHours() === 0 && midnight.getMinutes() === 0 && midnight.getSeconds() === 0, 'getNextMidnight() sets hours=0, minutes=0, seconds=0 (12:00:00 AM)');
  assert(midnight.getTime() > Date.now(), 'getNextMidnight() is in the future');

  // 2. Test Login requires OTP and then sets Cookie
  const preLoginRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'developer@gmail.com', password: 'developer123', portalRole: 'owner' });

  assert(preLoginRes.statusCode === 200, 'Owner initial credentials verification returns HTTP 200');
  assert(preLoginRes.data.requiresOtp === true, 'Owner initial login indicates requiresOtp: true');
  assert(!!preLoginRes.data.debugOtp, 'Owner initial login returns debugOtp for completion');
  const loginOtp = preLoginRes.data.debugOtp;

  const loginRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'developer@gmail.com', password: 'developer123', portalRole: 'owner', otp: loginOtp });

  assert(loginRes.statusCode === 200, 'Owner login with valid OTP returns HTTP 200');
  assert(!!loginRes.data.token, 'Owner login returns token in response body for backwards compatibility');

  const setCookieHeader = loginRes.headers['set-cookie'];
  assert(Array.isArray(setCookieHeader) && setCookieHeader.length > 0, 'Set-Cookie header is returned');

  const tokenCookieStr = setCookieHeader.find(c => c.startsWith('token='));
  assert(!!tokenCookieStr, 'Set-Cookie header contains "token=..."');
  assert(tokenCookieStr.includes('HttpOnly'), 'Cookie has HttpOnly flag for security');
  assert(tokenCookieStr.includes('Path=/'), 'Cookie has Path=/');
  assert(tokenCookieStr.toLowerCase().includes('expires='), 'Cookie has Expires attribute set');

  // Parse cookie value
  const cookieValueMatch = tokenCookieStr.match(/^token=([^;]+)/);
  const cookieToken = cookieValueMatch ? cookieValueMatch[1] : null;
  assert(!!cookieToken, 'Successfully extracted token from Set-Cookie header');

  // 3. Test authenticated endpoint /api/auth/me using ONLY Cookie (no Authorization header)
  const meCookieRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Cookie': `token=${cookieToken}`
    }
  });

  assert(meCookieRes.statusCode === 200, '/api/auth/me succeeds with ONLY Cookie authentication');
  assert(meCookieRes.data.user && meCookieRes.data.user.role === 'owner', 'Authenticated user role is owner via cookie');
  assert(!!meCookieRes.data.expiresAt, 'User profile returns expiresAt timestamp');

  // 4. Test authenticated endpoint with Bearer header (backwards compatibility)
  const meBearerRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${loginRes.data.token}`
    }
  });
  assert(meBearerRes.statusCode === 200, '/api/auth/me succeeds with Bearer header (backwards compatibility)');

  // 5. Test Developer Login with Staff Portal sets Cookie
  const preStaffLoginRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'developer@gmail.com', password: 'developer123', portalRole: 'staff' });

  assert(preStaffLoginRes.statusCode === 200, 'Staff initial credentials verification returns HTTP 200');
  assert(preStaffLoginRes.data.requiresOtp === true, 'Staff initial login indicates requiresOtp: true');
  assert(!!preStaffLoginRes.data.debugOtp, 'Staff initial login returns debugOtp');
  const staffLoginOtp = preStaffLoginRes.data.debugOtp;

  const staffLoginRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'developer@gmail.com', password: 'developer123', portalRole: 'staff', otp: staffLoginOtp });

  assert(staffLoginRes.statusCode === 200, 'Staff login with valid OTP returns HTTP 200');
  const staffCookieHeader = staffLoginRes.headers['set-cookie'];
  const staffTokenCookieStr = staffCookieHeader.find(c => c.startsWith('token='));
  assert(!!staffTokenCookieStr, 'Staff login also sets "token" cookie');

  // 6. Test Logout clears Cookie
  const logoutRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Cookie': `token=${cookieToken}`
    }
  });

  assert(logoutRes.statusCode === 200, 'POST /api/auth/logout returns HTTP 200');
  const logoutCookies = logoutRes.headers['set-cookie'];
  assert(Array.isArray(logoutCookies), 'Logout returns Set-Cookie header to clear cookie');
  const clearedCookie = logoutCookies.find(c => c.startsWith('token='));
  assert(
    clearedCookie && (clearedCookie.includes('Expires=Thu, 01 Jan 1970') || clearedCookie.includes('Max-Age=0') || clearedCookie.startsWith('token=;')),
    'Logout cleared the token cookie (expired in past)'
  );

  // 7. Test expired token returns SESSION_EXPIRED_MIDNIGHT
  const pastMidnightToken = jwt.sign(
    { id: 1, email: 'developer@gmail.com', role: 'owner' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );

  const expiredRes = await doRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Cookie': `token=${pastMidnightToken}`
    }
  });

  assert(expiredRes.statusCode === 401, 'Expired token via Cookie returns HTTP 401');
  assert(expiredRes.data.code === 'SESSION_EXPIRED_MIDNIGHT', 'Expired token returns error code SESSION_EXPIRED_MIDNIGHT');

  console.log(`\n======================================`);
  console.log(`Cookie Auth Tests Completed: ${passed}/${total} PASSED`);
  console.log(`======================================`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
