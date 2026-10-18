/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseAdapter } from './adapter.js';
import {
  Tenant,
  User,
  WorkspaceDocument,
  AuditEvent,
  SecurityTestRunSummary,
  SuspiciousActivityAlert,
  SafeUser
} from '../types.js';

export class InMemoryDatabaseAdapter implements DatabaseAdapter {
  public name = 'In-Memory Tenant Isolation Engine';
  public type: 'in-memory' | 'postgresql' = 'in-memory';

  private tenants: Map<string, Tenant> = new Map();
  private users: Map<string, User> = new Map();
  private documents: Map<string, WorkspaceDocument> = new Map();
  private auditEvents: AuditEvent[] = [];
  private testRuns: SecurityTestRunSummary[] = [];
  private dismissedAlertIds: Set<string> = new Set();

  constructor() {
    this.seedInitialData();
  }

  public isConnected(): boolean {
    return true;
  }

  public getConnectionInfo(): {
    engine: string;
    mode: string;
    rlsStatus: 'READY_IN_DDL' | 'ACTIVE' | 'NOT_CONFIGURED';
    detail: string;
  } {
    return {
      engine: 'TENOVAULT In-Memory Store (Zero-Friction Runtime Adapter)',
      mode: 'Isolated Tenant Partitioning with Memory Boundary Verification',
      rlsStatus: 'READY_IN_DDL' as const,
      detail: 'Running in self-contained demo mode. PostgreSQL adapter boundary and RLS scripts are fully configured in server/db/postgres-schema.sql.'
    };
  }

