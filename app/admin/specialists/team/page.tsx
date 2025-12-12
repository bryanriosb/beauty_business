'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import SpecialistGoalService from '@/lib/services/specialist/specialist-goal-service'
import { SpecialistGrid } from '@/components/specialists/SpecialistGrid'
import { SpecialistFilters } from '@/components/specialists/SpecialistFilters'
import { SpecialistModal, type SpecialistCredentials, type SpecialistCredentialsUpdate } from '@/components/specialists/SpecialistModal'
import { SpecialistDetailPanel } from '@/components/specialists/SpecialistDetailPanel'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { toast } from 'sonner'
import type {
  Specialist,
  SpecialistInsert,
  SpecialistUpdate,
  SpecialistAvailability,
} from '@/lib/models/specialist/specialist'
import type { BusinessHours } from '@/lib/models/business/business-hours'
import type { ServiceCategory } from '@/lib/models/service/service'
import { fetchBusinessHoursAction } from '@/lib/actions/business-hours'
import { fetchServiceCategoriesAction } from '@/lib/actions/service'
import {
  fetchSpecialistServiceCategoriesAction,
  updateSpecialistServiceCategoriesAction,
  updateSpecialistCredentialsAction,
  syncSpecialistProfilePictureAction,
} from '@/lib/actions/specialist'
import { calculateGoalProgress } from '@/lib/models/specialist/specialist-goal'
import type {
  CurrentAppointment,
  SpecialistGoalProgress,
} from '@/components/specialists/SpecialistCard'

