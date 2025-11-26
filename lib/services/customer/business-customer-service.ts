import {
  fetchBusinessCustomersAction,
  getBusinessCustomerByIdAction,
  getBusinessCustomerByUserProfileAction,
  createBusinessCustomerAction,
  createFullCustomerAction,
  updateBusinessCustomerAction,
  deleteBusinessCustomerAction,
  deleteBusinessCustomersAction,
  searchBusinessCustomersAction,
  incrementCustomerVisitAction,
} from '@/lib/actions/business-customer'
import type {
  BusinessCustomer,
  BusinessCustomerInsert,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'

export interface BusinessCustomerListResponse {
  data: BusinessCustomer[]
  total: number
  total_pages: number
}

export default class BusinessCustomerService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    search?: string
    status?: string
  }): Promise<BusinessCustomerListResponse> {
    try {
      return await fetchBusinessCustomersAction(params)
    } catch (error) {
      console.error('Error fetching business customers:', error)
      throw error
    }
  }

  async getById(id: string): Promise<BusinessCustomer | null> {
    try {
      return await getBusinessCustomerByIdAction(id)
    } catch (error) {
      console.error('Error fetching business customer by ID:', error)
      throw error
    }
  }

  async getByUserProfile(
    businessId: string,
    userProfileId: string
  ): Promise<BusinessCustomer | null> {
    try {
      return await getBusinessCustomerByUserProfileAction(businessId, userProfileId)
    } catch (error) {
      console.error('Error fetching business customer by user profile:', error)
      throw error
    }
  }

  async createItem(
    data: BusinessCustomerInsert
  ): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
    try {
      return await createBusinessCustomerAction(data)
    } catch (error: any) {
      console.error('Error creating business customer:', error)
      throw error
    }
  }

  async createFullCustomer(input: CreateCustomerInput): Promise<{
    success: boolean
    data?: BusinessCustomer
    userProfileId?: string
    error?: string
    isNew?: boolean
  }> {
    try {
      return await createFullCustomerAction(input)
    } catch (error: any) {
      console.error('Error creating full customer:', error)
      return { success: false, error: error.message }
    }
  }

  async updateItem(
    id: string,
    data: BusinessCustomerUpdate
  ): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
    try {
      return await updateBusinessCustomerAction(id, data)
    } catch (error: any) {
      console.error('Error updating business customer:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteBusinessCustomerAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete business customer')
      }
    } catch (error) {
      console.error('Error deleting business customer:', error)
      throw new Error(`Failed to destroy business customer: ${error}`)
    }
  }

  async search(businessId: string, query: string, limit?: number): Promise<BusinessCustomer[]> {
    try {
      return await searchBusinessCustomersAction(businessId, query, limit)
    } catch (error) {
      console.error('Error searching business customers:', error)
      return []
    }
  }

  async incrementVisit(
    businessCustomerId: string,
    amountCents: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await incrementCustomerVisitAction(businessCustomerId, amountCents)
    } catch (error: any) {
      console.error('Error incrementing customer visit:', error)
      return { success: false, error: error.message }
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deleteBusinessCustomersAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting business customers:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }
}