  public calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  public async resetToSeed(): Promise<void> {
    this.tenants.clear();
    this.users.clear();
    this.documents.clear();
    this.auditEvents = [];
    this.testRuns = [];
    this.dismissedAlertIds.clear();
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Tenants
    const acmeTenant: Tenant = {
      id: 'tenant-acme-corp',
      name: 'Acme Labs Inc.',
      slug: 'acme-labs',
      createdAt: '2026-01-15T08:00:00Z',
      tier: 'enterprise',
      complianceLevel: 'SOC2_TYPE2_HIPAA',
      isolationMode: 'row_level_isolated'
    };

    const blueNovaTenant: Tenant = {
      id: 'tenant-bluenova-sys',
      name: 'BlueNova Systems Corp.',
      slug: 'bluenova-sys',
      createdAt: '2026-02-01T09:30:00Z',
      tier: 'enterprise',
      complianceLevel: 'ISO27001_GDPR',
      isolationMode: 'row_level_isolated'
    };

    this.tenants.set(acmeTenant.id, acmeTenant);
    this.tenants.set(blueNovaTenant.id, blueNovaTenant);

    // Default password hash for "DemoSafe!2026"
    // Pre-computed bcrypt hash of "DemoSafe!2026" with 10 salt rounds for immediate startup speed
    const demoPasswordHash = bcrypt.hashSync('DemoSafe!2026', 10);

    // 2. Users for Acme Labs
    const acmeUsers: User[] = [
      {
        id: 'usr-acme-alice-admin',
        tenantId: 'tenant-acme-corp',
        email: 'alice@acme.test',
        name: 'Alice Vance',
        role: 'admin',
        passwordHash: demoPasswordHash,
        department: 'Information Security & Compliance',
        createdAt: '2026-01-15T08:05:00Z',
        lastLoginAt: '2026-10-18T02:45:00Z'
      },
      {
        id: 'usr-acme-bob-editor',
        tenantId: 'tenant-acme-corp',
        email: 'bob@acme.test',
        name: 'Bob Martin',
        role: 'editor',
        passwordHash: demoPasswordHash,
        department: 'Quantum Engineering',
        createdAt: '2026-01-15T08:10:00Z',
        lastLoginAt: '2026-10-17T18:20:00Z'
      },
      {
        id: 'usr-acme-charlie-viewer',
        tenantId: 'tenant-acme-corp',
        email: 'charlie@acme.test',
        name: 'Charlie Chen',
        role: 'viewer',
        passwordHash: demoPasswordHash,
        department: 'Operations & Strategy',
        createdAt: '2026-01-15T08:15:00Z',
        lastLoginAt: '2026-10-16T11:00:00Z'
      }
    ];

    // 3. Users for BlueNova Systems
    const blueNovaUsers: User[] = [
      {
        id: 'usr-blue-diana-admin',
        tenantId: 'tenant-bluenova-sys',
        email: 'diana@bluenova.test',
        name: 'Diana Prince',
        role: 'admin',
        passwordHash: demoPasswordHash,
        department: 'Cyber Risk & Governance',
        createdAt: '2026-02-01T09:35:00Z',
        lastLoginAt: '2026-10-18T01:15:00Z'
      },
      {
        id: 'usr-blue-evan-editor',
        tenantId: 'tenant-bluenova-sys',
        email: 'evan@bluenova.test',
        name: 'Evan Wright',
        role: 'editor',
        passwordHash: demoPasswordHash,
        department: 'Autonomous Cloud Platform',
        createdAt: '2026-02-01T09:40:00Z',
        lastLoginAt: '2026-10-17T16:05:00Z'
      },
      {
        id: 'usr-blue-fiona-viewer',
        tenantId: 'tenant-bluenova-sys',
        email: 'fiona@bluenova.test',
        name: 'Fiona Gallagher',
        role: 'viewer',
        passwordHash: demoPasswordHash,
        department: 'Executive Finance',
        createdAt: '2026-02-01T09:45:00Z',
        lastLoginAt: '2026-10-15T14:30:00Z'
      }
    ];

    [...acmeUsers, ...blueNovaUsers].forEach((u) => this.users.set(u.id, u));

    // 4. Documents for Acme Labs
    const acmeDocs: WorkspaceDocument[] = [
      {
        id: 'doc-acme-001',
        tenantId: 'tenant-acme-corp',
        title: 'Project Helios: Quantum Lattice Architecture',
        classification: 'CONFIDENTIAL',
        category: 'Engineering',
        contentSnippet: 'Proprietary solid-state cryogenic interconnect specifications and phase coherency telemetry metrics.',
        fullContent: 'Confidential Engineering Specification: Project Helios implements 4,096 qubit optical interconnects operating at 15 mK dilution refrigeration. Unauthorized extraction or inspection violates Acme Labs Non-Disclosure Section 12.',
        contentHash: '',
        version: 3,
        createdByUserId: 'usr-acme-bob-editor',
        createdByName: 'Bob Martin',
        updatedByUserId: 'usr-acme-bob-editor',
        updatedByName: 'Bob Martin',
        createdAt: '2026-03-10T10:00:00Z',
        updatedAt: '2026-09-12T14:22:00Z'
      },
      {
        id: 'doc-acme-002',
        tenantId: 'tenant-acme-corp',
        title: 'FY2027 Capital Allocation & Expansion Runway',
        classification: 'RESTRICTED',
        category: 'Financial',
        contentSnippet: 'Quarterly burn calculations, Series D capitalization table models, and sovereign debt covenants.',
        fullContent: 'Acme Labs Board Confidential: Q4 treasury forecast reserves $48M cash balance, projected breakeven month 18. Strict tenant isolation requires no cross-entity audit visibility.',
        contentHash: '',
        version: 1,
        createdByUserId: 'usr-acme-alice-admin',
        createdByName: 'Alice Vance',
        updatedByUserId: 'usr-acme-alice-admin',
        updatedByName: 'Alice Vance',
        createdAt: '2026-04-01T09:00:00Z',
        updatedAt: '2026-04-01T09:00:00Z'
      },
      {
        id: 'doc-acme-003',
        tenantId: 'tenant-acme-corp',
        title: 'Acme Enterprise Customer Master Security Annex',
        classification: 'INTERNAL',
        category: 'Legal',
        contentSnippet: 'Enterprise SLA agreements, SOC2 compliance commitments, and dedicated zero-trust ingress points.',
        fullContent: 'Legal Annex: Acme Labs customer isolation guarantee mandates that each enterprise workspace tenant cannot enumerate, read, or overwrite competitor records under any API condition.',
        contentHash: '',
        version: 2,
        createdByUserId: 'usr-acme-alice-admin',
        createdByName: 'Alice Vance',
        updatedByUserId: 'usr-acme-charlie-viewer',
        updatedByName: 'Charlie Chen',
        createdAt: '2026-05-18T11:30:00Z',
        updatedAt: '2026-07-20T16:45:00Z'
      }
    ];

    // 5. Documents for BlueNova Systems
    const blueNovaDocs: WorkspaceDocument[] = [
      {
        id: 'doc-blue-001',
        tenantId: 'tenant-bluenova-sys',
        title: 'BlueNova NovaCore Engine v4.8 Architecture',
        classification: 'CONFIDENTIAL',
        category: 'Engineering',
        contentSnippet: 'Zero-copy distributed pipeline for hyper-scale telemetry streaming and transactional consensus.',
        fullContent: 'Proprietary Core System: NovaCore v4.8 utilizes deterministic Raft consensus over RDMA networks. Strictly segregated from competitor entities (e.g., Acme Labs).',
        contentHash: '',
        version: 4,
        createdByUserId: 'usr-blue-evan-editor',
        createdByName: 'Evan Wright',
        updatedByUserId: 'usr-blue-evan-editor',
        updatedByName: 'Evan Wright',
        createdAt: '2026-03-25T13:10:00Z',
        updatedAt: '2026-08-30T17:40:00Z'
      },
      {
        id: 'doc-blue-002',
        tenantId: 'tenant-bluenova-sys',
        title: 'M&A Target Acquisition Valuation & Synergy Modeling',
        classification: 'RESTRICTED',
        category: 'Financial',
        contentSnippet: 'Sensitive target valuation models, debt structuring, and hostile buyout risk mitigations.',
        fullContent: 'BlueNova Board Only: Acquisition pipeline targeting 3 specialized edge computing companies. If leaked to Acme Labs or third parties, material market impact will occur.',
        contentHash: '',
        version: 2,
        createdByUserId: 'usr-blue-diana-admin',
        createdByName: 'Diana Prince',
        updatedByUserId: 'usr-blue-diana-admin',
        updatedByName: 'Diana Prince',
        createdAt: '2026-06-11T08:45:00Z',
        updatedAt: '2026-09-05T11:15:00Z'
      },
      {
        id: 'doc-blue-003',
        tenantId: 'tenant-bluenova-sys',
        title: 'BlueNova SOC2 Type II Independent Audit Workpapers',
        classification: 'INTERNAL',
        category: 'Compliance',
        contentSnippet: 'Auditor access verification logs, penetration test remediations, and encryption key lifecycle.',
        fullContent: 'Compliance Workpapers: Evidence of multitenant isolation controls and cryptographic separation tested under Trust Services Criteria CC6.1 and CC6.3.',
        contentHash: '',
        version: 1,
        createdByUserId: 'usr-blue-diana-admin',
        createdByName: 'Diana Prince',
        updatedByUserId: 'usr-blue-diana-admin',
        updatedByName: 'Diana Prince',
        createdAt: '2026-07-01T15:20:00Z',
        updatedAt: '2026-07-01T15:20:00Z'
      }
    ];

    [...acmeDocs, ...blueNovaDocs].forEach((doc) => {
      doc.contentHash = this.calculateHash(doc.fullContent);
      this.documents.set(doc.id, doc);
    });

    // 6. Seed some initial realistic audit events
    const initialEvents: AuditEvent[] = [
      {
        id: 'aud-seed-001',
        timestamp: '2026-10-18T01:15:22Z',
        requestId: 'req-init-9021',
        tenantId: 'tenant-bluenova-sys',
        actorUserId: 'usr-blue-diana-admin',
        actorEmail: 'diana@bluenova.test',
        actorRole: 'admin',
        action: 'AUTH_LOGIN',
        resourceType: 'session',
        resourceId: 'sess-8812',
        decision: 'ALLOWED',
        safeDetail: 'User authenticated successfully via JWT token issuance',
        ipAddress: '198.51.100.44',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        severity: 'INFO'
      },
      {
        id: 'aud-seed-002',
        timestamp: '2026-10-18T01:16:04Z',
        requestId: 'req-init-9022',
        tenantId: 'tenant-bluenova-sys',
        actorUserId: 'usr-blue-diana-admin',
        actorEmail: 'diana@bluenova.test',
        actorRole: 'admin',
        action: 'DOCUMENT_READ',
        resourceType: 'document',
        resourceId: 'doc-blue-002',
        decision: 'ALLOWED',
        safeDetail: 'TenantGuard verified tenant ownership and admin role',
        ipAddress: '198.51.100.44',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        severity: 'INFO'
      },
      {
        id: 'aud-seed-003',
        timestamp: '2026-10-18T02:45:11Z',
        requestId: 'req-init-9035',
        tenantId: 'tenant-acme-corp',
        actorUserId: 'usr-acme-alice-admin',
        actorEmail: 'alice@acme.test',
        actorRole: 'admin',
        action: 'AUTH_LOGIN',
        resourceType: 'session',
        resourceId: 'sess-4491',
        decision: 'ALLOWED',
        safeDetail: 'User authenticated successfully via credentials verification',
        ipAddress: '203.0.113.19',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        severity: 'INFO'
      },
      {
        id: 'aud-seed-004',
        timestamp: '2026-10-18T02:46:55Z',
        requestId: 'req-init-9036',
        tenantId: 'tenant-acme-corp',
        actorUserId: 'usr-acme-alice-admin',
        actorEmail: 'alice@acme.test',
        actorRole: 'admin',
        action: 'DOCUMENT_LIST',
        resourceType: 'document',
        resourceId: 'collection',
        decision: 'ALLOWED',
        safeDetail: 'Retrieved 3 workspace documents strictly scoped to tenant-acme-corp',
        ipAddress: '203.0.113.19',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        severity: 'INFO'
      }
    ];

    this.auditEvents = initialEvents;
  }

