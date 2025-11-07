'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import { BUSINESS_ACCOUNTS_COLUMNS } from '@/lib/models/business-account/const/data-table/business-accounts-columns'
import { BusinessAccountModal } from '@/components/business-accounts/BusinessAccountModal'
import { BusinessAccountMembersModal } from '@/components/business-accounts/BusinessAccountMembersModal'
import { useRef, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'

export default function BusinessAccountsPage() {
  const businessAccountService = useMemo(() => new BusinessAccountService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { user } = useCurrentUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] =
    useState<BusinessAccount | null>(null)
  const [selectedAccountForMembers, setSelectedAccountForMembers] = useState<{
    id: string
    name: string
  } | null>(null)

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'company_name',
      placeholder: 'Buscar por nombre de empresa...',
      serverField: 'company_name',
    }),
    []
  )

  const handleCreateAccount = () => {
    setSelectedAccount(null)
    setModalOpen(true)
  }

  const handleEditAccount = (account: BusinessAccount) => {
    setSelectedAccount(account)
    setModalOpen(true)
  }

  const handleManageMembers = (account: BusinessAccount) => {
    setSelectedAccountForMembers({ id: account.id, name: account.company_name })
    setMembersModalOpen(true)
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }

    try {
      const result = await businessAccountService.deleteAccount(accountId)
      if (result.success) {
        toast.success('Cuenta eliminada correctamente')
        dataTableRef.current?.refreshData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la cuenta')
    }
  }

  const handleSaveAccount = async (
    data: BusinessAccountInsert | BusinessAccountUpdate
  ) => {
    try {
      if (selectedAccount) {
        await businessAccountService.updateAccount(
          selectedAccount.id,
          data as BusinessAccountUpdate
        )
        toast.success('Cuenta actualizada correctamente')
      } else {
        const accountData: BusinessAccountInsert = {
          ...(data as BusinessAccountInsert),
          created_by: user?.id || '',
        }
        const result = await businessAccountService.createAccountWithOwner(
          accountData,
          user?.user_profile_id || ''
        )

        if (result.success) {
          toast.success('Cuenta creada correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la cuenta')
      throw error
    }
  }

  // Crear columnas con acciones
  const columnsWithActions = useMemo(() => {
    return BUSINESS_ACCOUNTS_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const account = row.original
            return (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditAccount(account)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleManageMembers(account)}
                >
                  Miembros
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-destructive"
                >
                  Eliminar
                </Button>
              </div>
            )
          },
        }
      }
      return col
    })
  }, [])

  return (
    <div className="grid gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cuentas de Negocio
          </h1>
          <p className="text-muted-foreground">
            Gestiona las cuentas y empresas de la plataforma
          </p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Cuenta
        </Button>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columnsWithActions}
        service={businessAccountService}
        searchConfig={searchConfig}
      />

      <BusinessAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        account={selectedAccount}
        onSave={handleSaveAccount}
      />

      {selectedAccountForMembers && (
        <BusinessAccountMembersModal
          open={membersModalOpen}
          onOpenChange={setMembersModalOpen}
          accountId={selectedAccountForMembers.id}
          accountName={selectedAccountForMembers.name}
        />
      )}
    </div>
  )
}
