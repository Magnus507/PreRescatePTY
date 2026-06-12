-- ============================================================
-- RESET TOTAL DE DATOS DE PRUEBA — PRE RESCATE PTY
-- ============================================================
-- REGLAS:
--  - NO toca _prisma_migrations
--  - NO usa DROP TABLE
--  - Borra en orden de dependencias FK (hijos → padres)
--  - Requiere variable psql: confirm_full_reset='YES_DELETE_ALL_TEST_DATA'
--    Pasar con: psql -v confirm_full_reset='YES_DELETE_ALL_TEST_DATA' -f ...
-- ============================================================

\set ON_ERROR_STOP on

-- Verificación de confirmación via variable psql (pasada con -v)
-- Primero verifica que la variable exista, luego valida su valor
\if :{?confirm_full_reset}
  \if :'confirm_full_reset' = 'YES_DELETE_ALL_TEST_DATA'
  \else
    \echo '❌ FALTA CONFIRMACIÓN: Ejecute con -v confirm_full_reset='\''YES_DELETE_ALL_TEST_DATA'\'
    \quit
  \endif
\else
  \echo '❌ FALTA CONFIRMACIÓN: Ejecute con -v confirm_full_reset='\''YES_DELETE_ALL_TEST_DATA'\'
  \quit
\endif

\echo '✅ Confirmación verificada via variable psql'

BEGIN;

-- Contadores pre-borrado (para reporte)
\echo '=== CONTEOS PRE-BORRADO ==='
SELECT 'AdminUser' AS tabla, count(*) FROM "AdminUser"
UNION ALL SELECT 'CorporateProductRequestItem', count(*) FROM "CorporateProductRequestItem"
UNION ALL SELECT 'CorporateProductRequest', count(*) FROM "CorporateProductRequest"
UNION ALL SELECT 'CorporateOrderEmployeeItem', count(*) FROM "CorporateOrderEmployeeItem"
UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
UNION ALL SELECT 'ChipClaimToken', count(*) FROM "ChipClaimToken"
UNION ALL SELECT 'ScanEvent', count(*) FROM "ScanEvent"
UNION ALL SELECT 'Notification', count(*) FROM "Notification"
UNION ALL SELECT 'AppNotification', count(*) FROM "AppNotification"
UNION ALL SELECT 'Consent', count(*) FROM "Consent"
UNION ALL SELECT 'AuditLog', count(*) FROM "AuditLog"
UNION ALL SELECT 'DigitalPass', count(*) FROM "DigitalPass"
UNION ALL SELECT 'ProfileContact', count(*) FROM "ProfileContact"
UNION ALL SELECT 'Contact', count(*) FROM "Contact"
UNION ALL SELECT 'OrganizationMember', count(*) FROM "OrganizationMember"
UNION ALL SELECT 'OrganizationDepartment', count(*) FROM "OrganizationDepartment"
UNION ALL SELECT 'OrganizationLocation', count(*) FROM "OrganizationLocation"
UNION ALL SELECT 'CorporatePublicProfile', count(*) FROM "CorporatePublicProfile"
UNION ALL SELECT 'Organization', count(*) FROM "Organization"
UNION ALL SELECT 'Chip', count(*) FROM "Chip"
UNION ALL SELECT 'Profile', count(*) FROM "Profile"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'Account', count(*) FROM "Account"
UNION ALL SELECT 'PasswordResetToken', count(*) FROM "PasswordResetToken"
UNION ALL SELECT 'Product', count(*) FROM "Product"
UNION ALL SELECT 'Package', count(*) FROM "Package"
UNION ALL SELECT 'SystemConfig', count(*) FROM "SystemConfig";

-- ============================================================
-- BORRADO EN ORDEN DE DEPENDENCIAS (hijos → padres)
-- ============================================================

-- 1. CorporateProductRequestItem
DELETE FROM "CorporateProductRequestItem";

-- 2. CorporateProductRequest
DELETE FROM "CorporateProductRequest";

-- 3. CorporateOrderEmployeeItem
DELETE FROM "CorporateOrderEmployeeItem";

-- 4. OrderItem
DELETE FROM "OrderItem";

-- 5. ChipClaimToken
DELETE FROM "ChipClaimToken";