  // --- Tenants ---
  public async getTenantById(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) || null;
  }

  public async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  // --- Users ---
  public async getUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  public async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  public async getUsersByTenant(tenantId: string): Promise<SafeUser[]> {
    const list: SafeUser[] = [];
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId) {
        const { passwordHash: _, ...safe } = u;
        list.push(safe);
      }
    }
    return list;
  }

  // --- Documents (Enforces tenant scoping) ---
  public async getDocumentsByTenant(tenantId: string, searchQuery?: string): Promise<WorkspaceDocument[]> {
    const results: WorkspaceDocument[] = [];
    const query = searchQuery ? searchQuery.toLowerCase().trim() : '';

    for (const doc of this.documents.values()) {
      // STRICT TENANT BOUNDARY: Only return documents belonging to this tenant
      if (doc.tenantId === tenantId) {
        if (
          !query ||
          doc.title.toLowerCase().includes(query) ||
          doc.category.toLowerCase().includes(query) ||
          doc.classification.toLowerCase().includes(query) ||
          doc.contentSnippet.toLowerCase().includes(query)
        ) {
          results.push({ ...doc });
        }
      }
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getDocumentById(tenantId: string, documentId: string): Promise<WorkspaceDocument | null> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      return null;
    }
    // STRICT TENANT BOUNDARY: If tenantId does not match, return null to avoid leaking existence
    if (doc.tenantId !== tenantId) {
      return null;
    }
    return { ...doc };
  }

  public async getRawDocumentById(documentId: string): Promise<WorkspaceDocument | null> {
    const doc = this.documents.get(documentId);
    return doc ? { ...doc } : null;
  }

  public async createDocument(
    data: Omit<WorkspaceDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'contentHash'>
  ): Promise<WorkspaceDocument> {
    const now = new Date().toISOString();
    const id = `doc-${data.tenantId.replace('tenant-', '')}-${Date.now().toString(36)}`;
    const hash = this.calculateHash(data.fullContent);

    const doc: WorkspaceDocument = {
      ...data,
      id,
      contentHash: hash,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    this.documents.set(doc.id, doc);
    return { ...doc };
  }

  public async updateDocument(
    tenantId: string,
    documentId: string,
    updates: Partial<Pick<WorkspaceDocument, 'title' | 'classification' | 'category' | 'fullContent'>>,
    updatedBy: SafeUser
  ): Promise<WorkspaceDocument | null> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.tenantId !== tenantId) {
      return null;
    }

    const newContent = updates.fullContent !== undefined ? updates.fullContent : doc.fullContent;
    const newSnippet = updates.fullContent !== undefined ? (newContent.length > 140 ? newContent.slice(0, 140) + '...' : newContent) : doc.contentSnippet;

    const updatedDoc: WorkspaceDocument = {
      ...doc,
      title: updates.title ?? doc.title,
      classification: updates.classification ?? doc.classification,
      category: updates.category ?? doc.category,
      fullContent: newContent,
      contentSnippet: newSnippet,
      contentHash: this.calculateHash(newContent),
      version: doc.version + 1,
      updatedByUserId: updatedBy.id,
      updatedByName: updatedBy.name,
      updatedAt: new Date().toISOString()
    };

    this.documents.set(documentId, updatedDoc);
    return { ...updatedDoc };
  }

  public async deleteDocument(tenantId: string, documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.tenantId !== tenantId) {
      return false;
    }
    return this.documents.delete(documentId);
  }

  // --- Audit Events ---
  public async createAuditEvent(data: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...data,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    // Prepend so latest is first
    this.auditEvents.unshift(event);
    return event;
  }

  public async getAuditEventsByTenant(
    tenantId: string,
    filters?: {
      action?: string;
      decision?: string;
      severity?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<AuditEvent[]> {
    // STRICT TENANT BOUNDARY: Reviewer can ONLY see audit events belonging to their authorized tenant
    let events = this.auditEvents.filter((e) => e.tenantId === tenantId);

    if (filters?.action) {
      events = events.filter((e) => e.action === filters.action);
    }
    if (filters?.decision) {
      events = events.filter((e) => e.decision === filters.decision);
    }
    if (filters?.severity) {
      events = events.filter((e) => e.severity === filters.severity);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      events = events.filter(
        (e) =>
          e.actorEmail.toLowerCase().includes(q) ||
          e.resourceId.toLowerCase().includes(q) ||
          e.requestId.toLowerCase().includes(q) ||
          (e.safeDetail && e.safeDetail.toLowerCase().includes(q))
      );
    }

    if (filters?.limit && filters.limit > 0) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  public async getAuditEventById(tenantId: string, eventId: string): Promise<AuditEvent | null> {
    const event = this.auditEvents.find((e) => e.id === eventId);
    if (!event || event.tenantId !== tenantId) {
      return null;
    }
    return event;
  }

  // --- Security Test Runs ---
  public async saveSecurityTestRun(run: SecurityTestRunSummary): Promise<void> {
    this.testRuns.unshift(run);
  }

  public async getLatestSecurityTestRun(): Promise<SecurityTestRunSummary | null> {
    return this.testRuns.length > 0 ? this.testRuns[0] : null;
  }

  // --- Suspicious Activity Alerts ---
  public async getSuspiciousAlerts(tenantId: string): Promise<SuspiciousActivityAlert[]> {
    const alerts: SuspiciousActivityAlert[] = [];
    const tenantEvents = this.auditEvents.filter((e) => e.tenantId === tenantId);

    // Rule 1: High frequency denial (>2 denials in recent events)
    const recentDenials = tenantEvents.filter((e) => e.decision === 'DENIED');
    if (recentDenials.length >= 2) {
      const alertId = `alert-high-freq-${tenantId}`;
      if (!this.dismissedAlertIds.has(alertId)) {
        alerts.push({
          id: alertId,
          tenantId,
          ruleId: 'HIGH_FREQUENCY_DENIAL',
          title: 'Repeated Authorization Denials Detected',
          severity: 'HIGH',
          description: `Observed ${recentDenials.length} denied requests within the monitoring window. Likely scanning or privilege probing attempt.`,
          actorEmail: recentDenials[0]?.actorEmail || 'unauthenticated',
          triggerTimestamp: recentDenials[0]?.timestamp || new Date().toISOString(),
          relatedAuditIds: recentDenials.slice(0, 5).map((e) => e.id),
          recommendedAction: 'Inspect actor IP, review requested resources, and verify if token credentials were leaked or revoked.',
          isSimulated: true
        });
      }
    }

    // Rule 2: Sequential IDOR Scan / Guessing
    const sequentialAttempts = recentDenials.filter(
      (e) =>
        e.denialReasonCode === 'CROSS_TENANT_RESOURCE_ACCESS_DENIED' ||
        e.denialReasonCode === 'RESOURCE_NOT_FOUND'
    );
    if (sequentialAttempts.length >= 2) {
      const alertId = `alert-idor-scan-${tenantId}`;
      if (!this.dismissedAlertIds.has(alertId)) {
        alerts.push({
          id: alertId,
          tenantId,
          ruleId: 'SEQUENTIAL_IDOR_SCAN',
          title: 'Sequential Document ID Enumeration / Traversal',
          severity: 'CRITICAL',
          description: 'Client attempted to access resources matching predictable sequential patterns across foreign tenant boundaries.',
          actorEmail: sequentialAttempts[0]?.actorEmail || 'unknown',
          triggerTimestamp: sequentialAttempts[0]?.timestamp || new Date().toISOString(),
          relatedAuditIds: sequentialAttempts.map((e) => e.id),
          recommendedAction: 'Enforce IP-level rate limiting, invalidate the active user session, and review audit trail for exfiltration attempts.',
          isSimulated: true
        });
      }
    }

    // Rule 3: Role Overreach (Viewer attempting Write/Delete)
    const roleOverreach = tenantEvents.find((e) => e.denialReasonCode === 'ROLE_PERMISSION_DENIED');
    if (roleOverreach) {
      const alertId = `alert-role-overreach-${tenantId}`;
      if (!this.dismissedAlertIds.has(alertId)) {
        alerts.push({
          id: alertId,
          tenantId,
          ruleId: 'ROLE_OVERREACH',
          title: 'Role Overreach / Write Escalation Attempt',
          severity: 'MEDIUM',
          description: `User '${roleOverreach.actorEmail}' with role '${roleOverreach.actorRole}' attempted restricted mutation action '${roleOverreach.action}'.`,
          actorEmail: roleOverreach.actorEmail,
          triggerTimestamp: roleOverreach.timestamp,
          relatedAuditIds: [roleOverreach.id],
          recommendedAction: 'Confirm whether user role configuration is appropriate or if unauthorized interface modification was attempted.',
          isSimulated: true
        });
      }
    }

    return alerts;
  }

  public async dismissAlert(alertId: string): Promise<void> {
    this.dismissedAlertIds.add(alertId);
  }
}
