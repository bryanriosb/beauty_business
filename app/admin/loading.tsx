import Loading from '@/components/ui/loading'

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-3">
        <Loading className="w-8 h-8" />
        <p className="text-muted-foreground text-sm">
          <Loading />
        </p>
      </div>
    </div>
  )
}
