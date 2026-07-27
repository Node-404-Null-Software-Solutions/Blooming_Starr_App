-- Defense-in-depth tenant isolation for spreadsheet data. Application queries
-- SET LOCAL to this role and set app.business_id inside the same transaction.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'blooming_starr_tenant'
    ) THEN
        CREATE ROLE blooming_starr_tenant
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION
            NOBYPASSRLS;
    END IF;
END
$$;

-- A non-superuser with CREATEROLE may create this safe role, but PostgreSQL
-- reserves changes to SUPERUSER/REPLICATION/BYPASSRLS attributes for a
-- superuser. Assert the existing or newly-created role instead of issuing a
-- redundant privileged ALTER ROLE.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'blooming_starr_tenant'
          AND (
              rolcanlogin
              OR rolsuper
              OR rolcreatedb
              OR rolcreaterole
              OR rolinherit
              OR rolreplication
              OR rolbypassrls
          )
    ) THEN
        RAISE EXCEPTION
            'blooming_starr_tenant exists with unsafe role attributes';
    END IF;
END
$$;

DO $$
BEGIN
    EXECUTE format(
        'GRANT %I TO %I',
        'blooming_starr_tenant',
        current_user
    );
END
$$;

GRANT USAGE ON SCHEMA public TO blooming_starr_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    "AppLogicRule",
    "Employee",
    "FertilizerLog",
    "LookupEntry",
    "OverheadExpense",
    "PlantIntake",
    "PlantSkuReference",
    "PricingEntry",
    "Product",
    "ProductIntake",
    "SalesEntry",
    "ScheduleEntry",
    "TransplantLog",
    "TreatmentTracking"
TO blooming_starr_tenant;

ALTER TABLE "AppLogicRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppLogicRule" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "AppLogicRule"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "Employee"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "FertilizerLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FertilizerLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "FertilizerLog"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "LookupEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LookupEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "LookupEntry"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "OverheadExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OverheadExpense" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "OverheadExpense"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "PlantIntake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlantIntake" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "PlantIntake"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "PlantSkuReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlantSkuReference" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "PlantSkuReference"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "PricingEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "PricingEntry"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "Product"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "ProductIntake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductIntake" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "ProductIntake"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "SalesEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "SalesEntry"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "ScheduleEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "ScheduleEntry"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "TransplantLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransplantLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "TransplantLog"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));

ALTER TABLE "TreatmentTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TreatmentTracking" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "TreatmentTracking"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));
