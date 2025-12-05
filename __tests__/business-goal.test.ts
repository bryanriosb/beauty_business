import { describe, it, expect } from 'vitest'
import {
  calculateGoalProgress,
  getGoalPeriodDates,
  formatGoalValue,
  GOAL_TYPE_LABELS,
  GOAL_PERIOD_LABELS,
  type BusinessGoal,
  type GoalType,
  type GoalPeriod,
} from '@/lib/models/business/business-goal'

describe('Business Goal Model', () => {
  describe('calculateGoalProgress', () => {
    it('should return 0 when target_value is 0', () => {
      const goal: BusinessGoal = {
        id: '1',
        business_id: 'biz-1',
        goal_type: 'services_completed',
        target_value: 0,
        current_value: 50,
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      expect(calculateGoalProgress(goal)).toBe(0)
    })

    it('should calculate correct percentage', () => {
      const goal: BusinessGoal = {
        id: '1',
        business_id: 'biz-1',
        goal_type: 'services_completed',
        target_value: 100,
        current_value: 50,
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      expect(calculateGoalProgress(goal)).toBe(50)
    })

    it('should cap at 100% when exceeded', () => {
      const goal: BusinessGoal = {
        id: '1',
        business_id: 'biz-1',
        goal_type: 'services_completed',
        target_value: 100,
        current_value: 150,
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      expect(calculateGoalProgress(goal)).toBe(100)
    })

    it('should round to nearest integer', () => {
      const goal: BusinessGoal = {
        id: '1',
        business_id: 'biz-1',
        goal_type: 'services_completed',
        target_value: 100,
        current_value: 33,
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      expect(calculateGoalProgress(goal)).toBe(33)
    })
  })

  describe('getGoalPeriodDates', () => {
    it('should return start and end dates for daily period', () => {
      const { start, end } = getGoalPeriodDates('daily')

      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)

      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)

      expect(start.toDateString()).toBe(end.toDateString())
    })

    it('should return start and end dates for weekly period', () => {
      const { start, end } = getGoalPeriodDates('weekly')

      // A week is 7 days (Monday to Sunday)
      const dayDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      expect(dayDiff).toBeGreaterThanOrEqual(6)
      expect(dayDiff).toBeLessThanOrEqual(7)

      // Week starts on Monday (1) or Sunday (0) depending on locale
      expect([0, 1]).toContain(start.getDay())
    })

    it('should return start and end dates for monthly period', () => {
      const { start, end } = getGoalPeriodDates('monthly')

      expect(start.getDate()).toBe(1)

      const nextDay = new Date(end)
      nextDay.setDate(nextDay.getDate() + 1)
      expect(nextDay.getDate()).toBe(1)
    })
  })

  describe('formatGoalValue', () => {
    it('should format revenue with currency symbol', () => {
      const result = formatGoalValue(1000000, 'revenue')
      expect(result).toContain('$')
      expect(result).toContain('1')
    })

    it('should format services_completed without currency', () => {
      const result = formatGoalValue(50, 'services_completed')
      expect(result).not.toContain('$')
      expect(result).toBe('50')
    })

    it('should format new_clients without currency', () => {
      const result = formatGoalValue(20, 'new_clients')
      expect(result).not.toContain('$')
      expect(result).toBe('20')
    })

    it('should format hours_worked without currency', () => {
      const result = formatGoalValue(100, 'hours_worked')
      expect(result).not.toContain('$')
      expect(result).toBe('100')
    })
  })

  describe('GOAL_TYPE_LABELS', () => {
    it('should have labels for all goal types', () => {
      const goalTypes: GoalType[] = ['services_completed', 'revenue', 'new_clients', 'hours_worked']

      goalTypes.forEach((type) => {
        expect(GOAL_TYPE_LABELS[type]).toBeDefined()
        expect(typeof GOAL_TYPE_LABELS[type]).toBe('string')
        expect(GOAL_TYPE_LABELS[type].length).toBeGreaterThan(0)
      })
    })

    it('should have Spanish labels', () => {
      expect(GOAL_TYPE_LABELS.services_completed).toBe('Servicios completados')
      expect(GOAL_TYPE_LABELS.revenue).toBe('Ingresos')
      expect(GOAL_TYPE_LABELS.new_clients).toBe('Nuevos clientes')
      expect(GOAL_TYPE_LABELS.hours_worked).toBe('Horas trabajadas')
    })
  })

  describe('GOAL_PERIOD_LABELS', () => {
    it('should have labels for all periods', () => {
      const periods: GoalPeriod[] = ['daily', 'weekly', 'monthly']

      periods.forEach((period) => {
        expect(GOAL_PERIOD_LABELS[period]).toBeDefined()
        expect(typeof GOAL_PERIOD_LABELS[period]).toBe('string')
        expect(GOAL_PERIOD_LABELS[period].length).toBeGreaterThan(0)
      })
    })

    it('should have Spanish labels', () => {
      expect(GOAL_PERIOD_LABELS.daily).toBe('Diario')
      expect(GOAL_PERIOD_LABELS.weekly).toBe('Semanal')
      expect(GOAL_PERIOD_LABELS.monthly).toBe('Mensual')
    })
  })
})

describe('BusinessGoal Types', () => {
  it('should allow creating a valid BusinessGoal object', () => {
    const goal: BusinessGoal = {
      id: 'goal-123',
      business_id: 'biz-456',
      goal_type: 'revenue',
      target_value: 500000,
      current_value: 250000,
      period_type: 'monthly',
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T12:00:00Z',
    }

    expect(goal.id).toBe('goal-123')
    expect(goal.business_id).toBe('biz-456')
    expect(goal.goal_type).toBe('revenue')
    expect(goal.target_value).toBe(500000)
    expect(goal.current_value).toBe(250000)
    expect(goal.is_active).toBe(true)
  })
})
