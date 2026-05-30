import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: React.ReactNode
  description?: string
  /** Contenido entre el título y la descripción (p. ej. fecha en el dashboard) */
  belowTitle?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * Cabecera de pantalla al estilo del panel principal: título grande, subtítulo y acciones a la derecha.
 */
export function PageHeader({ title, description, belowTitle, className, children }: PageHeaderProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {belowTitle}
        {description ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 sm:pt-1">{children}</div>
      ) : null}
    </section>
  )
}
