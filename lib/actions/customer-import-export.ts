'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createFullCustomerAction,
  updateBusinessCustomerAction,
} from '@/lib/actions/business-customer'
import {
  DEFAULT_CUSTOMER_TEMPLATES,
  type CustomerRow,
} from '@/lib/data-templates/const/customer-import-template'
import importService from '@/lib/services/data-templates/generic-import-service'
import {
  validateEmail,
  validateDate,
  validateEnum,
  cleanExcelValue,
} from '@/lib/utils/excel-import-helpers'
import type {
  BusinessCustomer,
  CustomerSource,
  CustomerStatus,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'
import type { UserGender } from '@/lib/models/user/users-profile'

const CUSTOMER_SOURCES: readonly CustomerSource[] = ['walk_in', 'referral', 'social_media', 'website', 'ai_agent', 'other'] as const
const CUSTOMER_STATUSES: readonly CustomerStatus[] = ['active', 'inactive', 'vip', 'blocked'] as const
const USER_GENDERS: readonly UserGender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const

interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
}

/**
 * Exportar clientes a Excel
 */
export async function exportCustomersToExcelAction(
  businessId: string
): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Obtener clientes del negocio con user_profile
    const { data: customers, error } = await supabase
      .from('business_customers')
      .select('*, user_profile:users_profiles(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error || !customers) {
      return {
        success: false,
        error: 'No se pudieron obtener los clientes',
      }
    }

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Convertir clientes a formato Excel
    const customersData: CustomerRow[] = customers.map((customer) => ({
      first_name: customer.first_name,
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      source: customer.source || undefined,
      status: customer.status,
      notes: customer.notes || '',
      birthday: customer.birthday || '',
      city: (customer.user_profile as any)?.city || '',
      state: (customer.user_profile as any)?.state || '',
      country: (customer.user_profile as any)?.country || '',
      gender: (customer.user_profile as any)?.gender || undefined,
      identification_type: (customer.user_profile as any)?.identification_type || '',
      identification_number: (customer.user_profile as any)?.identification_number || '',
    }))

    const wsCustomers = XLSX.utils.json_to_sheet(customersData)
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers')

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `clientes-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error exporting customers to Excel:', error)
    return {
      success: false,
      error: error.message || 'Error al exportar clientes',
    }
  }
}

/**
 * Crear plantilla de ejemplo para clientes
 */
export async function createDefaultCustomersTemplateAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const wb = XLSX.utils.book_new()

    const wsCustomers = XLSX.utils.json_to_sheet(DEFAULT_CUSTOMER_TEMPLATES)
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers')

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellDates: true,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `plantilla-clientes-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error creating default customers template:', error)
    return {
      success: false,
      error: error.message || 'Error al crear plantilla de clientes',
    }
  }
}

/**
 * Procesar un cliente individual
 */
