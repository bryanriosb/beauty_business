'use client'

import { useRef, useMemo, useCallback } from 'react'
import { CheckCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableRef, FilterConfig, SearchConfig } from '@/components/DataTable'
import { getCommissionColumns, COMMISSION_STATUS_OPTIONS } from './CommissionTableColumns'
import CommissionService from '@/lib/services/commission/commission-service'
import type { CommissionStatus } from '@/lib/models/commission'

interface CommissionTableProps {
  businessId: string
  specialistId?: string
  startDate?: string
  endDate?: string
  onStatusChange?: (id: string, status: CommissionStatus) => void
  onBulkStatusChange?: (ids: string[], status: CommissionStatus) => void
  showSpecialist?: boolean
}

export function CommissionTable({
  businessId,
  specialistId,
  startDate,
  endDate,
  onStatusChange,
  onBulkStatusChange,
  showSpecialist = true,
}: CommissionTableProps) {
  const tableRef = useRef<DataTableRef>(null)
  const commissionService = useMemo(() => new CommissionService(), [])

  const columns = useMemo(
    () => getCommissionColumns({ showSpecialist, onStatusChange }),
    [showSpecialist, onStatusChange]
  )

  const defaultQueryParams = useMemo(() => {
    const params: Record<string, any> = {
      business_id: businessId,
    }
    if (specialistId) {
      params.specialist_id = specialistId
    }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return params
  }, [businessId, specialistId, startDate, endDate])

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: COMMISSION_STATUS_OPTIONS,
      },
    ],
    []
  )

  const searchConfig: SearchConfig | undefined = useMemo(() => {
    if (!showSpecialist) return undefined
    return {
      column: 'specialist_name',
      placeholder: 'Buscar especialista...',
      serverField: 'specialist_name',
    }
  }, [showSpecialist])

  const handleBulkApprove = useCallback(async () => {
    if (!onBulkStatusChange || !tableRef.current) return
    const ids = tableRef.current.getSelectedRowIds()
    if (ids.length === 0) return
    await onBulkStatusChange(ids, 'approved')
    tableRef.current.clearSelection()
    tableRef.current.refreshData()
  }, [onBulkStatusChange])

  const handleBulkPaid = useCallback(async () => {
    if (!onBulkStatusChange || !tableRef.current) return
    const ids = tableRef.current.getSelectedRowIds()
    if (ids.length === 0) return
    await onBulkStatusChange(ids, 'paid')
    tableRef.current.clearSelection()
    tableRef.current.refreshData()
  }, [onBulkStatusChange])

  return (
    <div className="space-y-4">
      {onBulkStatusChange && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkApprove}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Aprobar Seleccionadas
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkPaid}
          >
            <Wallet className="h-4 w-4 mr-1" />
            Marcar Pagadas
          </Button>
        </div>
      )}

      <DataTable
        ref={tableRef}
        columns={columns}
        service={commissionService}
        defaultQueryParams={defaultQueryParams}
        filters={filters}
        searchConfig={searchConfig}
        enableRowSelection={!!onBulkStatusChange}
        getRowId={(row) => row.id}
      />
    </div>
  )
}
