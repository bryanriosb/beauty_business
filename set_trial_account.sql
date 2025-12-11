-- Marcar un business account como trial para testing
UPDATE business_accounts
SET
  status = 'trial',
  trial_ends_at = CURRENT_TIMESTAMP + interval '30 days'
WHERE id = (
  SELECT business_account_id
  FROM businesses
  LIMIT 1
);

-- Verificar que se actualizó
SELECT
  'BUSINESS ACCOUNTS EN TRIAL' as status,
  COUNT(*) as count,
  array_agg(status) as statuses
FROM business_accounts
WHERE status = 'trial';