async function processCustomer(
  row: CustomerRow,
  businessId: string,
  index: number
): Promise<CustomerRow> {
  // Validaciones básicas
  if (!row.first_name || !row.last_name || !row.email) {
    throw new Error(
      `Fila ${index + 1}: first_name, last_name y email son obligatorios`
    )
  }

  // Limpiar valores
  const cleanedFirstName = cleanExcelValue(row.first_name)
  const cleanedLastName = cleanExcelValue(row.last_name)
  const cleanedEmail = cleanExcelValue(row.email)
  const cleanedPhone = cleanExcelValue(row.phone)
  const cleanedNotes = cleanExcelValue(row.notes)
  const cleanedBirthday = cleanExcelValue(row.birthday)
  const cleanedCity = cleanExcelValue(row.city) || 'Cali'
  const cleanedState = cleanExcelValue(row.state) || 'Valle del Cauca'
  const cleanedCountry = cleanExcelValue(row.country) || 'CO'
  const cleanedIdentificationType = cleanExcelValue(row.identification_type)
  const cleanedIdentificationNumber = cleanExcelValue(row.identification_number)

  if (!cleanedFirstName || !cleanedLastName || !cleanedEmail) {
    throw new Error(
      `Fila ${index + 1}: first_name, last_name y email no pueden estar vacíos`
    )
  }

  // Validar email
  if (!validateEmail(cleanedEmail)) {
    throw new Error(`Fila ${index + 1}: Email '${cleanedEmail}' no es válido`)
  }

  // Validar source
  let source: CustomerSource | undefined = undefined
  if (row.source) {
    try {
      source = validateEnum(
        row.source.toLowerCase(),
        CUSTOMER_SOURCES,
        'source'
      )
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Validar status
  let status: CustomerStatus = 'active'
  if (row.status) {
    try {
      status = validateEnum(
        row.status.toLowerCase(),
        CUSTOMER_STATUSES,
        'status'
      )
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Validar gender
  let gender: UserGender | undefined = undefined
  if (row.gender) {
    try {
      gender = validateEnum(
        row.gender.toUpperCase(),
        USER_GENDERS,
        'gender'
      )
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Validar birthday
  if (cleanedBirthday && !validateDate(cleanedBirthday)) {
    throw new Error(
      `Fila ${index + 1}: birthday '${cleanedBirthday}' debe estar en formato YYYY-MM-DD`
    )
  }

  // Verificar si el cliente ya existe en este negocio
  const supabase = await getSupabaseAdminClient()
  const { data: existingCustomer } = await supabase
    .from('business_customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', cleanedEmail)
    .maybeSingle()

  if (existingCustomer) {
    // Actualizar cliente existente
    const updateResult = await updateBusinessCustomerAction(existingCustomer.id, {
      first_name: cleanedFirstName,
      last_name: cleanedLastName,
      phone: cleanedPhone,
      source,
      status,
      notes: cleanedNotes,
      birthday: cleanedBirthday,
    })

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Error actualizando cliente')
    }
  } else {
    // Crear nuevo cliente con user_profile
    const customerInput: CreateCustomerInput = {
      business_id: businessId,
      first_name: cleanedFirstName,
      last_name: cleanedLastName,
      email: cleanedEmail,
      phone: cleanedPhone,
      source,
      notes: cleanedNotes,
      date_of_birth: cleanedBirthday,
      city: cleanedCity,
      state: cleanedState,
      country: cleanedCountry,
      gender,
      identification_type: cleanedIdentificationType,
      identification_number: cleanedIdentificationNumber,
    }

    const createResult = await createFullCustomerAction(customerInput)

    if (!createResult.success) {
      throw new Error(createResult.error || 'Error creando cliente')
    }
  }

  return row
}

/**
 * Importar clientes desde Excel con progreso
 */
export async function importCustomersWithProgress(
  formData: FormData
): Promise<{ sessionId: string; status: string }> {
  try {
    // Extraer datos del FormData
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const businessId = formData.get('businessId') as string

    if (!sessionId) {
      throw new Error('Session ID requerido')
    }

    if (!businessId) {
      throw new Error('Business ID requerido')
    }

    // Leer archivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

    // Validar que exista la hoja requerida
    if (!wb.Sheets['Customers']) {
      throw new Error('La hoja "Customers" es obligatoria y no se encontró en el archivo Excel')
    }

    // Leer datos de la hoja
    const customersData = XLSX.utils.sheet_to_json<CustomerRow>(wb.Sheets['Customers'])

    if (customersData.length === 0) {
      throw new Error('La hoja "Customers" está vacía o no tiene datos válidos')
    }

    // Iniciar procesamiento en background
    importService
      .importWithProgress(
        customersData,
        async (customerRow, index) => {
          return await processCustomer(customerRow, businessId, index)
        },
        {
          batchSize: 3, // Procesar de 3 en 3 (más lento que services por complejidad)
          continueOnError: false,
        },
        sessionId
      )
      .then((result) => {
        if (result.success) {
          console.log(`Import ${sessionId} completed successfully:`, result)
        } else {
          console.log(`Import ${sessionId} completed with errors:`, result)
        }
      })
      .catch((error) => {
        console.error(`Import ${sessionId} error:`, error)
      })

    // Devolver inmediatamente con sessionId
    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error
  }
}
