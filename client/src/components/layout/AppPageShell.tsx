import { cn } from '@/lib/utils'

type AppPageShellProps = {
  children: React.ReactNode
  /** Clases del contenedor exterior (p. ej. `h-full` para tablero a altura fija) */
  className?: string
  /** Clases del bloque con padding (p. ej. `space-y-10` en el dashboard) */
  contentClassName?: string
}

/**
 * Contenedor de página alineado con el panel principal: padding lateral, bottom safe
 * para la barra móvil, y ritmo vertical homogéneo.
 */
export function AppPageShell({ children, className, contentClassName }: AppPageShellProps) {
  return (
    <div className={cn('relative flex min-h-full flex-col pb-20 lg:pb-6', className)}>
      <div
        className={cn('flex w-full max-w-[100vw] flex-1 flex-col gap-8 p-4 lg:p-6', contentClassName)}
      >
        {children}
      </div>
    </div>
  )
}
