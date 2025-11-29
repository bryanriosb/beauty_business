'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Target } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import SpecialistGoalService from '@/lib/services/specialist/specialist-goal-service'
import { GoalGrid, GoalModal } from '@/components/specialists/goals'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { toast } from 'sonner'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type { SpecialistGoal, SpecialistGoalInsert } from '@/lib/models/specialist/specialist-goal'

export default function SpecialistsGoalsPage() {
  const { role, specialistId: currentUserSpecialistId } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const specialistService = useMemo(() => new SpecialistService(), [])
  const goalService = useMemo(() => new SpecialistGoalService(), [])

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [goals, setGoals] = useState<Map<string, SpecialistGoal>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<SpecialistGoal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const activeBusinessId = activeBusiness?.id

  const loadData = useCallback(async () => {
    if (!isCompanyAdmin && !activeBusinessId && !isProfessional) return

    setIsLoading(true)
    try {
      const params: any = { page_size: 100 }
      if (!isCompanyAdmin && activeBusinessId) {
        params.business_id = activeBusinessId
      }

      const [specialistsResult, goalsResult] = await Promise.all([
        specialistService.fetchItems(params),
        activeBusinessId ? goalService.getActiveGoalsForBusiness(activeBusinessId) : Promise.resolve([]),
      ])

      // Si es profesional, filtrar solo su propio registro
      const filteredData = isProfessional && currentUserSpecialistId
        ? specialistsResult.data.filter(s => s.id === currentUserSpecialistId)
        : specialistsResult.data

      setSpecialists(filteredData)

      const goalsMap = new Map<string, SpecialistGoal>()
      goalsResult.forEach((goal) => {
        goalsMap.set(goal.specialist_id, goal)
      })
      setGoals(goalsMap)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [specialistService, goalService, isCompanyAdmin, activeBusinessId, isProfessional, currentUserSpecialistId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredSpecialists = useMemo(() => {
    if (!search) return specialists

    const searchLower = search.toLowerCase()
    return specialists.filter(
      (s) =>
        s.first_name.toLowerCase().includes(searchLower) ||
        s.last_name?.toLowerCase().includes(searchLower) ||
        s.specialty?.toLowerCase().includes(searchLower)
    )
  }, [specialists, search])

  const handleCreateGoal = (specialist: Specialist) => {
    setSelectedSpecialist(specialist)
    setSelectedGoal(null)
    setModalOpen(true)
  }

  const handleEditGoal = (goal: SpecialistGoal, specialist: Specialist) => {
    setSelectedSpecialist(specialist)
    setSelectedGoal(goal)
    setModalOpen(true)
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId)
    setDeleteDialogOpen(true)
  }

  const handleSaveGoal = async (data: SpecialistGoalInsert) => {
    try {
      if (selectedGoal) {
        const result = await goalService.update(selectedGoal.id, {
          goal_type: data.goal_type,
          target_value: data.target_value,
          period_type: data.period_type,
          period_start: data.period_start,
          period_end: data.period_end,
        })

        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta actualizada correctamente')
      } else {
        const result = await goalService.create(data)
        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta creada correctamente')
      }

      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la meta')
      throw error
    }
  }

  const confirmDelete = async () => {
    if (!goalToDelete) return

    try {
      const result = await goalService.delete(goalToDelete)
      if (!result.success) {
        throw new Error(result.error)
      }
      toast.success('Meta eliminada correctamente')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la meta')
    } finally {
      setDeleteDialogOpen(false)
      setGoalToDelete(null)
    }
  }

  const specialistsWithGoals = filteredSpecialists.filter((s) => goals.has(s.id))
  const specialistsWithoutGoals = filteredSpecialists.filter((s) => !goals.has(s.id))

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-7 w-7" />
            {isProfessional ? 'Mi Meta' : 'Metas de Especialistas'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isProfessional ? 'Visualiza el progreso de tu meta' : 'Define y da seguimiento a las metas de tu equipo'}
          </p>
        </div>
      </div>

      {!isProfessional && (
        <div className="px-1 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar especialista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[180px] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {specialistsWithGoals.length > 0 && (
              <div className="mb-6">
                {!isProfessional && (
                  <h2 className="text-sm font-medium text-muted-foreground px-4 mb-2">
                    Con metas activas ({specialistsWithGoals.length})
                  </h2>
                )}
                <GoalGrid
                  specialists={specialistsWithGoals}
                  goals={goals}
                  onCreateGoal={handleCreateGoal}
                  onEditGoal={handleEditGoal}
                  onDeleteGoal={handleDeleteGoal}
                  readOnly={isProfessional}
                />
              </div>
            )}

            {specialistsWithoutGoals.length > 0 && (
              <div>
                {!isProfessional && (
                  <h2 className="text-sm font-medium text-muted-foreground px-4 mb-2">
                    Sin metas ({specialistsWithoutGoals.length})
                  </h2>
                )}
                <GoalGrid
                  specialists={specialistsWithoutGoals}
                  goals={goals}
                  onCreateGoal={handleCreateGoal}
                  onEditGoal={handleEditGoal}
                  onDeleteGoal={handleDeleteGoal}
                  readOnly={isProfessional}
                />
              </div>
            )}

            {filteredSpecialists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Target className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No se encontraron especialistas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? 'Intenta con otro término de búsqueda' : 'Agrega especialistas a tu equipo primero'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <GoalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        specialist={selectedSpecialist}
        goal={selectedGoal}
        businessId={activeBusinessId || ''}
        onSave={handleSaveGoal}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="meta"
      />
    </div>
  )
}
