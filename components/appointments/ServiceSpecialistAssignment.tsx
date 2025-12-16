'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Check,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Split,
  Merge,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, translateSpecialty } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  getAvailabilityForMultipleServicesAction,
  getAvailableSlotsForServiceAction,
  type SpecialistWithCategories,
  type CategorySpecialistsMap,
  type TimeSlot,
} from '@/lib/actions/availability'
import type { SelectedService } from './MultiServiceSelector'
import { FeatureGate } from '../plan/FeatureGate'

export interface ServiceSpecialistAssignment {
  serviceId: string
  serviceName: string
  categoryId: string | null
  categoryName: string | null
  specialistId: string | null
  specialistName: string | null
  durationMinutes: number
  startTime: string | null
  endTime: string | null
}

interface ServiceSpecialistAssignmentProps {
  businessId: string
  services: SelectedService[]
  date: string
  value: ServiceSpecialistAssignment[]
  onChange: (assignments: ServiceSpecialistAssignment[]) => void
  onPrimarySpecialistChange?: (specialistId: string) => void
  onTimesCalculated?: (startTime: string, endTime: string) => void
  disabled?: boolean
  excludeAppointmentId?: string
}

interface CategoryAssignmentState {
  specialistId: string | null
  startTime: string | null
  availableSlots: TimeSlot[]
  isLoadingSlots: boolean
}