-- 6. ScanEvent
DELETE FROM "ScanEvent";

-- 7. Notification
DELETE FROM "Notification";

-- 8. AppNotification
DELETE FROM "AppNotification";

-- 9. Consent
DELETE FROM "Consent";

-- 10. AuditLog
DELETE FROM "AuditLog";

-- 11. DigitalPass
DELETE FROM "DigitalPass";

-- 12. ProfileContact
DELETE FROM "ProfileContact";

-- 13. Contact
DELETE FROM "Contact";

-- 14. OrganizationMember
DELETE FROM "OrganizationMember";

-- 15. OrganizationDepartment
DELETE FROM "OrganizationDepartment";

-- 16. OrganizationLocation
DELETE FROM "OrganizationLocation";

-- 17. CorporatePublicProfile
DELETE FROM "CorporatePublicProfile";

-- 18. Organization
DELETE FROM "Organization";

-- 19. Chip
DELETE FROM "Chip";

-- 20. Profile
DELETE FROM "Profile";

-- 21. Order
DELETE FROM "Order";

-- 22. User (borramos todos — el superadmin se crea después)
DELETE FROM "User";

-- 23. AdminUser (tabla legacy de migración inicial — sin FK, segura de borrar)
DELETE FROM "AdminUser";

-- 24. Account
DELETE FROM "Account";

-- 25. PasswordResetToken
DELETE FROM "PasswordResetToken";

-- 26. Product
DELETE FROM "Product";

-- 27. Package
DELETE FROM "Package";

-- 28. SystemConfig
DELETE FROM "SystemConfig";

COMMIT;

-- ============================================================
-- CONTEOS POST-BORRADO
-- ============================================================
\echo '=== CONTEOS POST-BORRADO (DEBEN SER 0) ==='
SELECT 'AdminUser' AS tabla, count(*) FROM "AdminUser"
UNION ALL SELECT 'CorporateProductRequestItem', count(*) FROM "CorporateProductRequestItem"
UNION ALL SELECT 'CorporateProductRequest', count(*) FROM "CorporateProductRequest"
UNION ALL SELECT 'CorporateOrderEmployeeItem', count(*) FROM "CorporateOrderEmployeeItem"
UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
UNION ALL SELECT 'ChipClaimToken', count(*) FROM "ChipClaimToken"
UNION ALL SELECT 'ScanEvent', count(*) FROM "ScanEvent"
UNION ALL SELECT 'Notification', count(*) FROM "Notification"
UNION ALL SELECT 'AppNotification', count(*) FROM "AppNotification"
UNION ALL SELECT 'Consent', count(*) FROM "Consent"
UNION ALL SELECT 'AuditLog', count(*) FROM "AuditLog"
UNION ALL SELECT 'DigitalPass', count(*) FROM "DigitalPass"
UNION ALL SELECT 'ProfileContact', count(*) FROM "ProfileContact"
UNION ALL SELECT 'Contact', count(*) FROM "Contact"
UNION ALL SELECT 'OrganizationMember', count(*) FROM "OrganizationMember"
UNION ALL SELECT 'OrganizationDepartment', count(*) FROM "OrganizationDepartment"
UNION ALL SELECT 'OrganizationLocation', count(*) FROM "OrganizationLocation"
UNION ALL SELECT 'CorporatePublicProfile', count(*) FROM "CorporatePublicProfile"
UNION ALL SELECT 'Organization', count(*) FROM "Organization"
UNION ALL SELECT 'Chip', count(*) FROM "Chip"
UNION ALL SELECT 'Profile', count(*) FROM "Profile"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'Account', count(*) FROM "Account"
UNION ALL SELECT 'PasswordResetToken', count(*) FROM "PasswordResetToken"
UNION ALL SELECT 'Product', count(*) FROM "Product"
UNION ALL SELECT 'Package', count(*) FROM "Package"
UNION ALL SELECT 'SystemConfig', count(*) FROM "SystemConfig";

-- Verificar _prisma_migrations intacta
\echo '=== _prisma_migrations (DEBE TENER REGISTROS) ==='
SELECT count(*) AS migrations_count FROM "_prisma_migrations";

\echo '✅ RESET COMPLETADO — Tablas de aplicación vacías'
\echo '⚠️  _prisma_migrations INTACTA'