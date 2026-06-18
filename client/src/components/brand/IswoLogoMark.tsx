import { TenantLogoMark } from '@/components/brand/TenantLogoMark'

type Size = 'sm' | 'md' | 'lg'

interface IswoLogoMarkProps {
  size?: Size
  className?: string
  showLabel?: boolean
}

/** @deprecated Preferir TenantLogoMark con slug="iswo" */
export function IswoLogoMark({ size = 'md', className, showLabel = false }: IswoLogoMarkProps) {
  return (
    <TenantLogoMark slug="iswo" size={size} className={className} showLabel={showLabel} />
  )
}