export default function ServiceSpecialistAssignmentComponent({
  businessId,
  services,
  date,
  value,
  onChange,
  onPrimarySpecialistChange,
  onTimesCalculated,
  disabled = false,
  excludeAppointmentId,
}: ServiceSpecialistAssignmentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryGroups, setCategoryGroups] = useState<
    CategorySpecialistsMap[]
  >([])
  const [universalSpecialists, setUniversalSpecialists] = useState<
    SpecialistWithCategories[]
  >([])
  const [canSingleSpecialistHandleAll, setCanSingleSpecialistHandleAll] =
    useState(false)
  const [useUnifiedAssignment, setUseUnifiedAssignment] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  // State for each category's assignment
  const [categoryAssignments, setCategoryAssignments] = useState<
    Map<string, CategoryAssignmentState>
  >(new Map())

  // Unified mode state
  const [unifiedSpecialistId, setUnifiedSpecialistId] = useState<string | null>(
    null
  )
  const [unifiedSlots, setUnifiedSlots] = useState<TimeSlot[]>([])
  const [unifiedStartTime, setUnifiedStartTime] = useState<string | null>(null)
  const [isLoadingUnifiedSlots, setIsLoadingUnifiedSlots] = useState(false)

  const totalDuration = useMemo(() => {
    return services.reduce((sum, s) => sum + s.duration_minutes, 0)
  }, [services])

  const servicesWithCategories = useMemo(() => {
    return services.map((s) => ({
      id: s.id,
      category_id: (s as any).category_id || null,
      duration_minutes: s.duration_minutes,
    }))
  }, [services])

  // Stable string of service IDs for dependency tracking
  const serviceIdsKey = useMemo(() => {
    return services
      .map((s) => s.id)
      .sort()
      .join(',')
  }, [services])

  // Track if initial load has been done
  const initialLoadDoneRef = useRef(false)
  const prevServiceIdsKeyRef = useRef('')

  // Track if pre-existing values have been loaded (for edit mode)
  const hasInitializedFromValueRef = useRef(false)

  // Reset initial load flag when services actually change
  useEffect(() => {
    if (prevServiceIdsKeyRef.current !== serviceIdsKey) {
      initialLoadDoneRef.current = false
      hasInitializedFromValueRef.current = false
      prevServiceIdsKeyRef.current = serviceIdsKey
    }
  }, [serviceIdsKey])

  // Load initial data
  useEffect(() => {
    async function loadAvailability() {
      if (!businessId || services.length === 0 || !date) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await getAvailabilityForMultipleServicesAction({
          businessId,
          services: servicesWithCategories,
          date,
          excludeAppointmentId,
        })

        if (result.success) {
          setCategoryGroups(result.categoryGroups)
          setUniversalSpecialists(result.universalSpecialists)
          setCanSingleSpecialistHandleAll(result.canSingleSpecialistHandleAll)

          // Set unified assignment mode and expand categories on initial load
          if (!initialLoadDoneRef.current) {
            if (
              !result.canSingleSpecialistHandleAll ||
              result.universalSpecialists.length === 0
            ) {
              setUseUnifiedAssignment(false)
              const allCategoryKeys = new Set(
                result.categoryGroups.map((g) => g.categoryId || 'no-category')
              )
              setExpandedCategories(allCategoryKeys)
            }
            initialLoadDoneRef.current = true
          }
        } else {
          setError(result.error || 'Error al cargar disponibilidad')
        }
      } catch (err) {
        console.error('Error loading availability:', err)
        setError('Error al cargar disponibilidad')
      } finally {
        setIsLoading(false)
      }
    }

    loadAvailability()
  }, [businessId, services, date, excludeAppointmentId, servicesWithCategories])

  // Initialize assignments when services change
  useEffect(() => {
    if (services.length === 0) return

    // Solo inicializar si no hay assignments o si el número de servicios cambió
    if (value.length === services.length && value.length > 0) {
      return
    }

    const newAssignments: ServiceSpecialistAssignment[] = services.map((s) => ({
      serviceId: s.id,
      serviceName: s.name,
      categoryId: (s as any).category_id || null,
      categoryName: (s as any).category_name || null,
      specialistId: null,
      specialistName: null,
      durationMinutes: s.duration_minutes,
      startTime: null,
      endTime: null,
    }))

    onChange(newAssignments)
  }, [services, value.length, onChange])

  // Initialize unified specialist/time from existing value (for edit mode)
  useEffect(() => {
    if (hasInitializedFromValueRef.current) return
    if (value.length === 0) return
    if (universalSpecialists.length === 0 && categoryGroups.length === 0) return

    const firstWithSpecialist = value.find((v) => v.specialistId && v.startTime)
    if (!firstWithSpecialist) return

    // Check if all services have the same specialist (unified mode)
    const allSameSpecialist = value.every(
      (v) => v.specialistId === firstWithSpecialist.specialistId
    )

    if (
      allSameSpecialist &&
      canSingleSpecialistHandleAll &&
      universalSpecialists.length > 0
    ) {
      const specialistExists = universalSpecialists.some(
        (s) => s.id === firstWithSpecialist.specialistId
      )
      if (specialistExists) {
        setUnifiedSpecialistId(firstWithSpecialist.specialistId)
        setUnifiedStartTime(firstWithSpecialist.startTime)
        hasInitializedFromValueRef.current = true
      }
    } else if (categoryGroups.length > 0) {
      // Per-category mode: initialize categoryAssignments and load slots
      setUseUnifiedAssignment(false)
      const allCategoryKeys = new Set(
        categoryGroups.map((g) => g.categoryId || 'no-category')
      )
      setExpandedCategories(allCategoryKeys)

      const newCategoryAssignments = new Map<string, CategoryAssignmentState>()
      const slotsToLoad: Array<{
        categoryKey: string
        specialistId: string
        startTime: string | null
        serviceId: string
      }> = []

      categoryGroups.forEach((group) => {
        const categoryKey = group.categoryId || 'no-category'
        const assignmentForCategory = value.find(
          (v) =>
            (v.categoryId === group.categoryId ||
              (group.categoryId === null && v.categoryId === null)) &&
            v.specialistId
        )
        if (assignmentForCategory?.specialistId) {
          const serviceId = assignmentForCategory.serviceId
          newCategoryAssignments.set(categoryKey, {
            specialistId: assignmentForCategory.specialistId,
            startTime: assignmentForCategory.startTime,
            availableSlots: [],
            isLoadingSlots: true,
          })
          slotsToLoad.push({
            categoryKey,
            specialistId: assignmentForCategory.specialistId,
            startTime: assignmentForCategory.startTime,
            serviceId,
          })
        }
      })

      if (newCategoryAssignments.size > 0) {
        setCategoryAssignments(newCategoryAssignments)
        hasInitializedFromValueRef.current = true

        // Load slots for each category asynchronously
        slotsToLoad.forEach(
          async ({ categoryKey, specialistId, startTime, serviceId }) => {
            try {
              const result = await getAvailableSlotsForServiceAction({
                businessId,
                serviceId,
                date,
                excludeAppointmentId,
              })

              let availableSlots: TimeSlot[] = []
              if (result.success && result.slots) {
                availableSlots = result.slots.filter(
                  (slot) =>
                    slot.available &&
                    slot.availableSpecialistIds.includes(specialistId)
                )
                // Ensure the pre-existing time is in the slots (for edit mode)
                if (
                  startTime &&
                  !availableSlots.some((s) => s.time === startTime)
                ) {
                  availableSlots.unshift({
                    time: startTime,
                    available: true,
                    availableSpecialistIds: [specialistId],
                  })
                }
              }

              setCategoryAssignments((prev) => {
                const newMap = new Map(prev)
                const current = newMap.get(categoryKey)
                if (current) {
                  newMap.set(categoryKey, {
                    ...current,
                    availableSlots,
                    isLoadingSlots: false,
                  })
                }
                return newMap
              })
            } catch (err) {
              console.error('Error loading category slots for edit:', err)
              setCategoryAssignments((prev) => {
                const newMap = new Map(prev)
                const current = newMap.get(categoryKey)
                if (current) {
                  // Still show the pre-existing time even if loading failed
                  const fallbackSlots: TimeSlot[] = startTime
                    ? [
                        {
                          time: startTime,
                          available: true,
                          availableSpecialistIds: [specialistId],
                        },
                      ]
                    : []
                  newMap.set(categoryKey, {
                    ...current,
                    availableSlots: fallbackSlots,
                    isLoadingSlots: false,
                  })
                }
                return newMap
              })
            }
          }
        )
      }
    }
  }, [
    value,
    universalSpecialists,
    canSingleSpecialistHandleAll,
    categoryGroups,
    businessId,
    date,
    excludeAppointmentId,
  ])

  // Load slots when unified specialist is selected
  useEffect(() => {
    async function loadUnifiedSlots() {
      if (
        !useUnifiedAssignment ||
        !unifiedSpecialistId ||
        !businessId ||
        !date ||
        services.length === 0
      ) {
        setUnifiedSlots([])
        return
      }

      setIsLoadingUnifiedSlots(true)
      try {
        // Use first service to get slots, duration will be total
        const result = await getAvailableSlotsForServiceAction({
          businessId,
          serviceId: services[0].id,
          date,
          excludeAppointmentId,
        })

        if (result.success && result.slots) {
          // Filter slots where the selected specialist is available
          const availableSlots = result.slots.filter(
            (slot) =>
              slot.available &&
              slot.availableSpecialistIds.includes(unifiedSpecialistId)
          )
          setUnifiedSlots(availableSlots)
        }
      } catch (err) {
        console.error('Error loading unified slots:', err)
      } finally {
        setIsLoadingUnifiedSlots(false)
      }
    }

    loadUnifiedSlots()
  }, [
    useUnifiedAssignment,
    unifiedSpecialistId,
    businessId,
    date,
    services,
    excludeAppointmentId,
  ])

  // Handle unified specialist selection
  const handleUnifiedSpecialistSelect = useCallback(
    (specialist: SpecialistWithCategories) => {
      if (disabled) return
      setUnifiedSpecialistId(specialist.id)
      setUnifiedStartTime(null)
      onPrimarySpecialistChange?.(specialist.id)
    },
    [disabled, onPrimarySpecialistChange]
  )

  // Handle unified time selection
  const handleUnifiedTimeSelect = useCallback(
    (time: string) => {
      if (disabled || !unifiedSpecialistId) return
      setUnifiedStartTime(time)

      const specialist = universalSpecialists.find(
        (s) => s.id === unifiedSpecialistId
      )
      const specialistName = specialist
        ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
        : null

      // Calculate end time
      const [hours, minutes] = time.split(':').map(Number)
      const endTotalMinutes = hours * 60 + minutes + totalDuration
      const endHours = Math.floor(endTotalMinutes / 60)
      const endMinutes = endTotalMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
        .toString()
        .padStart(2, '0')}`

      // Update all assignments with the same specialist and sequential times
      let currentMinutes = hours * 60 + minutes
      const newAssignments = value.map((assignment) => {
        const serviceEndMinutes = currentMinutes + assignment.durationMinutes
        const serviceStartTime = `${Math.floor(currentMinutes / 60)
          .toString()
          .padStart(2, '0')}:${(currentMinutes % 60)
          .toString()
          .padStart(2, '0')}`
        const serviceEndTime = `${Math.floor(serviceEndMinutes / 60)
          .toString()
          .padStart(2, '0')}:${(serviceEndMinutes % 60)
          .toString()
          .padStart(2, '0')}`
        currentMinutes = serviceEndMinutes

        return {
          ...assignment,
          specialistId: unifiedSpecialistId,
          specialistName,
          startTime: serviceStartTime,
          endTime: serviceEndTime,
        }
      })

      onChange(newAssignments)
      onTimesCalculated?.(time, endTime)
    },
    [
      disabled,
      unifiedSpecialistId,
      universalSpecialists,
      totalDuration,
      value,
      onChange,
      onTimesCalculated,
    ]
  )

  // Load slots for a specific category/specialist
  const loadCategorySlotsForSpecialist = useCallback(
    async (
      categoryKey: string,
      specialistId: string,
      categoryDuration: number,
      serviceId: string
    ) => {
      // Validar que serviceId exista
      if (!serviceId) {
        setCategoryAssignments((prev) => {
          const newMap = new Map(prev)
          newMap.set(categoryKey, {
            specialistId,
            startTime: null,
            availableSlots: [],
            isLoadingSlots: false,
          })
          return newMap
        })
        return
      }

      setCategoryAssignments((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(categoryKey) || {
          specialistId: null,
          startTime: null,
          availableSlots: [],
          isLoadingSlots: false,
        }
        newMap.set(categoryKey, {
          ...current,
          specialistId,
          isLoadingSlots: true,
          startTime: null,
        })
        return newMap
      })

      try {
        const result = await getAvailableSlotsForServiceAction({
          businessId,
          serviceId,
          date,
          excludeAppointmentId,
        })

        let availableSlots: typeof result.slots = []
        if (result.success && result.slots) {
          availableSlots = result.slots.filter(
            (slot) =>
              slot.available &&
              slot.availableSpecialistIds.includes(specialistId)
          )
        }

        setCategoryAssignments((prev) => {
          const newMap = new Map(prev)
          newMap.set(categoryKey, {
            specialistId,
            startTime: null,
            availableSlots,
            isLoadingSlots: false,
          })
          return newMap
        })
      } catch (err) {
        console.error('Error loading category slots:', err)
        setCategoryAssignments((prev) => {
          const newMap = new Map(prev)
          newMap.set(categoryKey, {
            specialistId,
            startTime: null,
            availableSlots: [],
            isLoadingSlots: false,
          })
          return newMap
        })
      }
    },
    [businessId, date, excludeAppointmentId]
  )

  // Handle category specialist selection
  const handleCategorySpecialistSelect = useCallback(
    (
      categoryKey: string,
      specialist: SpecialistWithCategories,
      categoryDuration: number,
      serviceId: string
    ) => {
      if (disabled) return
      loadCategorySlotsForSpecialist(
        categoryKey,
        specialist.id,
        categoryDuration,
        serviceId
      )

      if (!onPrimarySpecialistChange) return
      const hasAnySpecialist = Array.from(categoryAssignments.values()).some(
        (a) => a.specialistId
      )
      if (!hasAnySpecialist) {
        onPrimarySpecialistChange(specialist.id)
      }
    },
    [
      disabled,
      loadCategorySlotsForSpecialist,
      categoryAssignments,
      onPrimarySpecialistChange,
    ]
  )

  // Handle category time selection
  const handleCategoryTimeSelect = useCallback(
    (categoryKey: string, categoryId: string | null, time: string) => {
      if (disabled) return

      const assignment = categoryAssignments.get(categoryKey)
      if (!assignment?.specialistId) return

      const specialist = categoryGroups
        .find((g) => (g.categoryId || 'no-category') === categoryKey)
        ?.specialists.find((s) => s.id === assignment.specialistId)

      const specialistName = specialist
        ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
        : null

      setCategoryAssignments((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(categoryKey)
        if (current) {
          newMap.set(categoryKey, { ...current, startTime: time })
        }
        return newMap
      })

      // Update assignments for services in this category
      const [hours, minutes] = time.split(':').map(Number)
      let currentMinutes = hours * 60 + minutes

      const newAssignments = value.map((a) => {
        if (
          a.categoryId === categoryId ||
          (categoryId === null && a.categoryId === null)
        ) {
          const serviceEndMinutes = currentMinutes + a.durationMinutes
          const serviceStartTime = `${Math.floor(currentMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(currentMinutes % 60)
            .toString()
            .padStart(2, '0')}`
          const serviceEndTime = `${Math.floor(serviceEndMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(serviceEndMinutes % 60)
            .toString()
            .padStart(2, '0')}`
          currentMinutes = serviceEndMinutes

          return {
            ...a,
            specialistId: assignment.specialistId,
            specialistName,
            startTime: serviceStartTime,
            endTime: serviceEndTime,
          }
        }
        return a
      })

      onChange(newAssignments)

      // Calculate overall start and end times
      const allStartTimes = newAssignments
        .filter((a) => a.startTime)
        .map((a) => a.startTime!)
      const allEndTimes = newAssignments
        .filter((a) => a.endTime)
        .map((a) => a.endTime!)

      if (allStartTimes.length > 0 && allEndTimes.length > 0) {
        const earliestStart = allStartTimes.sort()[0]
        const latestEnd = allEndTimes.sort().reverse()[0]
        onTimesCalculated?.(earliestStart, latestEnd)
      }
    },
    [
      disabled,
      categoryAssignments,
      categoryGroups,
      value,
      onChange,
      onTimesCalculated,
    ]
  )

  const getSpecialistInitials = (specialist: SpecialistWithCategories) => {
    const first = specialist.first_name?.[0] || ''
    const last = specialist.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey)
      } else {
        newSet.add(categoryKey)
      }
      return newSet
    })
  }

  const allServicesAssigned = useMemo(() => {
    return value.every((v) => v.specialistId !== null && v.startTime !== null)
  }, [value])

  // Calculate ALL blocked time ranges (client can't be in two places at once)
  const allBlockedTimeRanges = useMemo(() => {
    const ranges: Array<{
      start: number
      end: number
      categoryId: string | null
    }> = []

    value.forEach((assignment) => {
      if (assignment.startTime && assignment.endTime) {
        const [startH, startM] = assignment.startTime.split(':').map(Number)
        const [endH, endM] = assignment.endTime.split(':').map(Number)
        ranges.push({
          start: startH * 60 + startM,
          end: endH * 60 + endM,
          categoryId: assignment.categoryId,
        })
      }
    })

    return ranges
  }, [value])

  // Check if a time slot is blocked (client already has another service at that time)
  const isSlotBlocked = useCallback(
    (
      slotTime: string,
      durationMinutes: number,
      currentCategoryId: string | null
    ): boolean => {
      if (allBlockedTimeRanges.length === 0) return false

      const [slotH, slotM] = slotTime.split(':').map(Number)
      const slotStart = slotH * 60 + slotM
      const slotEnd = slotStart + durationMinutes

      for (const range of allBlockedTimeRanges) {
        // Skip the current category's own assignment (allow re-selecting)
        if (
          range.categoryId === currentCategoryId ||
          (currentCategoryId === null && range.categoryId === null)
        ) {
          continue
        }

        // Check overlap
        if (slotStart < range.end && slotEnd > range.start) {
          return true
        }
      }

      return false
    },
    [allBlockedTimeRanges]
  )

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Cargando especialistas...</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!businessId || services.length === 0 || !date) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Users className="h-4 w-4" />
        <span>Selecciona servicios y fecha para asignar especialistas</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-4">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Unified Assignment Mode */}
      {canSingleSpecialistHandleAll &&
        universalSpecialists.length > 0 &&
        useUnifiedAssignment && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Un especialista para todo</span>
              </div>
              {categoryGroups.length > 1 && (
                <FeatureGate
                  module="appointments"
                  feature="specialist_assignment"
                  mode="compact"
                >
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setUseUnifiedAssignment(false)
                      setUnifiedSpecialistId(null)
                      setUnifiedStartTime(null)
                      const allCategoryKeys = new Set(
                        categoryGroups.map((g) => g.categoryId || 'no-category')
                      )
                      setExpandedCategories(allCategoryKeys)
                    }}
                    className="text-xs h-6 px-2 gap-1"
                  >
                    <Split className="h-3 w-3" />
                    Asignar por servicio
                  </Button>
                </FeatureGate>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {universalSpecialists.length} especialista
              {universalSpecialists.length !== 1 ? 's' : ''} puede
              {universalSpecialists.length !== 1 ? 'n' : ''} atender todos los
              servicios
            </p>

            {/* Specialist Selection */}
            <div
              className="grid grid-cols-2 gap-2"
              data-tutorial="appointment-specialist-selection"
            >
              {universalSpecialists.map((specialist) => {
                const isSelected = unifiedSpecialistId === specialist.id

                return (
                  <button
                    key={specialist.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleUnifiedSpecialistSelect(specialist)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      !isSelected &&
                        'bg-card hover:bg-accent/50 border-border hover:border-primary/30',
                      isSelected && 'bg-primary/10 border-primary shadow-sm',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium shrink-0',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {specialist.profile_picture_url ? (
                        <img
                          src={specialist.profile_picture_url}
                          alt={specialist.first_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getSpecialistInitials(specialist)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {specialist.first_name} {specialist.last_name || ''}
                      </p>
                      {specialist.specialty && (
                        <p className="text-xs text-muted-foreground truncate">
                          {translateSpecialty(specialist.specialty)}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Time Slot Selection for Unified Mode */}
            {unifiedSpecialistId && (
              <div
                className="space-y-2 pt-2 border-t"
                data-tutorial="appointment-specialist-time-slots"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Selecciona horario</span>
                  <span className="text-xs text-muted-foreground">
                    (Duración total: {totalDuration} min)
                  </span>
                </div>

                {isLoadingUnifiedSlots ? (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-9 w-20 rounded-full" />
                    ))}
                  </div>
                ) : unifiedSlots.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No hay horarios disponibles para este especialista en esta
                    fecha
                  </p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {unifiedSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleUnifiedTimeSelect(slot.time)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-all',
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                          unifiedStartTime === slot.time
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-accent/50 border-border hover:border-primary/30',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Per-Category Assignment Mode */}
      {(!useUnifiedAssignment ||
        !canSingleSpecialistHandleAll ||
        universalSpecialists.length === 0) && (
        <div className="space-y-3">
          {canSingleSpecialistHandleAll && universalSpecialists.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Asignación por categoría</span>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setUseUnifiedAssignment(true)
                  setCategoryAssignments(new Map())
                }}
                className="text-xs h-6 px-2 gap-1"
              >
                <Merge className="h-3 w-3" />
                Asignar uno para todos
              </Button>
            </div>
          )}

          {(!canSingleSpecialistHandleAll ||
            universalSpecialists.length === 0) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Los servicios seleccionados requieren diferentes especialistas.
                Asigna especialista y horario para cada categoría.
              </p>
            </div>
          )}

          {categoryGroups.map((group) => {
            const categoryKey = group.categoryId || 'no-category'
            const servicesInGroup = value.filter(
              (v) =>
                v.categoryId === group.categoryId ||
                (group.categoryId === null && v.categoryId === null)
            )

            const categoryDuration = servicesInGroup.reduce(
              (sum, s) => sum + s.durationMinutes,
              0
            )
            const groupAssigned = servicesInGroup.every(
              (v) => v.specialistId !== null && v.startTime !== null
            )
            const categoryState = categoryAssignments.get(categoryKey)
            const firstServiceId = servicesInGroup[0]?.serviceId

            const isExpanded = expandedCategories.has(categoryKey)

            return (
              <Collapsible
                key={categoryKey}
                open={isExpanded}
                onOpenChange={() => toggleCategory(categoryKey)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between p-3 text-left',
                        'hover:bg-accent/50 transition-colors',
                        groupAssigned
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : 'bg-card'
                      )}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={groupAssigned ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {group.categoryName || 'Sin categoría'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {servicesInGroup.length} servicio
                          {servicesInGroup.length !== 1 ? 's' : ''} ·{' '}
                          {categoryDuration} min
                        </span>
                        {groupAssigned && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Asignado
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 border-t space-y-3">
                      <div className="text-xs text-muted-foreground">
                        Servicios:{' '}
                        {servicesInGroup.map((s) => s.serviceName).join(', ')}
                      </div>

                      {/* Specialist Selection */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium">
                          Selecciona especialista:
                        </p>
                        {group.specialists.length === 0 ? (
                          <p className="text-xs text-amber-600">
                            No hay especialistas disponibles para esta categoría
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {group.specialists.map((specialist) => {
                              const isSelected =
                                categoryState?.specialistId === specialist.id

                              return (
                                <button
                                  key={specialist.id}
                                  type="button"
                                  disabled={disabled}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCategorySpecialistSelect(
                                      categoryKey,
                                      specialist,
                                      categoryDuration,
                                      firstServiceId
                                    )
                                  }}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
                                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                    !isSelected &&
                                      'bg-card hover:bg-accent/50 border-border hover:border-primary/30',
                                    isSelected &&
                                      'bg-primary/10 border-primary',
                                    disabled && 'opacity-50 cursor-not-allowed'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium shrink-0',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {specialist.profile_picture_url ? (
                                      <img
                                        src={specialist.profile_picture_url}
                                        alt={specialist.first_name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      getSpecialistInitials(specialist)
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {specialist.first_name}{' '}
                                      {specialist.last_name || ''}
                                    </p>
                                  </div>

                                  {isSelected && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Time Slot Selection for Category */}
                      {categoryState?.specialistId && (
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Selecciona horario:
                          </p>

                          {categoryState.isLoadingSlots ? (
                            <div className="flex gap-2 flex-wrap">
                              {[1, 2, 3].map((i) => (
                                <Skeleton
                                  key={i}
                                  className="h-8 w-16 rounded-full"
                                />
                              ))}
                            </div>
                          ) : (
                            (() => {
                              const availableFilteredSlots =
                                categoryState.availableSlots.filter(
                                  (slot) =>
                                    !isSlotBlocked(
                                      slot.time,
                                      categoryDuration,
                                      group.categoryId
                                    )
                                )
                              return availableFilteredSlots.length === 0 ? (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  No hay horarios disponibles (el cliente tiene
                                  otros servicios en esos horarios)
                                </p>
                              ) : (
                                <div className="flex gap-2 flex-wrap">
                                  {availableFilteredSlots.map((slot) => (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      disabled={disabled}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCategoryTimeSelect(
                                          categoryKey,
                                          group.categoryId,
                                          slot.time
                                        )
                                      }}
                                      className={cn(
                                        'px-2.5 py-1 rounded-full text-xs border transition-all',
                                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                        categoryState.startTime === slot.time
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-card hover:bg-accent/50 border-border hover:border-primary/30',
                                        disabled &&
                                          'opacity-50 cursor-not-allowed'
                                      )}
                                    >
                                      {formatTime(slot.time)}
                                    </button>
                                  ))}
                                </div>
                              )
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* Assignment Summary - ordered by start time */}
      {value.some((v) => v.specialistId && v.startTime) && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <p className="text-xs font-medium">Resumen de asignaciones:</p>
          <div className="space-y-1">
            {value
              .filter((v) => v.specialistId && v.startTime)
              .sort((a, b) =>
                (a.startTime || '').localeCompare(b.startTime || '')
              )
              .map((assignment) => (
                <div
                  key={assignment.serviceId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground truncate flex-1">
                    {assignment.serviceName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium">
                      {assignment.specialistName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {assignment.startTime && formatTime(assignment.startTime)}{' '}
                      - {assignment.endTime && formatTime(assignment.endTime)}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {value.length > 0 && !allServicesAssigned && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Asigna especialista y horario para continuar
          </span>
        </div>
      )}
    </div>
  )
}
