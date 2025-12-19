'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Section } from './MedicalRecordSections'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface PatientInfoTabProps {
  record: MedicalRecordWithDetails
}

export function PatientInfoTab({ record }: PatientInfoTabProps) {
  return (
    <div className="space-y-6">
      <Section icon={User} title="Datos del Paciente">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos personales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div>
                    <span className="text-sm font-medium">Nombre completo:</span>
                    <p className="text-lg font-semibold">
                      {record.customer?.first_name} {record.customer?.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm">{record.customer?.email || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Teléfono:</span>
                    <p className="text-sm">{record.customer?.phone || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">ID Perfil:</span>
                    <p className="font-mono text-xs text-muted-foreground">
                      {record.customer?.user_profile_id || 'No registrado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas del paciente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Estado:</span>
                    <Badge
                      variant={
                        record.customer?.status === 'active'
                          ? 'default'
                          : record.customer?.status === 'vip'
                          ? 'default'
                          : record.customer?.status === 'inactive'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {record.customer?.status === 'active'
                        ? 'Activo'
                        : record.customer?.status === 'vip'
                        ? 'VIP'
                        : record.customer?.status === 'inactive'
                        ? 'Inactivo'
                        : record.customer?.status === 'blocked'
                        ? 'Bloqueado'
                        : 'Desconocido'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total visitas:</span>
                    <span className="text-lg font-semibold">
                      {record.customer?.total_visits || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total gastado:</span>
                    <span className="text-lg font-semibold">
                      ${(record.customer?.total_spent_cents || 0) / 100}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Última visita:</span>
                    <span className="text-sm">
                      {record.customer?.last_visit_at
                        ? format(
                            new Date(record.customer.last_visit_at),
                            'dd/MM/yyyy',
                            { locale: es }
                          )
                        : 'Sin visitas'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metadatos adicionales */}
          {record.customer?.metadata &&
            Object.keys(record.customer.metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información Adicional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {record.customer.metadata.allergies &&
                      record.customer.metadata.allergies.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Alergias conocidas:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {record.customer.metadata.allergies.map((allergy, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {record.customer.metadata.preferred_specialist_id && (
                      <div>
                        <span className="text-sm font-medium">Especialista preferido:</span>
                        <p className="text-sm mt-1">
                          ID: {record.customer.metadata.preferred_specialist_id}
                        </p>
                      </div>
                    )}
                    {record.customer.tags && record.customer.tags.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Etiquetas:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.customer.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </Section>
    </div>
  )
}