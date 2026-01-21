// Test script for Idempotency-Key enforcement
// Run with: bun run test_idempotency.js

const API_BASE = 'http://localhost:50430/api/v1';

// Helper: Generate deterministic idempotency key
function generateKey(parts) {
  return parts.join(':');
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

async function testWithoutIdempotencyKey() {
  console.log('\n=== TEST 1: POST without Idempotency-Key (should fail with 400) ===');
  
  try {
    const response = await fetch(`${API_BASE}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': DEMO_USER_ID,
        // NO Idempotency-Key header
      },
      body: JSON.stringify({
        type: 'offer_help',
        message: 'Going to store',
        expiresInMinutes: 60,
        lat: 40.7128,
        lng: -74.0060,
        offer_usd: 10
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400 && data.error?.code === 'IDEMPOTENCY_KEY_REQUIRED') {
      console.log('✅ PASS: Correctly rejected missing Idempotency-Key');
      return true;
    } else {
      console.log('❌ FAIL: Should have returned 400 with IDEMPOTENCY_KEY_REQUIRED');
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.message);
    return false;
  }
}

async function testWithIdempotencyKey() {
  console.log('\n=== TEST 2: POST with Idempotency-Key (should succeed) ===');
  
  const idempotencyKey = generateKey([
    'broadcast:create',
    DEMO_USER_ID,
    'offer_help',
    'Going to store test',
    '60',
    '40.7128',
    '-74.0060',
    '10'
  ]);
  
  console.log('Using Idempotency-Key:', idempotencyKey);
  
  try {
    const response = await fetch(`${API_BASE}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': DEMO_USER_ID,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        type: 'offer_help',
        message: 'Going to store test',
        expiresInMinutes: 60,
        lat: 40.7128,
        lng: -74.0060,
        offer_usd: 10
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 201 && data.broadcast?.id) {
      console.log('✅ PASS: Broadcast created successfully');
      return true;
    } else {
      console.log('❌ FAIL: Should have returned 201 with broadcast');
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.message);
    return false;
  }
}

async function testRetryWithSameKey() {
  console.log('\n=== TEST 3: Retry with same Idempotency-Key (should return existing, idempotent) ===');
  
  const idempotencyKey = generateKey([
    'broadcast:create',
    DEMO_USER_ID,
    'offer_help',
    'Going to store retry test',
    '60',
    '40.7128',
    '-74.0060',
    '10'
  ]);
  
  console.log('Using Idempotency-Key:', idempotencyKey);
  
  // First request
  const response1 = await fetch(`${API_BASE}/broadcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': DEMO_USER_ID,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      type: 'offer_help',
      message: 'Going to store retry test',
      expiresInMinutes: 60,
      lat: 40.7128,
      lng: -74.0060,
      offer_usd: 10
    })
  });
  
  const data1 = await response1.json();
  console.log('First request status:', response1.status);
  console.log('First request idempotent:', data1.idempotent);
  
  // Retry with same key
  const response2 = await fetch(`${API_BASE}/broadcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': DEMO_USER_ID,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      type: 'offer_help',
      message: 'Going to store retry test',
      expiresInMinutes: 60,
      lat: 40.7128,
      lng: -74.0060,
      offer_usd: 10
    })
  });
  
  const data2 = await response2.json();
  console.log('Second request status:', response2.status);
  console.log('Second request idempotent:', data2.idempotent);
  
  if (response2.status === 201 && data2.idempotent === true) {
    if (data1.broadcast?.id === data2.broadcast?.id) {
      console.log('✅ PASS: Retry returned same broadcast (idempotent)');
      return true;
    } else {
      console.log('❌ FAIL: Retry returned different broadcast ID');
      return false;
    }
  } else {
    console.log('❌ FAIL: Retry should return 201 with idempotent: true');
    return false;
  }
}

async function testWithdrawalWithoutKey() {
  console.log('\n=== TEST 4: Withdrawal without Idempotency-Key (should fail) ===');
  
  try {
    const response = await fetch(`${API_BASE}/wallet/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': DEMO_USER_ID,
        // NO Idempotency-Key header
      },
      body: JSON.stringify({
        amount_usd: 25
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400 && data.error?.code === 'IDEMPOTENCY_KEY_REQUIRED') {
      console.log('✅ PASS: Correctly rejected missing Idempotency-Key');
      return true;
    } else {
      console.log('❌ FAIL: Should have returned 400 with IDEMPOTENCY_KEY_REQUIRED');
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('IDEMPOTENCY-KEY ENFORCEMENT TESTS');
  console.log('='.repeat(80));
  
  const results = [];
  
  results.push(await testWithoutIdempotencyKey());
  results.push(await testWithIdempotencyKey());
  results.push(await testRetryWithSameKey());
  results.push(await testWithdrawalWithoutKey());
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ ALL TESTS PASSED! Idempotency-Key enforcement is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED. Please review the errors above.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run tests
runTests().catch(console.error);
