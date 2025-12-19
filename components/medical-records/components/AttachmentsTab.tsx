'use client'

import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Section } from './MedicalRecordSections'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface AttachmentsTabProps {
  record: MedicalRecordWithDetails
}

export function AttachmentsTab({ record }: AttachmentsTabProps) {
  const hasAttachments = record.attachments && record.attachments.length > 0

  return (
    <Section icon={Paperclip} title="Archivos adjuntos">
      {hasAttachments ? (
        <div className="grid gap-4">
          {record.attachments?.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                    </div>
                  </div>
                  {file.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay archivos adjuntos</p>
          </CardContent>
        </Card>
      )}
    </Section>
  )
}