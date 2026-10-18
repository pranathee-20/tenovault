# TENOVAULT: Tenant Safe Workspace Portal & API with Security Traceability

> **Multi-Tenant SaaS Workspace Security Engine** featuring **TenantGuard** (server-side 4-step authorization), **TenantTrace** (structured audit events ledger), **Automated Security Test Lab** (Supertest assertions), and **Attack Simulator**.

---

## 🛡️ Security Architecture

### Non-Negotiable TenantGuard Authorization Pipeline
Every protected API request must pass 4 server-side checks in strict order:
1. **Authenticate Identity**: Cryptographically verify JWT signature (HMAC-SHA256), token expiration, and algorithm. Reject missing or forged tokens (`AUTH_NO_TOKEN`, `AUTH_INVALID_TOKEN`).
2. **Verify Server-Side Tenant Membership**: Lookup identity in trusted server database records. Validate that caller's database `tenant_id` matches claims. Any untrusted client-supplied headers (e.g. `x-tenant-id`, `x-target-tenant`) are rejected as context spoofing attempts (`SPOOFED_TENANT_HEADER_IGNORED`).
3. **Verify Role Permissions (RBAC)**: Enforce role requirements (`Admin`, `Editor`, `Viewer`) on the server. Viewers cannot mutate records, and audit logs/export/stats/anomalies are strictly **Admin only** (`ROLE_PERMISSION_DENIED`).
4. **Verify Target Resource Tenant Ownership**: Confirm target document `tenant_id` matches authenticated user's `tenant_id`. If cross-tenant access is attempted, return safe `404 Not Found` (identical to missing document response) to prevent resource existence disclosure (`CROSS_TENANT_RESOURCE_ACCESS_DENIED`).

### Dual-Layer Defense-in-Depth
- **Layer 1 (TenantGuard Middleware)**: Express middleware intercepting all routes, strictly scoping every database query and mutation.
- **Layer 2 (PostgreSQL Native Row-Level Security)**: Database-level kernel isolation with `current_setting('app.current_tenant_id')`. Complete DDL and RLS policies are prepared in SQL only and are **NOT active** in the current in-memory demo.

---

## 👥 Seeded Synthetic Tenants & Roles

All accounts utilize safe synthetic demo data only (Password: `DemoSafe!2026`).

| Organization | Tenant ID | User | Role | Department | Access Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Acme Labs Inc.** | `tenant-acme-corp` | `alice@acme.test` | Admin | InfoSec & Compliance | Full Access + Logs & Export |
| **Acme Labs Inc.** | `tenant-acme-corp` | `bob@acme.test` | Editor | Quantum Engineering | Workspace Docs (Read/Write) |
| **Acme Labs Inc.** | `tenant-acme-corp` | `charlie@acme.test` | Viewer | Operations & Strategy | Workspace Docs (Read-only) |
| **BlueNova Systems** | `tenant-bluenova-sys` | `diana@bluenova.test` | Admin | Cyber Risk & Governance | Full Access + Logs & Export |
| **BlueNova Systems** | `tenant-bluenova-sys` | `evan@bluenova.test` | Editor | Autonomous Cloud Platform | Workspace Docs (Read/Write) |
| **BlueNova Systems** | `tenant-bluenova-sys` | `fiona@bluenova.test` | Viewer | Executive Finance | Workspace Docs (Read-only) |

*Note: Audit logs, stats, anomalies, and CSV/JSON audit exports are restricted to **Admin** role only.*

---

## 🧪 Automated Security Test Suite (25 Tests)

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
16. `SEC-016` - **System Reset Protection** (Require Admin role & DEMO_MODE, logged to audit trail)
17. `SEC-017` - **Demo Accounts Endpoint Gating** (Returns 404 when DEMO_MODE is disabled)
18. `SEC-018` - **JWT Secret Enforcement** (Missing JWT_SECRET in production fails securely)
19. `SEC-019` - **Target Tenant Anonymization** (Attacker logs/exports strip target tenant ID and hide target name)
20. `SEC-020` - **Identical 404 Responses for Foreign and Missing Documents** (Zero information leakage)
21. `SEC-021` - **Victim Log Anonymization** (Victim log records external attack without revealing attacker email or ID)
22. `SEC-022` - **Admin-Only Audit & Stats RBAC Enforcement** (Editor/Viewer get 403 on audit-events, export, stats, anomalies)
23. `SEC-023` - **Old Hard-Coded Secret Rejection** (Tokens signed with legacy hard-coded secret rejected with 401)
24. `SEC-024` - **Real 24h Hourly Chart Stats Buckets** (Bucket totals sum to real allowed and denied totals)
25. `SEC-025` - **Email-Based Login Rate Limiting** (5 wrong passwords within 5 minutes triggers 429 and RATE_LIMIT_EXCEEDED across rotated IPs)

---

## ⚠️ Known Limitations
- **Demo-Grade Login**: Credentials are verified against seeded synthetic records; external SSO or enterprise IdP integration is not implemented.
- **In-Memory Storage**: Data persists in server memory and resets upon app restart or via the protected reset demo endpoint.
- **RLS Not Active**: PostgreSQL Row-Level Security DDL and policies are provided as reference schemas only and are not active in the current in-memory demo runtime.
- **No MFA or Password Reset**: Multi-factor authentication, email verification, and self-service password reset flows are out of scope.
- **Azure Deployment**: Multi-cloud deployment to Azure Container Apps or AWS ECS is currently architectural planning only.

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

- `POST /api/auth/login` - Authenticate identity, obtain short-lived JWT, and enforce email rate limiting.
- `GET /api/auth/me` - Retrieve verified identity, tenant metadata, and database status ("Planned, not active").
- `GET /api/documents` - List workspace documents (strictly tenant-scoped).
- `GET /api/documents/:id` - Read document with TenantGuard ownership verification.
- `POST /api/documents` - Create document stamped with server-side tenant ID (Admin/Editor).
- `PUT /api/documents/:id` - Update document and recalculate SHA-256 hash (Admin/Editor).
- `DELETE /api/documents/:id` - Delete document (Admin only).
- `GET /api/audit-events` - Query audit timeline isolated to admin tenant.
- `GET /api/audit-events/stats` - 24h hourly analytics buckets (Admin only).
- `GET /api/audit-events/export` - Export audit events in CSV or JSON (Admin only).
- `POST /api/security-lab/run` - Trigger live Supertest security assertions.
- `POST /api/simulator/launch` - Execute controlled safe attack vector.
- `GET /api/anomalies` - Retrieve heuristic anomaly detections (Admin only).
- `GET /api/docs/openapi.json` - Raw OpenAPI 3.0 specification.
