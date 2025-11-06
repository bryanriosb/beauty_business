import BeautyLogo from './BeautyLogo'

export default function Logo({ className }: { className?: string }) {
  return (
    <div className="h-8  w-full p-2 mb-10">
      <div
        className={`font-bold text-2xl h-full border-b p-6 flex gap-2 items-center ${className}`}
      >
        <BeautyLogo />
        <span>Beauty</span>
      </div>
    </div>
  )
}
