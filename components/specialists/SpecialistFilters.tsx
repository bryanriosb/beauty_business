'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface SpecialistFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  specialtyFilter: string
  onSpecialtyFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  specialties: string[]
}

export function SpecialistFilters({
  search,
  onSearchChange,
  specialtyFilter,
  onSpecialtyFilterChange,
  statusFilter,
  onStatusFilterChange,
  specialties,
}: SpecialistFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar especialistas..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={specialtyFilter} onValueChange={onSpecialtyFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Especialidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {specialties.map((specialty) => (
            <SelectItem key={specialty} value={specialty}>
              {specialty}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="featured">Destacados</SelectItem>
          <SelectItem value="regular">Regulares</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
