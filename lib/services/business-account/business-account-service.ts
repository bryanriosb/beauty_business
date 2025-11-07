import {
  fetchBusinessAccountsAction,
  createBusinessAccountAction,
  updateBusinessAccountAction,
  getBusinessAccountByIdAction,
  getUserBusinessAccountsAction,
  addAccountMemberAction,
  updateAccountMemberAction,
  removeAccountMemberAction,
  getAccountMembersAction,
  isAccountAdminAction,
  canCreateBusinessInAccountAction,
} from '@/lib/actions/business-account'
import { getSupabaseClient } from '@/lib/actions/supabase'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import type {
  BusinessAccountMember,
  BusinessAccountMemberInsert,
  BusinessAccountMemberUpdate,
} from '@/lib/models/business-account/business-account-member'
import type { BusinessAccountListResponse } from '@/lib/actions/business-account'

export default class BusinessAccountService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    company_name?: string[]
  }): Promise<BusinessAccountListResponse> {
    try {
      return await fetchBusinessAccountsAction(params)
    } catch (error) {
      console.error('Error fetching business accounts:', error)
      return {
        data: [],
        total: 0,
        total_pages: 0,
      }
    }
  }
  async createAccount(
    data: BusinessAccountInsert
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const result = await createBusinessAccountAction(data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error creating business account:', error)
      return { success: false, error: error.message }
    }
  }

  async updateAccount(
    id: string,
    data: BusinessAccountUpdate
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const result = await updateBusinessAccountAction(id, data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error updating business account:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await getSupabaseClient()
      const { error } = await client
        .from('business_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting business account:', error)
      return { success: false, error: error.message }
    }
  }

  async getAccountById(id: string): Promise<BusinessAccount | null> {
    try {
      const result = await getBusinessAccountByIdAction(id)
      return result.data
    } catch (error) {
      console.error('Error fetching business account:', error)
      return null
    }
  }

  async getUserAccounts(userId: string): Promise<BusinessAccount[]> {
    try {
      const result = await getUserBusinessAccountsAction(userId)
      return result.data || []
    } catch (error) {
      console.error('Error fetching user business accounts:', error)
      return []
    }
  }

  async addMember(
    data: BusinessAccountMemberInsert
  ): Promise<{ success: boolean; data?: BusinessAccountMember; error?: string }> {
    try {
      const result = await addAccountMemberAction(data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error adding account member:', error)
      return { success: false, error: error.message }
    }
  }

  async updateMember(
    id: string,
    data: BusinessAccountMemberUpdate
  ): Promise<{ success: boolean; data?: BusinessAccountMember; error?: string }> {
    try {
      const result = await updateAccountMemberAction(id, data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error updating account member:', error)
      return { success: false, error: error.message }
    }
  }

  async removeMember(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await removeAccountMemberAction(id)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true }
    } catch (error: any) {
      console.error('Error removing account member:', error)
      return { success: false, error: error.message }
    }
  }

  async getAccountMembers(accountId: string): Promise<BusinessAccountMember[]> {
    try {
      const result = await getAccountMembersAction(accountId)
      return result.data || []
    } catch (error) {
      console.error('Error fetching account members:', error)
      return []
    }
  }

  async isAccountAdmin(userId: string, accountId: string): Promise<boolean> {
    try {
      const result = await isAccountAdminAction(userId, accountId)
      return result.isAdmin
    } catch (error) {
      console.error('Error checking account admin status:', error)
      return false
    }
  }

  async canCreateBusiness(accountId: string): Promise<boolean> {
    try {
      const result = await canCreateBusinessInAccountAction(accountId)
      return result.canCreate
    } catch (error) {
      console.error('Error checking business creation limit:', error)
      return false
    }
  }

  async createAccountWithOwner(
    accountData: BusinessAccountInsert,
    userProfileId: string
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const accountResult = await this.createAccount(accountData)
      if (!accountResult.success || !accountResult.data) {
        return accountResult
      }

      const memberData: BusinessAccountMemberInsert = {
        business_account_id: accountResult.data.id,
        user_profile_id: userProfileId,
        role: 'owner',
        status: 'active',
        invited_by: accountData.created_by,
        accepted_at: new Date().toISOString(),
      }

      const memberResult = await this.addMember(memberData)
      if (!memberResult.success) {
        return {
          success: false,
          error: `Cuenta creada pero error al agregar owner: ${memberResult.error}`,
        }
      }

      return { success: true, data: accountResult.data }
    } catch (error: any) {
      console.error('Error creating account with owner:', error)
      return { success: false, error: error.message }
    }
  }
}
