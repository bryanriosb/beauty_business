# Sistema de Business Accounts

Sistema de gestión de cuentas de negocio que permite a los usuarios administrar múltiples negocios/sucursales bajo una misma cuenta con facturación centralizada.

## Estructura de Datos

### 1. business_accounts
Cuenta principal (empresa matriz) que agrupa negocios/sucursales.

**Campos principales:**
- `company_name`: Nombre de la empresa
- `tax_id`: NIT o RUT (Colombia)
- `legal_name`: Razón social
- `billing_*`: Información de facturación
- `subscription_plan`: Plan de suscripción (free, basic, pro, enterprise)
- `status`: Estado de la cuenta (active, suspended, cancelled, trial)
- `settings`: Configuración personalizada en JSON

**Límites por plan:**
- Free: 1 negocio
- Basic: 3 negocios
- Pro: 10 negocios
- Enterprise: Ilimitado

### 2. business_account_members
Relación muchos a muchos entre usuarios y cuentas.

**Roles de miembro:**
- `owner`: Propietario (puede todo)
- `admin`: Administrador (puede gestionar negocios y miembros)
- `member`: Miembro (solo acceso de lectura)

**Estados:**
- `active`: Miembro activo
- `pending`: Invitación pendiente
- `inactive`: Miembro inactivo

### 3. businesses (actualizado)
Se agregó el campo `business_account_id` para relacionar cada negocio con su cuenta.

## Modelo de Datos

```
business_accounts (1) ----< (N) business_account_members (N) >---- (1) users_profile
       |
       | (1)
       |
       v
      (N) businesses
```

## Funciones Helper

### get_user_business_accounts(user_uuid)
Obtiene todas las cuentas de un usuario con su rol y estado de membresía.

### is_account_admin(user_uuid, account_uuid)
Verifica si un usuario es owner o admin de una cuenta.

### count_account_businesses(account_uuid)
Cuenta el número de negocios asociados a una cuenta.

### can_create_business_in_account(account_uuid)
Verifica si se pueden crear más negocios según el límite del plan.

## Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado:

- Los usuarios solo pueden ver cuentas donde son miembros activos
- Solo owners y admins pueden modificar la cuenta
- Solo owners pueden eliminar miembros
- Los negocios solo son visibles para miembros de la cuenta

## Uso en el Código

### Hooks

```typescript
import { useBusinessAccount } from '@/hooks/use-business-account'

function MyComponent() {
  const { account, membership, isAdmin, isOwner } = useBusinessAccount()

  if (isAdmin) {
    // Usuario puede gestionar la cuenta
  }
}
```

### Servicios

```typescript
import BusinessAccountService from '@/lib/services/business-account/business-account-service'

const service = new BusinessAccountService()

// Crear cuenta con owner
await service.createAccountWithOwner(accountData, userProfileId)

// Verificar permisos
const canCreate = await service.canCreateBusiness(accountId)
```

### Permisos

```typescript
import { canManageBusinessAccount } from '@/lib/utils/permissions'

if (canManageBusinessAccount(user.role, membership.role)) {
  // Permitir acción
}
```

## Flujo de Onboarding

1. Usuario company_admin se registra
2. Crea su primera business_account
3. Se agrega automáticamente como owner
4. Puede crear negocios (sucursales) según su plan
5. Puede invitar otros usuarios como admins o members

## Flujo de Invitación

1. Owner/Admin invita a un usuario (status: 'pending')
2. Usuario recibe notificación/email
3. Usuario acepta invitación
4. Se actualiza status a 'active' y se registra accepted_at
5. Usuario puede acceder a los negocios de la cuenta

## Migraciones

Ver `MIGRATION_INSTRUCTIONS.md` para instrucciones detalladas de aplicación.

## Ejemplos

Ver `examples/business-account-usage.tsx` para ejemplos de uso completos.
