import {
  fetchServicesAction,
  getServiceByIdAction,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  fetchServiceCategoriesAction,
} from '@/lib/actions/service'
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategory,
} from '@/lib/models/service/service'

export interface ServiceListResponse {
  data: Service[]
  total: number
  total_pages: number
}

export default class ServiceService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    category_id?: string
    is_featured?: boolean
  }): Promise<ServiceListResponse> {
    try {
      return await fetchServicesAction(params)
    } catch (error) {
      console.error('Error fetching services:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Service | null> {
    try {
      return await getServiceByIdAction(id)
    } catch (error) {
      console.error('Error fetching service by ID:', error)
      throw error
    }
  }

  async createItem(
    data: ServiceInsert
  ): Promise<{ success: boolean; data?: Service; error?: string }> {
    try {
      return await createServiceAction(data)
    } catch (error: any) {
      console.error('Error creating service:', error)
      throw error
    }
  }

  async updateItem(
    data: Service | Partial<Service>,
    partial = true
  ): Promise<{ success: boolean; data?: Service; error?: string }> {
    try {
      if (!data.id) {
        throw new Error('Service ID is required for update')
      }
      return await updateServiceAction(data.id, data)
    } catch (error: any) {
      console.error('Error updating service:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteServiceAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete service')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      throw new Error(`Failed to destroy service: ${error}`)
    }
  }

  async fetchCategories(): Promise<ServiceCategory[]> {
    try {
      return await fetchServiceCategoriesAction()
    } catch (error) {
      console.error('Error fetching service categories:', error)
      throw error
    }
  }
}
