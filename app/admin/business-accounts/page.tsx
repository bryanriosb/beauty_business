'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
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
import { hasPermission } from '@/const/roles'

export default function BusinessAccountsPage() {
  const businessAccountService = useMemo(() => new BusinessAccountService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { user, role } = useCurrentUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] =
    useState<BusinessAccount | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const [selectedAccountForMembers, setSelectedAccountForMembers] = useState<{
    id: string
    name: string
    contactName?: string
    contactEmail?: string
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
    setSelectedAccountForMembers({
      id: account.id,
      name: account.company_name,
      contactName: account.contact_name,
      contactEmail: account.contact_email,
    })
    setMembersModalOpen(true)
  }

  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!accountToDelete) return

    try {
      const result = await businessAccountService.deleteAccount(accountToDelete)
      if (result.success) {
        toast.success('Cuenta eliminada correctamente')
        dataTableRef.current?.refreshData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la cuenta')
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
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
        // Validar que el usuario tenga user_profile_id
        if (!user?.id || !user?.user_profile_id) {
          console.error('User data:', user)
          toast.error(
            `Error: No se pudo obtener la información del usuario. user_profile_id: ${user?.user_profile_id}`
          )
          throw new Error('Usuario sin user_profile_id')
        }

        const accountData: BusinessAccountInsert = {
          ...(data as BusinessAccountInsert),
          created_by: user.id,
        }
        const result = await businessAccountService.createAccountWithOwner(
          accountData,
          user.user_profile_id
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
            const canEditFull =
              role && hasPermission(role, 'canEditBusinessAccount')
            const canEditContact =
              role && hasPermission(role, 'canEditAccountContactInfo')
            const canEdit = canEditFull || canEditContact
            const canDelete =
              role && hasPermission(role, 'canDeleteBusinessAccount')
            const canManageMembers =
              role && hasPermission(role, 'canAddAccountMembers')

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => handleEditAccount(account)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canManageMembers && (
                    <DropdownMenuItem
                      onClick={() => handleManageMembers(account)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Miembros
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        }
      }
      return col
    })
  }, [role])

  const canCreateAccount =
    role && hasPermission(role, 'canCreateBusinessAccount')

  return (
    <div className="grid gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
          <p className="text-muted-foreground">
            Gestiona las cuentas registradas
          </p>
        </div>
        {canCreateAccount && (
          <Button onClick={handleCreateAccount}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Cuenta
          </Button>
        )}
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
          contactName={selectedAccountForMembers.contactName}
          contactEmail={selectedAccountForMembers.contactEmail}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              la cuenta de negocio y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
