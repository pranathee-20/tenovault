# TENOVAULT: Tenant Safe Workspace Portal & API with Security Traceability

> **Multi-Tenant SaaS Workspace Security Engine** featuring **TenantGuard** (server-side 4-step authorization), **TenantTrace** (structured audit events ledger), **Automated Security Test Lab** (Supertest assertions), and **Attack Simulator**.

---

## 🛡️ Security Architecture

### Non-Negotiable TenantGuard Authorization Pipeline
Every protected API request must pass 4 server-side checks in strict order:
1. **Authenticate Identity**: Cryptographically verify JWT signature (HMAC-SHA256), token expiration, and payload structure. Reject missing or forged tokens (`AUTH_NO_TOKEN`, `AUTH_INVALID_TOKEN`).
2. **Verify Server-Side Tenant Membership**: Lookup identity in trusted server database records. Validate that caller's database `tenant_id` matches claims. Any untrusted client-supplied headers (e.g. `x-tenant-id`, `x-target-tenant`) are rejected as context spoofing attempts (`SPOOFED_TENANT_HEADER_IGNORED`).
3. **Verify Role Permissions (RBAC)**: Enforce role requirements (`Admin`, `Editor`, `Viewer`) on the server. Viewers cannot mutate records (`ROLE_PERMISSION_DENIED`).
4. **Verify Target Resource Tenant Ownership**: Confirm target document `tenant_id` matches authenticated user's `tenant_id`. If cross-tenant access is attempted, return safe `404 Not Found` to prevent resource existence disclosure (`CROSS_TENANT_RESOURCE_ACCESS_DENIED`).

### Dual-Layer Defense-in-Depth
- **Layer 1 (TenantGuard Middleware)**: Express middleware intercepting all routes, strictly scoping every database query and mutation.
- **Layer 2 (PostgreSQL Native Row-Level Security)**: Database-level kernel isolation with `current_setting('app.current_tenant_id')`. Complete DDL and RLS policies defined in `server/db/postgres-schema.sql`.

---

## 👥 Seeded Synthetic Tenants & Roles

All accounts utilize safe synthetic demo data only (Password: `DemoSafe!2026`).

| Organization | Tenant ID | User | Role | Department |
| :--- | :--- | :--- | :--- | :--- |
| **Acme Labs Inc.** | `tenant-acme-corp` | `alice@acme.test` | Admin | InfoSec & Compliance |
| **Acme Labs Inc.** | `tenant-acme-corp` | `bob@acme.test` | Editor | Quantum Engineering |
| **Acme Labs Inc.** | `tenant-acme-corp` | `charlie@acme.test` | Viewer | Operations & Strategy |
| **BlueNova Systems** | `tenant-bluenova-sys` | `diana@bluenova.test` | Admin | Cyber Risk & Governance |
| **BlueNova Systems** | `tenant-bluenova-sys` | `evan@bluenova.test` | Editor | Autonomous Cloud Platform |
| **BlueNova Systems** | `tenant-bluenova-sys` | `fiona@bluenova.test` | Viewer | Executive Finance |

---

## 🧪 Automated Security Test Suite (14 Tests)

Run the backend security test suite via CLI:
```bash
npm test
```

### Verified Test Cases:
1. `SEC-001` - **Unauthenticated Request Interception** (Assert HTTP 401 & `AUTH_NO_TOKEN`)
2. `SEC-002` - **Tampered JWT Signature Rejection** (Assert HTTP 401 & `AUTH_INVALID_TOKEN`)
3. `SEC-003` - **Tenant Membership Spoofing Detection** (Assert HTTP 403 & `TENANT_MEMBERSHIP_MISMATCH`)
4. `SEC-004` - **Cross-Tenant Document READ Prevention** (Assert HTTP 404 & `CROSS_TENANT_RESOURCE_ACCESS_DENIED`)
5. `SEC-005` - **Cross-Tenant Document UPDATE Mutation Denial & State Integrity** (Assert HTTP 404 & SHA-256 unchanged)
6. `SEC-006` - **Cross-Tenant Document DELETE Prevention & Record Preservation** (Assert HTTP 404 & Document remains)
7. `SEC-007` - **Tenant-ID Header Spoofing Neutralization** (Assert HTTP 403 & `SPOOFED_TENANT_HEADER_IGNORED`)
8. `SEC-008` - **Viewer Role Write Restriction Enforcement** (Assert HTTP 403 & `ROLE_PERMISSION_DENIED`)
9. `SEC-009` - **Sequential IDOR Guessing & Enumeration Resistance** (Assert HTTP 404 on batch scanning)
10. `SEC-010` - **Legitimate Same-Tenant Permitted Read Control** (Assert HTTP 200 & verified title)
11. `SEC-011` - **Legitimate Same-Tenant Update Control** (Assert HTTP 200 & version increment)
12. `SEC-012` - **Audit Event Ledger Tenant Boundary Isolation** (Assert 0 foreign events returned)
13. `SEC-013` - **Workspace Document Search & List Tenant Partitioning** (Assert 0 foreign documents returned)
14. `SEC-014` - **Denied Mutations Record Integrity Invariance** (Assert bit-for-bit SHA-256 match before and after)
15. `SEC-015` - **Audit Events CSV/JSON Export Tenant Isolation & RBAC** (Assert exported records scoped to tenant, zero foreign records, formula injection neutralized, Viewer denied with 403)

---

## 🔍 Search Highlighting & Audit Export

- **Tenant-Scoped Audit Export (CSV & JSON)**: Reviewers can download audit logs formatted in CSV or JSON. The server verifies identity, membership, and RBAC, strictly scoping exported rows to the caller's tenant. Formula injection characters (`=`, `+`, `-`, `@`) in CSV fields are safely sanitized.
- **Search Highlighting**: Interactive matching word highlights on document search results (titles, snippets, categories, full content) and audit event logs (actors, actions, resources, reason codes, descriptions) for swift triage of suspicious activity.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000` with Express backend API routes and Vite frontend SPA mounted concurrently.

### 3. Run Security Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📡 API Endpoints (OpenAPI 3.0)

- `POST /api/auth/login` - Authenticate identity and obtain short-lived JWT.
- `GET /api/auth/me` - Retrieve verified identity and tenant metadata.
- `GET /api/documents` - List workspace documents (strictly tenant-scoped).
- `GET /api/documents/:id` - Read document with TenantGuard ownership verification.
- `POST /api/documents` - Create document stamped with server-side tenant ID (Admin/Editor).
- `PUT /api/documents/:id` - Update document and recalculate SHA-256 hash (Admin/Editor).
- `DELETE /api/documents/:id` - Delete document (Admin only).
- `GET /api/audit-events` - Query audit timeline isolated to reviewer tenant.
- `POST /api/security-lab/run` - Trigger live Supertest security assertions.
- `POST /api/simulator/launch` - Execute controlled safe attack vector.
- `GET /api/anomalies` - Retrieve heuristic anomaly detections.
- `GET /api/docs/openapi.json` - Raw OpenAPI 3.0 specification.
