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

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  department: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface WorkspaceDocument {
  id: string;
  tenantId: string;
  title: string;
  classification: 'CONFIDENTIAL' | 'RESTRICTED' | 'INTERNAL' | 'PUBLIC';
  category: 'Strategy' | 'Engineering' | 'Financial' | 'Legal' | 'Compliance';
  contentSnippet: string;
  fullContent: string;
  contentHash: string; // SHA-256 for integrity verification
  createdByUserId: string;
  createdByName: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type AuditDecision = 'ALLOWED' | 'DENIED';

export type AuditAction =
  | 'DOCUMENT_READ'
  | 'DOCUMENT_LIST'
  | 'DOCUMENT_CREATE'
  | 'DOCUMENT_UPDATE'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_SEARCH'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'USER_READ'
  | 'AUDIT_VIEW'
  | 'AUDIT_EXPORT'
  | 'SIMULATED_ATTACK'
  | 'CROSS_TENANT_READ_ATTEMPT'
  | 'CROSS_TENANT_UPDATE_ATTEMPT'
  | 'CROSS_TENANT_DELETE_ATTEMPT';

export type DenialReasonCode =
  | 'AUTH_NO_TOKEN'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_TOKEN_EXPIRED'
  | 'TENANT_MEMBERSHIP_MISMATCH'
  | 'ROLE_PERMISSION_DENIED'
  | 'CROSS_TENANT_RESOURCE_ACCESS_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'SPOOFED_TENANT_HEADER_IGNORED'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMIT_EXCEEDED';

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO UTC
  requestId: string;
  tenantId: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: UserRole | 'unauthenticated';
  action: AuditAction;
  resourceType: 'document' | 'user' | 'audit_event' | 'session' | 'system';
  resourceId: string;
  targetTenantId?: string; // If an attempted attack targeted another tenant
  decision: AuditDecision;
  denialReasonCode?: DenialReasonCode;
  safeDetail: string; // Non-sensitive sanitized explanation
  ipAddress: string;
  userAgent: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface SecurityTestCase {
  id: string;
  title: string;
  category: 'CROSS_TENANT_ISOLATION' | 'RBAC_ENFORCEMENT' | 'AUTH_INTEGRITY' | 'IDOR_RESISTANCE';
  description: string;
  actorDescription: string;
  targetDescription: string;
  expectedStatus: number;
  expectedDecision: AuditDecision;
  expectedReasonCode?: DenialReasonCode;
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
  auditEventCreated?: AuditEvent;
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
  ruleId: 'HIGH_FREQUENCY_DENIAL' | 'SEQUENTIAL_IDOR_SCAN' | 'CROSS_TENANT_BREACH_ATTEMPT' | 'ROLE_OVERREACH';
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
