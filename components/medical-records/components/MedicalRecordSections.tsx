import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SectionProps {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  variant?: 'default' | 'warning'
}

export function Section({ icon: Icon, title, children, variant = 'default' }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={`h-4 w-4 ${
              variant === 'warning' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface VitalSignItemProps {
  label: string
  value: string
}

export function VitalSignItem({ label, value }: VitalSignItemProps) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}