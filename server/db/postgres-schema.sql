-- ============================================================================
-- TENOVAULT PostgreSQL Multi-Tenant Database Schema with Row-Level Security (RLS)
-- Defense-in-Depth Layer 2 (Works in synergy with Layer 1 TenantGuard Middleware)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean teardown (for fresh initialization)
-- DROP TABLE IF EXISTS audit_events CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS tenants CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Tenants Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'enterprise',
    compliance_level VARCHAR(64) NOT NULL DEFAULT 'SOC2_TYPE2_HIPAA_ISO27001',
    isolation_mode VARCHAR(64) NOT NULL DEFAULT 'row_level_isolated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 3. Documents Table (Multi-tenant core workspace assets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    classification VARCHAR(32) NOT NULL CHECK (classification IN ('CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC')),
    category VARCHAR(64) NOT NULL CHECK (category IN ('Strategy', 'Engineering', 'Financial', 'Legal', 'Compliance')),
    content_snippet TEXT NOT NULL,
    full_content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 integrity hash
    version INTEGER NOT NULL DEFAULT 1,
    created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    created_by_name VARCHAR(255) NOT NULL,
    updated_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    updated_by_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Audit Events Table (TenantTrace structured append-only event ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    target_tenant_id VARCHAR(64),
    decision VARCHAR(16) NOT NULL CHECK (decision IN ('ALLOWED', 'DENIED')),
    denial_reason_code VARCHAR(64),
    safe_detail TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_time ON audit_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id ON audit_events(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_decision ON audit_events(decision);

-- ----------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Configuration
-- ----------------------------------------------------------------------------
-- Enforce RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Enforce RLS on audit_events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- Note: The server establishes the tenant context per transaction using:
-- SET LOCAL app.current_tenant_id = 'tenant-acme-corp';
-- Then RESET upon transaction finish.

-- Policy: Documents Isolation
DROP POLICY IF EXISTS tenant_isolation_documents ON documents;
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Policy: Audit Events Isolation (Read only for reviewer tenant, append allowed)
DROP POLICY IF EXISTS tenant_isolation_audit_select ON audit_events;
CREATE POLICY tenant_isolation_audit_select ON audit_events
    FOR SELECT
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_audit_insert ON audit_events;
CREATE POLICY tenant_isolation_audit_insert ON audit_events
    FOR INSERT
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Normal users CANNOT update or delete audit events
CREATE POLICY tenant_isolation_audit_no_update ON audit_events
    FOR UPDATE
    USING (false);

CREATE POLICY tenant_isolation_audit_no_delete ON audit_events
    FOR DELETE
    USING (false);
