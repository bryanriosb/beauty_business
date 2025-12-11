-- Script to diagnose feature permission issues
-- Run this against your database to check the current state

-- 1. Check if plan_modules exists and has 'services'
SELECT 'Plan Modules Check:' as check_name;
SELECT id, code, name, is_active 
FROM plan_modules 
WHERE code = 'services';

-- 2. Check business_accounts and their plans
SELECT 'Business Accounts Check:' as check_name;
SELECT 
  ba.id,
  ba.plan_id,
  p.code as plan_code,
  p.name as plan_name
FROM business_accounts ba
LEFT JOIN plans p ON ba.plan_id = p.id
LIMIT 5;

-- 3. Check plan_module_access for services module
SELECT 'Plan Module Access Check:' as check_name;
SELECT 
  pma.id,
  p.code as plan_code,
  pm.code as module_code,
  pma.custom_permissions
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE pm.code = 'services'
ORDER BY p.code;

-- 4. Test the exact query used in checkFeaturePermissionAction
-- Replace 'YOUR_BUSINESS_ACCOUNT_ID' with an actual ID
SELECT 'Test Query for specific business account:' as check_name;
-- This would need to be run with a specific business_account_id
-- SELECT 
--   ba.id,
--   ba.plan_id,
--   p.code as plan_code,
--   pma.custom_permissions,
--   pm.code as module_code
-- FROM business_accounts ba
-- JOIN plans p ON ba.plan_id = p.id
-- JOIN plan_module_access pma ON p.id = pma.plan_id
-- JOIN plan_modules pm ON pma.module_id = pm.id
-- WHERE ba.id = 'YOUR_BUSINESS_ACCOUNT_ID' AND pm.code = 'services';

-- 5. Check feature metadata
SELECT 'Feature Metadata Check:' as check_name;
SELECT 
  pm.code as module_code,
  pma.custom_permissions->>'supply_management' as supply_management_custom,
  p.code as plan_code
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE pm.code = 'services'
ORDER BY p.code;

-- 6. Check if required plans include current plan
SELECT 'Required Plans Check:' as check_name;
SELECT 
  p.code as plan_code,
  CASE 
    WHEN p.code IN ('pro', 'enterprise') THEN 'ALLOWED'
    ELSE 'NOT_ALLOWED'
  END as supply_management_access
FROM plans p
WHERE p.code IN ('free', 'basic', 'pro', 'enterprise')
ORDER BY p.code;
