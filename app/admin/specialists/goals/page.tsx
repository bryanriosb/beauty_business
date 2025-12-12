'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Target, Users, User, Plus } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import SpecialistGoalService from '@/lib/services/specialist/specialist-goal-service'
import BusinessGoalService from '@/lib/services/business/business-goal-service'
import { GoalGrid, GoalModal } from '@/components/specialists/goals'
import {
  BusinessGoalCard,
  BusinessGoalModal,
  ContributionsModal,
} from '@/components/business/goals'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { toast } from 'sonner'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type {
  SpecialistGoal,
  SpecialistGoalInsert,
} from '@/lib/models/specialist/specialist-goal'
import type {
  BusinessGoal,
  BusinessGoalInsert,
} from '@/lib/models/business/business-goal'
import { FeatureGate } from '@/components/plan/feature-gate'

export default function SpecialistsGoalsPage() {
  const { role, specialistId: currentUserSpecialistId } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const specialistService = useMemo(() => new SpecialistService(), [])
  const goalService = useMemo(() => new SpecialistGoalService(), [])
  const businessGoalService = useMemo(() => new BusinessGoalService(), [])

  const isProfessional = role === USER_ROLES.PROFESSIONAL
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const activeBusinessId = activeBusiness?.id

  const [activeTab, setActiveTab] = useState<'team' | 'individual'>('team')
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [goals, setGoals] = useState<Map<string, SpecialistGoal>>(new Map())
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [businessGoalModalOpen, setBusinessGoalModalOpen] = useState(false)
  const [contributionsModalOpen, setContributionsModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSpecialist, setSelectedSpecialist] =
    useState<Specialist | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<SpecialistGoal | null>(null)
  const [selectedBusinessGoal, setSelectedBusinessGoal] =
    useState<BusinessGoal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<{
    id: string
    type: 'individual' | 'team'
  } | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)

  const loadData = useCallback(async () => {
    if (!isCompanyAdmin && !activeBusinessId && !isProfessional) return

    setIsLoading(true)
    try {
      const params: any = { page_size: 100 }
      if (!isCompanyAdmin && activeBusinessId) {
        params.business_id = activeBusinessId
      }

      const [specialistsResult, goalsResult, businessGoalResult] =
        await Promise.all([
          specialistService.fetchItems(params),
          activeBusinessId
            ? goalService.getActiveGoalsForBusiness(activeBusinessId)
            : Promise.resolve([]),
          activeBusinessId
            ? businessGoalService.getActiveGoal(activeBusinessId)
            : Promise.resolve(null),
        ])

      const filteredData =
        isProfessional && currentUserSpecialistId
          ? specialistsResult.data.filter(
              (s) => s.id === currentUserSpecialistId
            )
          : specialistsResult.data

      setSpecialists(filteredData)

      const goalsMap = new Map<string, SpecialistGoal>()
      goalsResult.forEach((goal) => {
        goalsMap.set(goal.specialist_id, goal)
      })
      setGoals(goalsMap)
      setBusinessGoal(businessGoalResult)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [
    specialistService,
    goalService,
    businessGoalService,
    isCompanyAdmin,
    activeBusinessId,
    isProfessional,
    currentUserSpecialistId,
  ])

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
    setGoalToDelete({ id: goalId, type: 'individual' })
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

  const handleCreateBusinessGoal = () => {
    setSelectedBusinessGoal(null)
    setBusinessGoalModalOpen(true)
  }

  const handleEditBusinessGoal = (goal: BusinessGoal) => {
    setSelectedBusinessGoal(goal)
    setBusinessGoalModalOpen(true)
  }

  const handleDeleteBusinessGoal = (goalId: string) => {
    setGoalToDelete({ id: goalId, type: 'team' })
    setDeleteDialogOpen(true)
  }

  const handleViewContributions = (goal: BusinessGoal) => {
    setSelectedBusinessGoal(goal)
    setContributionsModalOpen(true)
  }

  const handleRecalculateBusinessGoal = async (goalId: string) => {
    setIsRecalculating(true)
    try {
      const result = await businessGoalService.recalculateProgress(goalId)
      if (result.success) {
        setBusinessGoal(result.data || null)
        toast.success('Progreso recalculado correctamente')
      } else {
        toast.error(result.error || 'Error al recalcular')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al recalcular')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleSaveBusinessGoal = async (data: BusinessGoalInsert) => {
    try {
      if (selectedBusinessGoal) {
        const result = await businessGoalService.update(
          selectedBusinessGoal.id,
          {
            goal_type: data.goal_type,
            target_value: data.target_value,
            period_type: data.period_type,
            period_start: data.period_start,
            period_end: data.period_end,
          }
        )

        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta del equipo actualizada')
      } else {
        const result = await businessGoalService.create(data)
        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta del equipo creada')
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
      if (goalToDelete.type === 'individual') {
        const result = await goalService.delete(goalToDelete.id)
        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta eliminada correctamente')
      } else {
        const result = await businessGoalService.delete(goalToDelete.id)
        if (!result.success) {
          throw new Error(result.error)
        }
        toast.success('Meta del equipo eliminada')
      }
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la meta')
    } finally {
      setDeleteDialogOpen(false)
      setGoalToDelete(null)
    }
  }

  const specialistsWithGoals = filteredSpecialists.filter((s) =>
    goals.has(s.id)
  )
  const specialistsWithoutGoals = filteredSpecialists.filter(
    (s) => !goals.has(s.id)
  )

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-7 w-7" />
            {isProfessional ? 'Mi Meta' : 'Metas'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isProfessional
              ? 'Visualiza el progreso de tu meta'
              : 'Define y da seguimiento a las metas de tu equipo'}
          </p>
        </div>
      </div>

      {!isProfessional && (
        <FeatureGate
          module="specialists"
          feature="goals_management"
          mode="compact"
        >
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'team' | 'individual')}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-1 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Meta del Equipo
                </TabsTrigger>
                <TabsTrigger
                  value="individual"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Metas Individuales
                </TabsTrigger>
              </TabsList>

              {activeTab === 'individual' && (
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar especialista..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>

            <TabsContent value="team" className="flex-1 overflow-auto mt-0">
              {isLoading ? (
                <div className="p-4">
                  <div className="h-[250px] rounded-lg bg-muted animate-pulse max-w-md" />
                </div>
              ) : businessGoal ? (
                <div className="p-4 max-w-md">
                  <BusinessGoalCard
                    goal={businessGoal}
                    onEdit={handleEditBusinessGoal}
                    onDelete={handleDeleteBusinessGoal}
                    onViewContributions={handleViewContributions}
                    onRecalculate={handleRecalculateBusinessGoal}
                    isRecalculating={isRecalculating}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Users className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No hay una meta de equipo activa
                  </p>
                  <Button onClick={handleCreateBusinessGoal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear meta del equipo
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="individual"
              className="flex-1 overflow-auto mt-0"
            >
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[180px] rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {specialistsWithGoals.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-sm font-medium text-muted-foreground px-4 mb-2">
                        Con metas activas ({specialistsWithGoals.length})
                      </h2>
                      <GoalGrid
                        specialists={specialistsWithGoals}
                        goals={goals}
                        onCreateGoal={handleCreateGoal}
                        onEditGoal={handleEditGoal}
                        onDeleteGoal={handleDeleteGoal}
                      />
                    </div>
                  )}

                  {specialistsWithoutGoals.length > 0 && (
                    <div>
                      <h2 className="text-sm font-medium text-muted-foreground px-4 mb-2">
                        Sin metas ({specialistsWithoutGoals.length})
                      </h2>
                      <GoalGrid
                        specialists={specialistsWithoutGoals}
                        goals={goals}
                        onCreateGoal={handleCreateGoal}
                        onEditGoal={handleEditGoal}
                        onDeleteGoal={handleDeleteGoal}
                      />
                    </div>
                  )}

                  {filteredSpecialists.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-6 mb-4">
                        <Target className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        No se encontraron especialistas
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {search
                          ? 'Intenta con otro término de búsqueda'
                          : 'Agrega especialistas a tu equipo primero'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </FeatureGate>
      )}

      {isProfessional && (
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[180px] rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {specialistsWithGoals.length > 0 && (
                <GoalGrid
                  specialists={specialistsWithGoals}
                  goals={goals}
                  readOnly={isProfessional}
                />
              )}

              {filteredSpecialists.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Target className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No tienes una meta asignada
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <GoalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        specialist={selectedSpecialist}
        goal={selectedGoal}
        businessId={activeBusinessId || ''}
        onSave={handleSaveGoal}
      />

      <BusinessGoalModal
        open={businessGoalModalOpen}
        onOpenChange={setBusinessGoalModalOpen}
        goal={selectedBusinessGoal}
        businessId={activeBusinessId || ''}
        onSave={handleSaveBusinessGoal}
      />

      <ContributionsModal
        open={contributionsModalOpen}
        onOpenChange={setContributionsModalOpen}
        goal={selectedBusinessGoal}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={goalToDelete?.type === 'team' ? 'meta del equipo' : 'meta'}
      />
    </div>
  )
}
