'use client'

import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
} from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Eye,
  Archive,
  ClipboardList,
  Stethoscope,
  Activity,
  FileCheck,
  FileClock,
  FileX,
  CheckCircle,
  XCircle,
  Send,
  MessageCircle,
  Mail,
  Smartphone,
  Loader2,
  QrCode,
} from 'lucide-react'
import MedicalRecordService from '@/lib/services/medical-record/medical-record-service'
import { MEDICAL_RECORD_COLUMNS } from '@/lib/models/medical-record/const/data-table/medical-record-columns'
import MedicalRecordModal from '@/components/medical-records/MedicalRecordModal'
import MedicalRecordDetailModal from '@/components/medical-records/MedicalRecordDetailModal'
import { useRef, useMemo, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { toast } from 'sonner'
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordWithCustomer,
} from '@/lib/models/medical-record/medical-record'
import type { SignatureRequestChannel } from '@/lib/models/signature-request/signature-request'
import SignatureRequestService from '@/lib/services/signature-request/signature-request-service'
import { SignatureLinkShare } from '@/components/medical-records/SignatureLinkShare'

export default function MedicalRecordsPage() {
  const { role, isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const { businessAccountId } = useUnifiedPermissionsStore()
  const recordService = useMemo(() => new MedicalRecordService(), [])
  const signatureService = useMemo(() => new SignatureRequestService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null
  )
  const [recordToView, setRecordToView] = useState<string | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [recordsToDelete, setRecordsToDelete] = useState<string[]>([])
  const [sendingSignature, setSendingSignature] = useState<string | null>(null)

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'chief_complaint',
      placeholder: 'Buscar por motivo de consulta...',
      serverField: 'search',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'record_type',
        title: 'Tipo',
        options: [
          {
            label: 'Evaluación inicial',
            value: 'initial_assessment',
            icon: ClipboardList,
          },
          { label: 'Seguimiento', value: 'follow_up', icon: FileClock },
          { label: 'Procedimiento', value: 'procedure', icon: Activity },
          { label: 'Consulta', value: 'consultation', icon: Stethoscope },
          { label: 'Pre-operatorio', value: 'pre_operative', icon: FileCheck },
          { label: 'Post-operatorio', value: 'post_operative', icon: FileX },
        ],
      },
      {
        column: 'status',
        title: 'Estado',
        options: [
          { label: 'Activo', value: 'active', icon: CheckCircle },
          { label: 'Archivado', value: 'archived', icon: XCircle },
        ],
      },
    ],
    []
  )

  const activeBusinessId = activeBusiness?.id

  const serviceParams = useMemo(() => {
    if (!activeBusinessId) return null
    return { business_id: activeBusinessId }
  }, [activeBusinessId])

  const isReady = !isLoading && serviceParams !== null

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const isProfessional = role === 'professional'
  const canCreate = isCompanyAdmin || isBusinessAdmin || isProfessional
  const canEdit = isCompanyAdmin || isBusinessAdmin || isProfessional
  const canDelete = isCompanyAdmin || isBusinessAdmin

  const handleCreateRecord = () => {
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleViewRecord = (record: MedicalRecordWithCustomer) => {
    setRecordToView(record.id)
    setDetailModalOpen(true)
  }

  const handleEditRecord = (record: MedicalRecordWithCustomer) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  const handleArchiveRecord = async (recordId: string) => {
    try {
      const result = await recordService.archiveItem(recordId)
      if (!result.success) throw new Error(result.error)
      toast.success('Historia clínica archivada')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo archivar la historia clínica')
    }
  }

  const handleDeleteRecord = (recordId: string) => {
    setRecordToDelete(recordId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return

    try {
      const result = await recordService.destroyItem(recordToDelete)
      if (!result.success) throw new Error(result.error)
      toast.success('Historia clínica eliminada')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la historia clínica')
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setRecordsToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!recordsToDelete.length) return

    try {
      const result = await recordService.destroyMany(recordsToDelete)
      if (result.success) {
        toast.success(
          `${result.deletedCount} historia(s) clínica(s) eliminada(s)`
        )
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(
        error.message || 'No se pudieron eliminar las historias clínicas'
      )
    } finally {
      setBatchDeleteDialogOpen(false)
      setRecordsToDelete([])
    }
  }

  const handleSendSignature = async (
    record: MedicalRecordWithCustomer,
    channel: SignatureRequestChannel
  ) => {
    if (!activeBusiness || !businessAccountId) {
      toast.error('No se pudo obtener información del negocio')
      return
    }

    const customerName = `${record.customer?.first_name || ''} ${
      record.customer?.last_name || ''
    }`.trim()
    const customerContact =
      channel === 'email' ? record.customer?.email : record.customer?.phone

    if (!customerContact) {
      const contactType =
        channel === 'email' ? 'correo electrónico' : 'número de teléfono'
      toast.error(`El cliente no tiene ${contactType} registrado`)
      return
    }

    setSendingSignature(record.id)

    try {
      const result = await signatureService.sendSignatureRequest({
        medicalRecordId: record.id,
        channel,
        businessAccountId,
        businessId: activeBusiness.id,
        businessName: activeBusiness.name,
        customerName,
        customerContact,
        recordDate: record.record_date,
      })

      if (result.success) {
        const channelLabels = {
          whatsapp: 'WhatsApp',
          email: 'correo electrónico',
          sms: 'SMS',
        }
        toast.success(
          `Solicitud de firma enviada por ${channelLabels[channel]}`
        )
        dataTableRef.current?.refreshData()
      } else {
        toast.error(result.error || 'Error al enviar la solicitud')
      }
    } catch {
      toast.error('Error al enviar la solicitud de firma')
    } finally {
      setSendingSignature(null)
    }
  }

  const handleSaveRecord = async (
    data: MedicalRecordInsert | MedicalRecordUpdate,
    recordId?: string
  ) => {
    try {
      if (recordId) {
        const result = await recordService.updateItem(
          recordId,
          data as MedicalRecordUpdate
        )
        if (!result.success) throw new Error(result.error)
        toast.success('Historia clínica actualizada')
      } else {
        const result = await recordService.createItem(
          data as MedicalRecordInsert
        )
        if (!result.success) throw new Error(result.error)
        toast.success('Historia clínica creada')
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la historia clínica')
      throw error
    }
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Historias Clínicas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver las historias clínicas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Historias Clínicas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las historias clínicas de tus pacientes
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={handleCreateRecord}>
            <Plus size={20} />
            Nueva Historia Clínica
          </Button>
        )}
      </div>

      {isReady && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={MEDICAL_RECORD_COLUMNS.map((col) => {
            if (col.id === 'actions') {
              return {
                ...col,
                cell: ({ row }: any) => {
                  const record = row.original as MedicalRecordWithCustomer
                  const isSigned = !!record.signature_data
                  const isSending = sendingSignature === record.id

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewRecord(record)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => handleEditRecord(record)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}

                        {/* Menú principal de firma */}
                        {!isSigned && businessAccountId && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Send className="mr-4 !h-4 !w-4 text-muted-foreground" />
                              Firmar
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {/* Opciones directas */}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSendSignature(record, 'whatsapp')
                                  }
                                  disabled={!record.customer?.phone}
                                >
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  WhatsApp
                                  {!record.customer?.phone && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (sin tel.)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSendSignature(record, 'email')
                                  }
                                  disabled={!record.customer?.email}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Email
                                  {!record.customer?.email && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (sin email)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSendSignature(record, 'sms')
                                  }
                                  disabled={!record.customer?.phone}
                                >
                                  <Smartphone className="mr-2 h-4 w-4" />
                                  SMS
                                  {!record.customer?.phone && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (sin tel.)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Opción de generar enlace */}
                                <DropdownMenuItem asChild>
                                  <SignatureLinkShare 
                                    medicalRecordId={record.id}
                                    onLinkGenerated={() => {
                                      // No recargar la tabla inmediatamente
                                      // Dejar que el usuario cierre el modal primero
                                      console.log('Link generated, waiting for user to close modal')
                                    }}
                                  >
                                    <div className="flex items-center w-full">
                                      <QrCode className="mr-2 h-4 w-4" />
                                      Generar enlace
                                    </div>
                                  </SignatureLinkShare>
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        )}

                         {canEdit && record.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleArchiveRecord(record.id)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archivar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteRecord(record.id)}
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
          })}
          service={recordService}
          searchConfig={searchConfig}
          filters={filterConfigs}
          defaultQueryParams={serviceParams || {}}
          enableRowSelection={canDelete}
          onDeleteSelected={handleBatchDelete}
        />
      )}

      <MedicalRecordModal
        businessId={activeBusinessId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={selectedRecord}
        onSave={handleSaveRecord}
      />

      <MedicalRecordDetailModal
        recordId={recordToView}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onRefresh={() => dataTableRef.current?.refreshData()}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="historia clínica"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="historia clínica"
        count={recordsToDelete.length}
        variant="outline"
      />
    </div>
  )
}
