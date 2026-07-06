-- =============================================================================
-- 08_seed_api_keys.sql  |  รันหลัง 07_api_key_and_login_security.sql
-- Gen API key เริ่มต้นให้ทุกบริษัท (ผ่าน sp_regenerate_company_api_key เหมือน endpoint จริง)
-- คีย์จริงโชว์ได้ที่นี่ครั้งเดียวเท่านั้น — DB เก็บแค่ SHA-256 hash ไม่เก็บ plain text
-- รันซ้ำได้ (idempotent) แต่จะ "regenerate" คีย์ใหม่ทับของเดิมทุกครั้งที่รัน — ระวังถ้ามีใครใช้คีย์เดิมอยู่แล้ว
-- =============================================================================

-- BKC
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'BKC',
    @api_key_hash = 'f05b904f2b08a59081d0033894f5a563a62345efd23dfb8d85db9f53e6e915e8';

-- DEMO
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'DEMO',
    @api_key_hash = 'a6fa541b5cc99eeed8a6986add6207d2de3067e01730ff946ab18e6e99e3e1bf';

-- ACME
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'ACME',
    @api_key_hash = '48007133e7f6b90114758a439026b2e561b2e4577ffabc59772d9af0b746f46e';

-- NT
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'NT',
    @api_key_hash = '116912cb96caddd6fdef00b1256dd051c7595ae00968f038d099070f69e158a1';

-- SRI
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'SRI',
    @api_key_hash = '3567e32a054832f8708ed3a9184cd4efb1f550dd01e4ce09393aa08d7b10f97c';

-- NBMT
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'NBMT',
    @api_key_hash = '30e7703bfd2d379344f3e89a79f1b2475cacf17e2dcdfb764f9c118b6529ec7c';

-- EXT
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'EXT',
    @api_key_hash = '2c47b7ff536a35637b2629a13b41fd33be0d2f93801051271b65d2f9ea9b4f8d';

-- GSYI
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'GSYI',
    @api_key_hash = '2a77b468c50e5fbfe475bd802a66f3c28a2008b2d80e8b23cb635c67bf3b959a';

-- KYBT
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'KYBT',
    @api_key_hash = '82d8101375dc9308f564d68d4331ac8c32d56633316dc2d1de32c44bdf4c6428';

-- SGS
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'SGS',
    @api_key_hash = '987c05bcfadeea455a8f7aa310d0def7b5a8605f75ed07946bf97d481cdc5efc';

-- SNSS
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'SNSS',
    @api_key_hash = '107ec202f9315408e34e75c667aa0514c7205198d90cf49b34b602e4835104b9';

-- MSFT
EXEC smg.sp_regenerate_company_api_key
    @company_code = 'MSFT',
    @api_key_hash = '4130b3a76f2b88796593ae4635fd59bac064fb043e04e45baf066eaeb045e5c0';
GO

PRINT '08_seed_api_keys.sql completed.';
GO
