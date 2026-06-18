import type { LucideIcon } from 'lucide-react'
import { Building2, Home, Landmark, ShieldCheck } from 'lucide-react'
import { resolveTenantBrand, type KnownBrandSlug } from '@/lib/tenantBrand'
import type { Tenant } from '@/types'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, { box: string; icon: string }> = {
  sm: { box: 'h-8 w-8 rounded-md', icon: 'size-4' },
  md: { box: 'h-9 w-9 rounded-lg', icon: 'size-[18px]' },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 'size-6' },
}

const ICONS: Record<KnownBrandSlug, LucideIcon> = {
  iswo: ShieldCheck,
  micasita: Home,
  libranzas: Landmark,
}

interface TenantLogoMarkProps {
  tenant?: Pick<Tenant, 'subdomain' | 'name'> | null
  slug?: string
  size?: Size
  className?: string
  showLabel?: boolean
}

/** Isotipo por vertical F5 — gradiente corporativo + icono sectorial. */
export function TenantLogoMark({
  tenant,
  slug,
  size = 'md',
  className,
  showLabel = false,
}: TenantLogoMarkProps) {
  const brand = resolveTenantBrand(slug ?? tenant)
  const s = sizeClasses[size]

  if (!brand) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
          s.box,
          className,
        )}
        aria-hidden
      >
        <Building2 className={s.icon} />
      </div>
    )
  }

  const Icon = ICONS[brand.slug]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn('flex shrink-0 items-center justify-center', s.box)}
        style={{
          backgroundImage: `linear-gradient(to bottom right, ${brand.primary}, ${brand.gradientTo})`,
          boxShadow: `0 1px 2px ${brand.primary}33, 0 0 0 1px ${brand.accentRing}59`,
        }}
        aria-hidden
      >
        <Icon
          className={s.icon}
          strokeWidth={2.25}
          style={{ color: brand.onPrimary }}
        />
      </div>
      {showLabel && (
        <span className="font-semibold tracking-tight text-sidebar-foreground">{brand.label}</span>
      )}
    </div>
  )
}
