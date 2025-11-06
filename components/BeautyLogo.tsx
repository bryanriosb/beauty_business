import { BriefcaseMedical, Gem, Hospital, Triangle } from 'lucide-react'

export default function BeautyLogo({ className }: { className?: string }) {
  return (
    <div
      className={`bg-primary  h-6 w-6 rounded flex items-center justify-center ${className}`}
    >
      <Gem
        color="#fff"
        // fill="#fff"
        enableBackground="#fff"
        size={20}
      />
    </div>
  )
}
