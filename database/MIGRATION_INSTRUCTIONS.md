# Instrucciones de Migración - Business Accounts

Este documento explica cómo aplicar las migraciones para implementar el sistema de cuentas de negocio.

## Orden de Aplicación

Las migraciones deben aplicarse en el siguiente orden:

1. `001_create_business_accounts.sql` - Crea tabla de cuentas con políticas RLS básicas
2. `002_create_business_account_members.sql` - Crea tabla de membresías
3. `005_update_rls_policies.sql` - Actualiza políticas RLS con validación de membresías
4. `003_alter_businesses_add_account.sql` - Agrega business_account_id a businesses
5. `004_create_helper_functions.sql` - Crea funciones auxiliares

## Métodos de Aplicación

### Opción 1: Supabase Dashboard (Recomendado para desarrollo)

1. Ir a https://app.supabase.com/project/YOUR_PROJECT/editor/sql
2. Abrir cada archivo de migración en orden
3. Copiar el contenido completo del archivo
4. Pegarlo en el editor SQL
5. Hacer clic en "Run" o presionar Cmd/Ctrl + Enter
6. Verificar que no haya errores en la consola
7. Repetir para cada archivo en orden

### Opción 2: Supabase CLI

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O aplicar manualmente cada archivo EN ORDEN
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/migrations/001_create_business_accounts.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/migrations/002_create_business_account_members.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/migrations/005_update_rls_policies.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/migrations/003_alter_businesses_add_account.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/migrations/004_create_helper_functions.sql
```

### Opción 3: Cliente PostgreSQL

```bash
# Conectar a tu base de datos
psql -h [HOST] -U postgres -d postgres

# Ejecutar cada migración EN ORDEN
\i database/migrations/001_create_business_accounts.sql
\i database/migrations/002_create_business_account_members.sql
\i database/migrations/005_update_rls_policies.sql
\i database/migrations/003_alter_businesses_add_account.sql
\i database/migrations/004_create_helper_functions.sql
```

## Verificación Post-Migración

Después de aplicar todas las migraciones, verifica que todo esté correcto:

```sql
-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('business_accounts', 'business_account_members');

-- Verificar columna agregada a businesses
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name = 'business_account_id';

-- Verificar funciones creadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_business_accounts',
  'is_account_admin',
  'count_account_businesses',
  'can_create_business_in_account'
);

-- Verificar políticas RLS
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('business_accounts', 'business_account_members');
```

## Datos de Prueba (Opcional)

Para pruebas en desarrollo, puedes insertar datos de ejemplo:

```sql
-- Crear una cuenta de prueba (reemplaza 'YOUR_USER_ID' con un ID de usuario válido)
INSERT INTO business_accounts (
  company_name,
  tax_id,
  billing_country,
  contact_name,
  contact_email,
  subscription_plan,
  status,
  created_by
) VALUES (
  'Salón de Belleza Demo',
  '900123456-7',
  'CO',
  'Admin Demo',
  'admin@demo.com',
  'trial',
  'trial',
  'YOUR_USER_ID'
) RETURNING id;

-- Agregar el usuario como owner (usa el ID devuelto arriba y un user_profile_id válido)
INSERT INTO business_account_members (
  business_account_id,
  user_profile_id,
  role,
  status,
  accepted_at
) VALUES (
  'BUSINESS_ACCOUNT_ID_FROM_ABOVE',
  'YOUR_USER_PROFILE_ID',
  'owner',
  'active',
  NOW()
);
```

## Rollback (Deshacer)

Si necesitas deshacer las migraciones:

```sql
-- PRECAUCIÓN: Esto eliminará todas las tablas y datos

-- Eliminar funciones
DROP FUNCTION IF EXISTS get_user_business_accounts(UUID);
DROP FUNCTION IF EXISTS is_account_admin(UUID, UUID);
DROP FUNCTION IF EXISTS count_account_businesses(UUID);
DROP FUNCTION IF EXISTS can_create_business_in_account(UUID);

-- Remover columna de businesses
ALTER TABLE businesses DROP COLUMN IF EXISTS business_account_id;

-- Eliminar tablas (en orden inverso por dependencias)
DROP TABLE IF EXISTS business_account_members CASCADE;
DROP TABLE IF EXISTS business_accounts CASCADE;
```

## Siguiente Paso

Después de aplicar las migraciones, debes actualizar los negocios existentes para asociarlos con cuentas. Ver el archivo `POST_MIGRATION_TASKS.md` para instrucciones.
