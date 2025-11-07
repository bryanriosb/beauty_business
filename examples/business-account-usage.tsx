/**
 * Ejemplos de uso del sistema de Business Accounts
 *
 * Este archivo muestra cómo utilizar los nuevos hooks, servicios y tipos
 * para gestionar cuentas de negocio en la aplicación.
 */

'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useBusinessAccount } from '@/hooks/use-business-account'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import type { BusinessAccountInsert } from '@/lib/models/business-account/business-account'
import type { BusinessAccountMember } from '@/lib/models/business-account/business-account-member'

// Ejemplo 1: Obtener información de la cuenta actual del usuario
function CurrentAccountInfo() {
  const { account, membership, isAdmin, isOwner, isLoading } = useBusinessAccount()
  const { user } = useCurrentUser()

  if (isLoading) return <div>Cargando...</div>

  if (!account) return <div>No hay cuenta asociada</div>

  return (
    <div>
      <h2>{account.company_name}</h2>
      <p>Plan: {account.subscription_plan}</p>
      <p>Estado: {account.status}</p>

      {membership && (
        <div>
          <p>Tu rol: {membership.role}</p>
          {isOwner && <span>Eres propietario</span>}
          {isAdmin && <span>Tienes permisos de administrador</span>}
        </div>
      )}
    </div>
  )
}

// Ejemplo 2: Crear una nueva cuenta de negocio
async function createNewAccount() {
  const service = new BusinessAccountService()
  const userId = 'current-user-id' // Obtener del contexto
  const userProfileId = 'user-profile-id' // Obtener del contexto

  const accountData: BusinessAccountInsert = {
    company_name: 'Mi Salón de Belleza',
    tax_id: '900123456-7', // NIT para Colombia
    legal_name: 'Salón de Belleza S.A.S',
    billing_address: 'Calle 123 #45-67',
    billing_city: 'Bogotá',
    billing_state: 'Cundinamarca',
    billing_postal_code: '110111',
    billing_country: 'CO',
    contact_name: 'Juan Pérez',
    contact_email: 'juan@ejemplo.com',
    contact_phone: '+57 300 123 4567',
    created_by: userId,
  }

  const result = await service.createAccountWithOwner(accountData, userProfileId)

  if (result.success) {
    console.log('Cuenta creada:', result.data)
    return result.data
  } else {
    console.error('Error:', result.error)
    return null
  }
}

// Ejemplo 3: Invitar un miembro a la cuenta
async function inviteTeamMember() {
  const service = new BusinessAccountService()
  const accountId = 'business-account-id'
  const newUserProfileId = 'new-user-profile-id'
  const currentUserId = 'current-user-id'

  const result = await service.addMember({
    business_account_id: accountId,
    user_profile_id: newUserProfileId,
    role: 'admin',
    status: 'pending',
    invited_by: currentUserId,
  })

  if (result.success) {
    console.log('Miembro invitado:', result.data)
  }
}

// Ejemplo 4: Verificar permisos antes de realizar una acción
function CreateBusinessButton() {
  const { user, role } = useCurrentUser()
  const { isAdmin, isActive, account } = useBusinessAccount()
  const [canCreate, setCanCreate] = useState(false)

  useEffect(() => {
    async function checkPermission() {
      if (!account || !isAdmin || !isActive) {
        setCanCreate(false)
        return
      }

      const service = new BusinessAccountService()
      const allowed = await service.canCreateBusiness(account.id)
      setCanCreate(allowed)
    }

    checkPermission()
  }, [account, isAdmin, isActive])

  if (!canCreate) {
    return (
      <div>
        <button disabled>Crear Negocio</button>
        <p>Has alcanzado el límite de negocios para tu plan actual</p>
      </div>
    )
  }

  const handleCreateBusiness = () => {
    console.log('Crear negocio')
  }

  return <button onClick={handleCreateBusiness}>Crear Negocio</button>
}

// Ejemplo 5: Listar miembros de la cuenta
function AccountMembersList() {
  const { account, isAdmin } = useBusinessAccount()
  const [members, setMembers] = useState<BusinessAccountMember[]>([])

  useEffect(() => {
    async function loadMembers() {
      if (!account || !isAdmin) return

      const service = new BusinessAccountService()
      const membersList = await service.getAccountMembers(account.id)
      setMembers(membersList)
    }

    loadMembers()
  }, [account, isAdmin])

  return (
    <div>
      <h3>Miembros del equipo</h3>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.user_profile_id} - {member.role} ({member.status})
          </li>
        ))}
      </ul>
    </div>
  )
}

// Ejemplo 6: Validación de acceso en Server Component
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { redirect } from 'next/navigation'

async function ServerComponentWithAuth() {
  const session = await getServerSession(AUTH_OPTIONS)

  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const user = session.user as any
  const role = user.role
  const businessAccountId = user.business_account_id

  // Validar que el usuario tenga una cuenta
  if (!businessAccountId && role === 'business_admin') {
    redirect('/onboarding/create-account')
  }

  // Validar permisos
  if (role !== 'company_admin' && role !== 'business_admin') {
    redirect('/unauthorized')
  }

  return <div>Contenido protegido</div>
}

export {
  CurrentAccountInfo,
  createNewAccount,
  inviteTeamMember,
  CreateBusinessButton,
  AccountMembersList,
  ServerComponentWithAuth,
}