export default function SpecialistsTeamPage() {
  const { role, specialistId: currentUserSpecialistId } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const specialistService = useMemo(() => new SpecialistService(), [])
  const goalService = useMemo(() => new SpecialistGoalService(), [])

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSpecialist, setSelectedSpecialist] =
    useState<Specialist | null>(null)
  const [selectedAvailability, setSelectedAvailability] = useState<
    SpecialistAvailability[]
  >([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([])
  const [detailSpecialistId, setDetailSpecialistId] = useState<string | null>(
    null
  )

  const [currentAppointments, setCurrentAppointments] = useState<
    Map<string, CurrentAppointment>
  >(new Map())
  const [goalProgress, setGoalProgress] = useState<
    Map<string, SpecialistGoalProgress>
  >(new Map())

  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [specialistToDelete, setSpecialistToDelete] = useState<string | null>(
    null
  )

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const activeBusinessId = activeBusiness?.id

  const loadSpecialists = useCallback(async () => {
    if (!isCompanyAdmin && !activeBusinessId && !isProfessional) return

    setIsLoading(true)
    try {
      const params: any = { page_size: 100 }
      if (!isCompanyAdmin && activeBusinessId) {
        params.business_id = activeBusinessId
      }

      const [result, hours, appointments, goals, categories] = await Promise.all([
        specialistService.fetchItems(params),
        activeBusinessId
          ? fetchBusinessHoursAction(activeBusinessId)
          : Promise.resolve([]),
        activeBusinessId
          ? specialistService.getCurrentAppointmentsForBusiness(
              activeBusinessId
            )
          : Promise.resolve([]),
        activeBusinessId
          ? goalService.getActiveGoalsForBusiness(activeBusinessId)
          : Promise.resolve([]),
        fetchServiceCategoriesAction(),
      ])

      // Si es profesional, filtrar solo su propio registro
      const filteredData = isProfessional && currentUserSpecialistId
        ? result.data.filter(s => s.id === currentUserSpecialistId)
        : result.data

      setSpecialists(filteredData)
      setBusinessHours(hours)
      setServiceCategories(categories)

      const appointmentsMap = new Map<string, CurrentAppointment>()
      appointments.forEach((apt) => {
        appointmentsMap.set(apt.specialist_id, {
          startTime: apt.startTime,
          endTime: apt.endTime,
          services: apt.services,
        })
      })
      setCurrentAppointments(appointmentsMap)

      const goalsMap = new Map<string, SpecialistGoalProgress>()
      goals.forEach((goal) => {
        goalsMap.set(goal.specialist_id, {
          percentage: calculateGoalProgress(goal),
          label: 'Meta mensual',
        })
      })
      setGoalProgress(goalsMap)
    } catch (error) {
      console.error('Error loading specialists:', error)
      toast.error('Error al cargar especialistas')
    } finally {
      setIsLoading(false)
    }
  }, [specialistService, goalService, isCompanyAdmin, activeBusinessId, isProfessional, currentUserSpecialistId])

  useEffect(() => {
    loadSpecialists()
  }, [loadSpecialists])

  const filteredSpecialists = useMemo(() => {
    let filtered = specialists

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.first_name.toLowerCase().includes(searchLower) ||
          s.last_name?.toLowerCase().includes(searchLower) ||
          s.specialty?.toLowerCase().includes(searchLower)
      )
    }

    if (specialtyFilter !== 'all') {
      filtered = filtered.filter((s) => s.specialty?.includes(specialtyFilter))
    }

    if (statusFilter === 'featured') {
      filtered = filtered.filter((s) => s.is_featured)
    } else if (statusFilter === 'regular') {
      filtered = filtered.filter((s) => !s.is_featured)
    }

    return filtered
  }, [specialists, search, specialtyFilter, statusFilter])

  const specialties = useMemo(() => {
    const set = new Set<string>()
    specialists.forEach((s) => {
      if (s.specialty) {
        s.specialty.split(',').forEach((sp) => set.add(sp.trim()))
      }
    })
    return Array.from(set).sort()
  }, [specialists])

  const handleCreateSpecialist = () => {
    setSelectedSpecialist(null)
    setSelectedAvailability([])
    setSelectedCategoryIds([])
    setModalOpen(true)
  }

  const handleEditSpecialist = async (specialist: Specialist) => {
    setSelectedSpecialist(specialist)
    try {
      const [availability, categoryIds] = await Promise.all([
        specialistService.getAvailability(specialist.id),
        fetchSpecialistServiceCategoriesAction(specialist.id),
      ])
      setSelectedAvailability(availability)
      setSelectedCategoryIds(categoryIds)
    } catch (error) {
      console.error('Error loading specialist data:', error)
      setSelectedAvailability([])
      setSelectedCategoryIds([])
    }
    setModalOpen(true)
  }

  const handleSelectSpecialist = (specialist: Specialist) => {
    setDetailSpecialistId(specialist.id)
  }

  const handleSaveSpecialist = async (
    data: SpecialistInsert | SpecialistUpdate,
    availability: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[],
    categoryIds: string[],
    credentials?: SpecialistCredentials,
    credentialsUpdate?: SpecialistCredentialsUpdate
  ) => {
    try {
      let specialistId: string

      if (selectedSpecialist) {
        const result = await specialistService.updateItem({
          id: selectedSpecialist.id,
          ...data,
        })
        if (!result.success) {
          throw new Error(result.error)
        }
        specialistId = selectedSpecialist.id

        if (data.profile_picture_url !== selectedSpecialist.profile_picture_url) {
          await syncSpecialistProfilePictureAction(specialistId, data.profile_picture_url || null)
        }

        if (credentialsUpdate && (credentialsUpdate.newEmail || credentialsUpdate.newPassword)) {
          const credResult = await updateSpecialistCredentialsAction({
            specialistId,
            newEmail: credentialsUpdate.newEmail,
            newPassword: credentialsUpdate.newPassword,
          })
          if (!credResult.success) {
            toast.error(credResult.error || 'Error al actualizar credenciales')
          } else if (credentialsUpdate.newEmail || credentialsUpdate.newPassword) {
            toast.success('Credenciales actualizadas')
          }
        }

        toast.success('Especialista actualizado correctamente')
      } else {
        const result = await specialistService.createWithAuth({
          specialistData: data as SpecialistInsert,
          credentials,
        })
        if (!result.success || !result.data) {
          throw new Error(result.error)
        }
        specialistId = result.data.id

        if (data.profile_picture_url) {
          await syncSpecialistProfilePictureAction(specialistId, data.profile_picture_url)
        }

        toast.success('Especialista creado correctamente')
      }

      const [availResult, catResult] = await Promise.all([
        specialistService.updateAvailability(specialistId, availability),
        updateSpecialistServiceCategoriesAction(specialistId, categoryIds),
      ])

      if (!availResult.success) {
        console.error('Error saving availability:', availResult.error)
      }
      if (!catResult.success) {
        console.error('Error saving categories:', catResult.error)
      }

      loadSpecialists()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar especialista')
      throw error
    }
  }

  const handleDeleteSpecialist = (id: string) => {
    setSpecialistToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!specialistToDelete) return

    try {
      await specialistService.destroyItem(specialistToDelete)
      toast.success('Especialista eliminado correctamente')
      if (detailSpecialistId === specialistToDelete) {
        setDetailSpecialistId(null)
      }
      loadSpecialists()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar especialista')
    } finally {
      setDeleteDialogOpen(false)
      setSpecialistToDelete(null)
    }
  }

  const currentIndex = detailSpecialistId
    ? filteredSpecialists.findIndex((s) => s.id === detailSpecialistId)
    : -1

  const handleNavigateDetail = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex >= 0 && newIndex < filteredSpecialists.length) {
      setDetailSpecialistId(filteredSpecialists[newIndex].id)
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col gap-6 overflow-hidden p-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isProfessional ? 'Mi Perfil' : `Especialistas (${filteredSpecialists.length})`}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isProfessional ? 'Gestiona tu información profesional' : 'Gestiona el equipo de especialistas'}
            </p>
          </div>
          {!isProfessional && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreateSpecialist} data-tutorial="add-specialist-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Especialista
              </Button>
            </div>
          )}
        </div>

        {!isProfessional && (
          <SpecialistFilters
            search={search}
            onSearchChange={setSearch}
            specialtyFilter={specialtyFilter}
            onSpecialtyFilterChange={setSpecialtyFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            specialties={specialties}
          />
        )}

        <div className="flex-1 overflow-auto">
          <SpecialistGrid
            specialists={filteredSpecialists}
            selectedId={detailSpecialistId}
            onSelect={handleSelectSpecialist}
            onEdit={handleEditSpecialist}
            onDelete={isProfessional ? undefined : handleDeleteSpecialist}
            isLoading={isLoading}
            currentAppointments={currentAppointments}
            goalProgress={goalProgress}
          />
        </div>
      </div>

      {detailSpecialistId && (
        <SpecialistDetailPanel
          specialistId={detailSpecialistId}
          onClose={() => setDetailSpecialistId(null)}
          onNavigate={handleNavigateDetail}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < filteredSpecialists.length - 1}
        />
      )}

      <SpecialistModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        specialist={selectedSpecialist}
        businessId={activeBusinessId || null}
        onSave={handleSaveSpecialist}
        initialAvailability={selectedAvailability}
        initialCategoryIds={selectedCategoryIds}
        serviceCategories={serviceCategories}
        businessHours={businessHours}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="especialista"
      />
    </div>
  )
}
