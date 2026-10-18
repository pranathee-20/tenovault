/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  tier: 'enterprise' | 'growth' | 'starter';
  complianceLevel: string;
  isolationMode: 'row_level_isolated' | 'dedicated_schema';
}

export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface WorkspaceDocument {
  id: string;
  tenantId: string;
  title: string;
  classification: 'CONFIDENTIAL' | 'RESTRICTED' | 'INTERNAL' | 'PUBLIC';
  category: 'Strategy' | 'Engineering' | 'Financial' | 'Legal' | 'Compliance';
  contentSnippet: string;
  fullContent: string;
  contentHash: string;
  createdByUserId: string;
  createdByName: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type AuditDecision = 'ALLOWED' | 'DENIED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  requestId: string;
  tenantId: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: UserRole | 'unauthenticated';
  action: string;
  resourceType: 'document' | 'user' | 'audit_event' | 'session' | 'system';
  resourceId: string;
  targetTenantId?: string;
  decision: AuditDecision;
  denialReasonCode?: string;
  safeDetail: string;
  ipAddress: string;
  userAgent: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface SecurityTestExecutionResult {
  testId: string;
  title: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'NOT_RUN';
  expectedStatus: number;
  actualStatus: number;
  expectedDecision: AuditDecision;
  actualDecision: AuditDecision;
  expectedReasonCode?: string;
  actualReasonCode?: string;
  beforeRecordHash?: string;
  afterRecordHash?: string;
  recordIntegrityPreserved: boolean;
  requestDetails: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
  };
  responseDetails: {
    status: number;
    body: any;
  };
  executionTimeMs: number;
  error?: string;
}

export interface SecurityTestRunSummary {
  runId: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: SecurityTestExecutionResult[];
}

export interface SuspiciousActivityAlert {
  id: string;
  tenantId: string;
  ruleId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  actorEmail: string;
  triggerTimestamp: string;
  relatedAuditIds: string[];
  recommendedAction: string;
  isSimulated: boolean;
}

export interface ApiRouteCoverage {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requiredRole: 'Any' | 'Editor+' | 'Admin';
  tenantGuardSteps: string[];
  testedInLab: boolean;
  testStatus: 'PASS' | 'FAIL' | 'NOT_RUN';
  associatedSecurityTests: string[];
}
