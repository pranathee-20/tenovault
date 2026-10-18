/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tenant, User, WorkspaceDocument, AuditEvent, SecurityTestRunSummary, SuspiciousActivityAlert, SafeUser } from '../types.js';

export interface DatabaseAdapter {
  name: string;
  type: 'in-memory' | 'postgresql';
  isConnected(): boolean;
  getConnectionInfo(): {
    engine: string;
    mode: string;
    rlsStatus: 'READY_IN_DDL' | 'ACTIVE' | 'NOT_CONFIGURED';
    detail: string;
  };

  // Tenants
  getTenantById(tenantId: string): Promise<Tenant | null>;
  getAllTenants(): Promise<Tenant[]>;

  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  getUsersByTenant(tenantId: string): Promise<SafeUser[]>;

  // Documents (Strictly tenant scoped)
  getDocumentsByTenant(tenantId: string, searchQuery?: string): Promise<WorkspaceDocument[]>;
  getDocumentById(tenantId: string, documentId: string): Promise<WorkspaceDocument | null>;
  // For security testing only: get document without tenant filter to verify cross-tenant state and integrity
  getRawDocumentById(documentId: string): Promise<WorkspaceDocument | null>;
  createDocument(doc: Omit<WorkspaceDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'contentHash'>): Promise<WorkspaceDocument>;
  updateDocument(tenantId: string, documentId: string, updates: Partial<Pick<WorkspaceDocument, 'title' | 'classification' | 'category' | 'fullContent'>>, updatedBy: SafeUser): Promise<WorkspaceDocument | null>;
  deleteDocument(tenantId: string, documentId: string): Promise<boolean>;

  // Audit Events
  createAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent>;
  getAuditEventsByTenant(tenantId: string, filters?: {
    action?: string;
    decision?: string;
    severity?: string;
    search?: string;
    limit?: number;
  }): Promise<AuditEvent[]>;
  getAuditEventById(tenantId: string, eventId: string): Promise<AuditEvent | null>;

  // Security Test Runs
  saveSecurityTestRun(run: SecurityTestRunSummary): Promise<void>;
  getLatestSecurityTestRun(): Promise<SecurityTestRunSummary | null>;

  // Suspicious Activity Alerts
  getSuspiciousAlerts(tenantId: string): Promise<SuspiciousActivityAlert[]>;
  dismissAlert?(alertId: string): Promise<void>;

  // Reset to initial seed state
  resetToSeed(): Promise<void>;
}
