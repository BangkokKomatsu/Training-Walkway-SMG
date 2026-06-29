-- =============================================================================
-- 01_create_schema.sql  |  รัน script นี้ก่อนทุก script อื่น
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'smg')
BEGIN
    EXEC('CREATE SCHEMA smg');
    PRINT 'Schema smg created.';
END
ELSE
    PRINT 'Schema smg already exists — skipped.';
GO
