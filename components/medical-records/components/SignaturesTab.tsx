'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, FileSignature } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Section } from './MedicalRecordSections'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface SignaturesTabProps {
  record: MedicalRecordWithDetails
}

export function SignaturesTab({ record }: SignaturesTabProps) {
  const isSigned = !!record.signature_data
  const hasSpecialistSignature = !!record.specialist_signature_data

  return (
    <Section icon={FileSignature} title="Firmas">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Firma del paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center justify-between text-base">
              <span>Paciente</span>
              {isSigned ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Firmado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSigned ? (
              <div className="space-y-3">
                {record.signature_data && (
                  <div className="bg-white border rounded p-3">
                    <img
                      src={record.signature_data}
                      alt="Firma del paciente"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                )}
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Firmado por:</strong> {record.signed_by_name}
                  </p>
                  {record.signed_by_document && (
                    <p>
                      <strong>Documento:</strong> {record.signed_by_document}
                    </p>
                  )}
                  {record.signature_date && (
                    <p>
                      <strong>Fecha:</strong>{' '}
                      {format(
                        new Date(record.signature_date),
                        'dd/MM/yyyy HH:mm',
                        { locale: es }
                      )}
                    </p>
                  )}
                  {record.signature_ip && (
                    <p>
                      <strong>IP:</strong> {record.signature_ip}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                El paciente aún no ha firmado este documento.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Firma del especialista */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center justify-between text-base">
              <span>Especialista</span>
              {hasSpecialistSignature ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Firmado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSpecialistSignature ? (
              <div className="space-y-3">
                {record.specialist_signature_data && (
                  <div className="bg-white border rounded p-3">
                    <img
                      src={record.specialist_signature_data}
                      alt="Firma del especialista"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                )}
                <div className="text-sm space-y-1">
                  {record.specialist_signature_date && (
                    <p>
                      <strong>Fecha:</strong>{' '}
                      {format(
                        new Date(record.specialist_signature_date),
                        'dd/MM/yyyy HH:mm',
                        { locale: es }
                      )}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                El especialista aún no ha firmado este documento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
