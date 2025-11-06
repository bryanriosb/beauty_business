'use client'

import BeautyLogo from './BeautyLogo'
import { useSidebar } from './ui/sidebar'

export default function Logo({ className }: { className?: string }) {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="mb-6 px-2">
      <div
        className={`font-bold text-2xl border-b pb-4 flex gap-2 items-center transition-all ${
          isCollapsed ? 'justify-center px-0' : 'px-2'
        } ${className}`}
      >
        <BeautyLogo />
        {!isCollapsed && <span>Beauty</span>}
      </div>
    </div>
  )
}
