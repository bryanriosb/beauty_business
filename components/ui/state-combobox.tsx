'use client'

import { useEffect, useMemo } from 'react'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { useColombiaLocationsStore, State } from '@/lib/store/colombia-locations-store'

interface StateComboBoxProps {
  value?: string | null
  onChange?: (value: string | null, selectedState?: State) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function StateComboBox({
  value = null,
  onChange,
  placeholder = 'Seleccionar departamento...',
  disabled = false,
  className,
}: StateComboBoxProps) {
  const {
    states,
    isLoadingStates,
    loadStates,
    selectedState,
    setSelectedState,
  } = useColombiaLocationsStore()

  useEffect(() => {
    // Load states on component mount
    loadStates().catch(console.error)
  }, [loadStates])

  const options: ComboboxOption[] = useMemo(() => 
    states.map((state) => ({
      value: state.id_state.toString(),
      label: state.state_name,
    })),
    [states]
  )

  const handleStateChange = (optionValue: string | null) => {
    if (optionValue) {
      const state = states.find(s => s.id_state.toString() === optionValue)
      setSelectedState(state || null)
      onChange?.(optionValue, state || undefined)
    } else {
      setSelectedState(null)
      onChange?.(null, undefined)
    }
  }

  // Sync external value with internal state
  useEffect(() => {
    if (value && (!selectedState || selectedState.id_state.toString() !== value)) {
      const state = states.find(s => s.id_state.toString() === value)
      setSelectedState(state || null)
    } else if (!value && selectedState) {
      setSelectedState(null)
    }
  }, [value, selectedState, states, setSelectedState])

  return (
    <Combobox
      options={options}
      value={selectedState?.id_state.toString() || value}
      onChange={handleStateChange}
      placeholder={placeholder}
      disabled={disabled || isLoadingStates}
      isLoading={isLoadingStates}
      className={className}
    />
  )
}