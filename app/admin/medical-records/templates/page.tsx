'use client'

import { DataTable, DataTableRef } from '@/components/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Star, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRef, useMemo, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import FormTemplateService from '@/lib/services/form-template/form-template-service'
import type { FormTemplate } from '@/lib/models/form-template/form-template'
import FormTemplateModal from '@/components/form-templates/FormTemplateModal'

const FORM_TEMPLATE_COLUMNS: ColumnDef<FormTemplate>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }: any) => {
      const template = row.original
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{template.name}</span>
          {template.is_default && (
            <Badge variant="secondary" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Por defecto
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }: any) => {
      const description = row.getValue('description') as string
      return (
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
          {description || '-'}
        </span>
      )
    },
  },
  {
    accessorKey: 'toon_schema',
    header: 'Campos',
    cell: ({ row }: any) => {
      const template = row.original
      const fieldCount = template.toon_schema?.sections?.reduce(
        (acc: number, section: any) => acc + (section.fields?.length || 0),
        0
      ) || 0
      
      return (
        <Badge variant="outline">
          {fieldCount} campo{fieldCount !== 1 ? 's' : ''}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'requires_signature',
    header: 'Firma',
    cell: ({ row }: any) => {
      const requiresSignature = row.getValue('requires_signature') as boolean
      return (
        <Badge variant={requiresSignature ? 'default' : 'secondary'}>
          {requiresSignature ? 'Requerida' : 'Opcional'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Estado',
    cell: ({ row }: any) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }: any) => {
      const template = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.handleEditTemplate?.(template)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.handleToggleDefault?.(template)}>
              {template.is_default ? (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Quitar por defecto
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Establecer por defecto
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => window.handleDeleteTemplate?.(template)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {template.is_active ? 'Desactivar' : 'Eliminar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function FormTemplatesPage() {
  const { role, isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const templateService = useMemo(() => new FormTemplateService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

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

  const handleCreateTemplate = () => {
    setSelectedTemplate(null)
    setModalOpen(true)
  }

  const handleEditTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template)
    setModalOpen(true)
  }

  const handleToggleDefault = async (template: FormTemplate) => {
    try {
      const result = await templateService.updateItem(template.id, {
        is_default: !template.is_default
      })
      if (!result.success) throw new Error(result.error)
      
      const action = template.is_default ? 'quitado' : 'establecido'
      toast.success(`Template ${action} como por defecto`)
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar el template')
    }
  }

  const handleDeleteTemplate = async (template: FormTemplate) => {
    try {
      const result = await templateService.deleteItem(template.id)
      if (!result.success) throw new Error(result.error)
      
      const action = template.is_active ? 'desactivado' : 'eliminado'
      toast.success(`Template ${action}`)
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el template')
    }
  }

  const handleSaveTemplate = async (
    data: any,
    templateId?: string
  ) => {
    try {
      if (templateId) {
        const result = await templateService.updateItem(templateId, data)
        if (!result.success) throw new Error(result.error)
        toast.success('Template actualizado')
      } else {
        const result = await templateService.createItem(data)
        if (!result.success) throw new Error(result.error)
        toast.success('Template creado')
      }
      dataTableRef.current?.refreshData()
      setModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el template')
      throw error
    }
  }

  // Asignar handlers globales para el DataTable
  if (typeof window !== 'undefined') {
    window.handleEditTemplate = handleEditTemplate
    window.handleToggleDefault = handleToggleDefault
    window.handleDeleteTemplate = handleDeleteTemplate
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates de Historia Clínica</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver los templates
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates de Historia Clínica</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las plantillas para tus historias clínicas
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={handleCreateTemplate}>
            <Plus size={20} />
            Nuevo Template
          </Button>
        )}
      </div>

      {isReady && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={FORM_TEMPLATE_COLUMNS}
          service={templateService}
          defaultQueryParams={serviceParams || {}}
        />
      )}

      <FormTemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        template={selectedTemplate}
        businessId={activeBusinessId}
        onSave={handleSaveTemplate}
      />
    </div>
  )
}

// Extender window para TypeScript
declare global {
  interface Window {
    handleEditTemplate?: (template: FormTemplate) => void
    handleToggleDefault?: (template: FormTemplate) => void
    handleDeleteTemplate?: (template: FormTemplate) => void
  }
}