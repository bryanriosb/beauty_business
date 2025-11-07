export type MemberRole = 'owner' | 'admin' | 'member'
export type MemberStatus = 'active' | 'inactive' | 'pending'

export interface BusinessAccountMember {
  id: string
  business_account_id: string
  user_profile_id: string
  role: MemberRole
  status: MemberStatus
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export class BusinessAccountMember implements BusinessAccountMember {
  id: string
  business_account_id: string
  user_profile_id: string
  role: MemberRole
  status: MemberStatus
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string

  constructor(data: BusinessAccountMember) {
    this.id = data.id
    this.business_account_id = data.business_account_id
    this.user_profile_id = data.user_profile_id
    this.role = data.role
    this.status = data.status
    this.invited_by = data.invited_by
    this.invited_at = data.invited_at
    this.accepted_at = data.accepted_at
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  isOwner(): boolean {
    return this.role === 'owner'
  }

  isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'owner'
  }

  isActive(): boolean {
    return this.status === 'active'
  }

  isPending(): boolean {
    return this.status === 'pending'
  }
}

export interface BusinessAccountMemberInsert {
  business_account_id: string
  user_profile_id: string
  role?: MemberRole
  status?: MemberStatus
  invited_by?: string | null
  invited_at?: string
  accepted_at?: string | null
}

export interface BusinessAccountMemberUpdate {
  role?: MemberRole
  status?: MemberStatus
  accepted_at?: string | null
}
