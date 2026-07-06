
const BASE_URL = 'http://localhost:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, message: '✅ Passed' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, message: `❌ Failed: ${(error as Error).message}` });
    console.log(`❌ ${name}: ${(error as Error).message}`);
  }
}

async function runTests() {
  console.log('\n🧪 Running Security Tests for Chess Academy Admin Panel\n');
  console.log('=' .repeat(60));

  await runTest('Health Check', async () => {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    if (!response.ok) throw new Error('Health check failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error('Health check returned failure');
  });

  let adminToken = '';
  let refreshToken = '';
  await runTest('Admin Login with Valid Credentials', async () => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@emberkids.com',
        password: 'admin123',
      }),
    });
    if (!response.ok) throw new Error('Login request failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error(data.error || 'Login failed');
    if (!data.data?.accessToken) throw new Error('No access token returned');
    if (!data.data?.refreshToken) throw new Error('No refresh token returned');
    adminToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
  });

  await runTest('Login with Invalid Credentials', async () => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@emberkids.com',
        password: 'wrongpassword',
      }),
    });
    if (response.ok) throw new Error('Login should have failed with wrong password');
    const data = await response.json() as ApiResponse;
    if (data.success) throw new Error('Login should not succeed with wrong password');
  });

  await runTest('Access Protected Endpoint Without Token', async () => {
    const response = await fetch(`${BASE_URL}/dashboard/admin`);
    if (response.ok) throw new Error('Request should fail without token');
  });

  await runTest('Access Protected Endpoint with Valid Token', async () => {
    const response = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Request should succeed with valid token');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error('Request should return success');
  });

  let newAccessToken = '';
  await runTest('Refresh Token Functionality', async () => {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('Token refresh failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error(data.error || 'Token refresh failed');
    if (!data.data?.accessToken) throw new Error('No new access token returned');
    newAccessToken = data.data.accessToken;
    adminToken = newAccessToken;
  });

  await runTest('Logout Functionality', async () => {
    const response = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('Logout failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error(data.error || 'Logout failed');
  });

  await runTest('Access After Logout', async () => {
    const response = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (response.ok) throw new Error('Request should fail after logout');
  });

  let staffToken = '';
  await runTest('Staff Login', async () => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@emberkids.com',
        password: 'staff123',
      }),
    });
    if (!response.ok) throw new Error('Staff login failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error(data.error || 'Staff login failed');
    staffToken = data.data.accessToken;
  });

  await runTest('Staff Accessing Admin-Only Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/staff`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (response.ok) throw new Error('Staff should not access admin-only endpoint');
    const data = await response.json() as ApiResponse;
    if (data.success) throw new Error('Request should fail for staff');
  });

  await runTest('Staff Accessing Read-Only Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (!response.ok) throw new Error('Staff should be able to access read-only endpoint');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error('Read-only access should succeed');
  });

  await runTest('Admin Accessing Staff Management', async () => {
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@emberkids.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginResponse.json() as ApiResponse;
    adminToken = loginData.data.accessToken;

    const response = await fetch(`${BASE_URL}/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Admin should access staff management');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error('Staff management should succeed for admin');
  });

  await runTest('Verify Authentication Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Verify endpoint failed');
    const data = await response.json() as ApiResponse;
    if (!data.success) throw new Error('Verify should return success');
    if (!data.data?.user) throw new Error('Verify should return user data');
  });

  await runTest('Rate Limiting', async () => {
    let failed = false;
    for (let i = 0; i < 15; i++) {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'test',
        }),
      });
      if (response.status === 429) {
        failed = true;
        break;
      }
    }
    if (!failed) throw new Error('Rate limiting not triggered');
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%\n`);
  
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All security tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the failures above.\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
