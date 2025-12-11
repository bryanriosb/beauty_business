-- Verificar que la lógica de contar negocios en trial funciona
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar business accounts en trial
SELECT
  'BUSINESS ACCOUNTS EN TRIAL' as check_type,
  COUNT(*) as count
FROM business_accounts
WHERE status = 'trial' AND trial_ends_at > CURRENT_TIMESTAMP;

-- 2. Verificar businesses asociados
SELECT
  'BUSINESSES ASOCIADOS A TRIAL ACCOUNTS' as check_type,
  COUNT(b.*) as count
FROM businesses b
JOIN business_accounts ba ON ba.id = b.business_account_id
WHERE ba.status = 'trial' AND ba.trial_ends_at > CURRENT_TIMESTAMP;

-- 3. Verificar que la query obtiene los business_account_ids correctos
SELECT
  'BUSINESS ACCOUNT IDS ÚNICOS' as check_type,
  array_agg(DISTINCT business_account_id) as ids,
  COUNT(DISTINCT business_account_id) as unique_count
FROM businesses
WHERE business_account_id IS NOT NULL;

-- 4. Simular la lógica de la función
WITH business_account_ids AS (
  SELECT DISTINCT business_account_id
  FROM businesses
  WHERE business_account_id IS NOT NULL
)
SELECT
  'SIMULACIÓN DE CONTEO TRIAL' as check_type,
  COUNT(*) as trial_businesses_count
FROM business_accounts ba
WHERE ba.status = 'trial'
  AND ba.trial_ends_at > CURRENT_TIMESTAMP
  AND ba.id IN (SELECT business_account_id FROM business_account_ids);