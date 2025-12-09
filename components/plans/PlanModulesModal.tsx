'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type {
  Plan,
  PlanModule,
  PlanModuleAccess,
  PlanModuleAccessInsert,
} from '@/lib/models/plan/plan'
import { Loader2, Package } from 'lucide-react'
import PlanService from '@/lib/services/plan/plan-service'
import { toast } from 'sonner'

interface PlanModulesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
}

interface ModuleAccessState {
  moduleId: string
  enabled: boolean
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
}

export function PlanModulesModal({
  open,
  onOpenChange,
  plan,
}: PlanModulesModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [modules, setModules] = useState<PlanModule[]>([])
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessState[]>([])
  const planService = new PlanService()

  const loadData = useCallback(async () => {
    if (!plan) return

    setIsLoading(true)
    try {
      const [allModules, currentAccess] = await Promise.all([
        planService.fetchActiveModules(),
        planService.fetchModuleAccess(plan.id),
      ])

      setModules(allModules)

      const accessState: ModuleAccessState[] = allModules.map((module) => {
        const existing = currentAccess.find((a) => a.module_id === module.id)
        return {
          moduleId: module.id,
          enabled: !!existing,
          canRead: existing?.can_read ?? true,
          canWrite: existing?.can_write ?? true,
          canDelete: existing?.can_delete ?? true,
        }
      })
      setModuleAccess(accessState)
    } catch (error) {
      console.error('Error loading modules:', error)
      toast.error('Error al cargar los módulos')
    } finally {
      setIsLoading(false)
    }
  }, [plan])

  useEffect(() => {
    if (open && plan) {
      loadData()
    }
  }, [open, plan, loadData])

  const toggleModule = (moduleId: string) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? { ...access, enabled: !access.enabled }
          : access
      )
    )
  }

  const updatePermission = (
    moduleId: string,
    permission: 'canRead' | 'canWrite' | 'canDelete',
    value: boolean
  ) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? { ...access, [permission]: value }
          : access
      )
    )
  }

  const handleSave = async () => {
    if (!plan) return

    setIsSaving(true)
    try {
      const accessData: PlanModuleAccessInsert[] = moduleAccess
        .filter((access) => access.enabled)
        .map((access) => ({
          plan_id: plan.id,
          module_id: access.moduleId,
          can_read: access.canRead,
          can_write: access.canWrite,
          can_delete: access.canDelete,
        }))

      const result = await planService.setModuleAccess(plan.id, accessData)
      if (result.success) {
        toast.success('Módulos actualizados correctamente')
        onOpenChange(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar los módulos')
    } finally {
      setIsSaving(false)
    }
  }

  const getModuleAccess = (moduleId: string) =>
    moduleAccess.find((a) => a.moduleId === moduleId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurar Módulos</DialogTitle>
          <DialogDescription>
            {plan
              ? `Selecciona los módulos disponibles para el plan "${plan.name}"`
              : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay módulos disponibles</p>
                  <p className="text-sm">Crea módulos primero desde la configuración</p>
                </div>
              ) : (
                modules.map((module) => {
                  const access = getModuleAccess(module.id)
                  const isEnabled = access?.enabled ?? false

                  return (
                    <div
                      key={module.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`module-${module.id}`}
                            checked={isEnabled}
                            onCheckedChange={() => toggleModule(module.id)}
                          />
                          <div>
                            <Label
                              htmlFor={`module-${module.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {module.name}
                            </Label>
                            {module.description && (
                              <p className="text-xs text-muted-foreground">
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {module.code}
                        </code>
                      </div>

                      {isEnabled && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`read-${module.id}`}
                                checked={access?.canRead ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canRead', v)
                                }
                              />
                              <Label
                                htmlFor={`read-${module.id}`}
                                className="text-sm"
                              >
                                Lectura
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`write-${module.id}`}
                                checked={access?.canWrite ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canWrite', v)
                                }
                              />
                              <Label
                                htmlFor={`write-${module.id}`}
                                className="text-sm"
                              >
                                Escritura
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`delete-${module.id}`}
                                checked={access?.canDelete ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canDelete', v)
                                }
                              />
                              <Label
                                htmlFor={`delete-${module.id}`}
                                className="text-sm"
                              >
                                Eliminar
                              </Label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
