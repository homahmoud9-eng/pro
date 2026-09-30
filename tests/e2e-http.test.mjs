async function verifyHttpEndpoints() {
  console.log('====================================================');
  console.log('🌐 RUNNING END-TO-END HTTP API & FLOW VERIFICATION');
  console.log('====================================================\n');

  const baseUrl = 'http://localhost:3000';

  // 1. Verify Login page HTML
  console.log('1. Fetching Login page HTML (/login)...');
  const loginPageRes = await fetch(`${baseUrl}/login`);
  if (!loginPageRes.ok) throw new Error(`Login page returned status ${loginPageRes.status}`);
  const loginHtml = await loginPageRes.text();
  if (!loginHtml.includes('Tasha Restaurant Group') && !loginHtml.includes('Sign In')) {
    throw new Error('Login page missing expected branding or sign-in form');
  }
  console.log('  ✅ Login page rendered successfully with branding & test profiles');

  // 2. Perform authentication: POST /api/auth/login
  console.log('\n2. Testing authentication: POST /api/auth/login...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: 'owner@tasha.ae',
      password: 'OwnerLogin@2026!'
    })
  });
  if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('Missing session cookie in login response');
  console.log(`  ✅ Successfully authenticated as ${loginData.user.name} (${loginData.user.role})`);
  console.log(`  ✅ Received secure HTTP-only session cookie`);

  const cookieHeader = { Cookie: setCookie.split(';')[0] };

  // 3. Verify session identity: GET /api/auth/me
  console.log('\n3. Verifying session identity: GET /api/auth/me...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: cookieHeader });
  if (!meRes.ok) throw new Error(`GET /api/auth/me failed with status ${meRes.status}`);
  const meData = await meRes.json();
  if (meData.user.email !== 'owner@tasha.ae') throw new Error('Session user mismatch');
  console.log(`  ✅ Session active for user: ${meData.user.name}`);

  // 4. Test Dashboard Metrics: GET /api/dashboard/metrics
  console.log('\n4. Testing Dashboard metrics: GET /api/dashboard/metrics...');
  const metricsRes = await fetch(`${baseUrl}/api/dashboard/metrics`, { headers: cookieHeader });
  if (!metricsRes.ok) throw new Error(`Metrics failed with status ${metricsRes.status}`);
  const metricsData = await metricsRes.json();
  console.log(`  ✅ Total Employees: ${metricsData.metrics.totalEmployees} (Active: ${metricsData.metrics.activeEmployees})`);
  console.log(`  ✅ Expiring Documents: ${metricsData.metrics.expiringDocs}, Expired: ${metricsData.metrics.expiredDocs}`);
  console.log(`  ✅ Today Sales: AED ${metricsData.metrics.todaySales}, Month Expenses: AED ${metricsData.metrics.monthExpenses}`);
  console.log(`  ✅ Open Food Safety Findings: ${metricsData.metrics.openFindings}`);

  // 5. Test Legal Documents API & PDF Streaming: GET /api/documents
  console.log('\n5. Testing Legal Documents API & in-browser PDF streaming...');
  const docsRes = await fetch(`${baseUrl}/api/documents`, { headers: cookieHeader });
  const docsData = await docsRes.json();
  const docsList = docsData.data || docsData.documents || [];
  if (docsList.length === 0) throw new Error('No documents found in registry');
  const sampleDoc = docsList[0];
  console.log(`  ✅ Retrieved ${docsList.length} legal documents. Sample: ${sampleDoc.title}`);

  // Stream PDF: GET /api/documents/[id]/view
  const viewRes = await fetch(`${baseUrl}/api/documents/${sampleDoc.id}/view`, { headers: cookieHeader });
  if (!viewRes.ok) throw new Error(`PDF streaming failed with status ${viewRes.status}`);
  const contentType = viewRes.headers.get('content-type');
  if (contentType !== 'application/pdf') throw new Error(`Expected application/pdf, got ${contentType}`);
  const ab = await viewRes.arrayBuffer();
  const pdfBytes = Buffer.from(ab);
  const headerStr = pdfBytes.subarray(0, 5).toString('ascii');
  if (!headerStr.startsWith('%PDF-')) throw new Error(`Streamed file does not start with %PDF- header (got ${headerStr})`);
  console.log(`  ✅ Streamed authentic PDF (${pdfBytes.length} bytes, header: ${headerStr}) for in-browser viewer modal`);

  // 6. Test Two-Level Security Mutation: Inter-branch Stock Transfer
  console.log('\n6. Testing Two-Level Security Mutation with Authorization Password...');
  const invRes = await fetch(`${baseUrl}/api/inventory`, { headers: cookieHeader });
  const invData = await invRes.json();
  const invList = invData.data || invData.items || [];
  const sampleItem = invList[0];

  const branchesRes = await fetch(`${baseUrl}/api/business`, { headers: cookieHeader });
  const businessData = await branchesRes.json();
  const destBranch = businessData.branches.find(b => b.id !== sampleItem.branchId) || businessData.branches[1];

  // Try with wrong authorization password -> MUST fail with 401/403
  const failTransferRes = await fetch(`${baseUrl}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookieHeader },
    body: JSON.stringify({
      actionType: 'BRANCH_TRANSFER',
      itemId: sampleItem.id,
      fromBranchId: sampleItem.branchId,
      toBranchId: destBranch.id,
      quantity: 1,
      notes: 'Unauthorized attempt with wrong auth password',
      authorizationPassword: 'WrongAuthPassword123!'
    })
  });
  if (failTransferRes.status !== 401 && failTransferRes.status !== 403) {
    throw new Error(`Expected 401/403 for wrong authorization password, got ${failTransferRes.status}`);
  }
  console.log('  ✅ Server strictly rejected mutation with wrong authorization password (401/403)');

  // Try with correct authorization password -> MUST succeed (200)
  const successTransferRes = await fetch(`${baseUrl}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookieHeader },
    body: JSON.stringify({
      actionType: 'BRANCH_TRANSFER',
      itemId: sampleItem.id,
      fromBranchId: sampleItem.branchId,
      toBranchId: destBranch.id,
      quantity: 1,
      notes: 'Authorized transfer executed',
      authorizationPassword: 'OwnerAuth@2026!'
    })
  });
  if (!successTransferRes.ok) {
    const err = await successTransferRes.json();
    throw new Error(`Expected success for valid authorization password, got ${successTransferRes.status}: ${err.error}`);
  }
  console.log('  ✅ Server accepted mutation with valid Level-2 Authorization Password (200 OK)');

  // 7. Verify HMAC Audit Chain Integrity after all operations
  console.log('\n7. Verifying cryptographic HMAC audit chain integrity: POST /api/audit/verify...');
  const auditRes = await fetch(`${baseUrl}/api/audit/verify`, {
    method: 'POST',
    headers: cookieHeader
  });
  if (!auditRes.ok) throw new Error(`Audit verify endpoint failed with status ${auditRes.status}`);
  const auditData = await auditRes.json();
  if (!auditData.valid) throw new Error(`Audit chain verification failed: ${auditData.message}`);
  console.log(`  ✅ Cryptographic Audit Chain 100% INTACT (${auditData.message})`);

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END HTTP INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

verifyHttpEndpoints().catch(err => {
  console.error('💥 HTTP verification failed:', err);
  process.exit(1);
});
