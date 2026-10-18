/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runAllSecurityTests } from '../server/routes/securityLab.js';
import { app } from '../server/app.js';

async function main() {
  console.log('\n=============================================================');
  console.log('  TENOVAULT AUTOMATED BACKEND SECURITY TEST SUITE (SUPERTEST)');
  console.log('=============================================================\n');

  try {
    const summary = await runAllSecurityTests(app);

    console.log(`Execution Run ID: ${summary.runId}`);
    console.log(`Timestamp:        ${summary.timestamp}`);
    console.log(`Duration:         ${summary.durationMs}ms`);
    console.log(`Total Tests:      ${summary.totalTests}`);
    console.log(`Passed:           ${summary.passed}`);
    console.log(`Failed:           ${summary.failed}\n`);

    console.log('-------------------------------------------------------------');
    console.log('Test Scenario Details:');
    console.log('-------------------------------------------------------------');

    for (const res of summary.results) {
      const badge = res.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      console.log(`[${res.testId}] ${badge} - ${res.title}`);
      console.log(`   Category:  ${res.category}`);
      console.log(`   Expected:  HTTP ${res.expectedStatus} (${res.expectedDecision}) [${res.expectedReasonCode || 'N/A'}]`);
      console.log(`   Actual:    HTTP ${res.actualStatus} (${res.actualDecision}) [${res.actualReasonCode || 'N/A'}]`);
      console.log(`   Integrity: Preserved=${res.recordIntegrityPreserved} (${res.executionTimeMs}ms)`);
      if (res.status === 'FAIL') {
        console.log(`   ERROR:     ${res.error || 'Assertion discrepancy'}`);
      }
      console.log('');
    }

    console.log('=============================================================');
    if (summary.failed === 0) {
      console.log('🎉 ALL SECURITY ASSERTIONS PASSED WITH ZERO LEAKAGE');
      process.exit(0);
    } else {
      console.error(`⚠️ ${summary.failed} SECURITY TESTS FAILED`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

main();
