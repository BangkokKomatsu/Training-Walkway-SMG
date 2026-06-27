-- =============================================================================
-- 01_create_schema.sql  |  รัน script นี้ก่อนทุก script อื่น
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ww')
BEGIN
    EXEC('CREATE SCHEMA ww');
    PRINT 'Schema ww created.';
END
ELSE
    PRINT 'Schema ww already exists — skipped.';
GO
