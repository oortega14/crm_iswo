/**
 * Capa ambiental sobre fondo ISWO (#0F172A): acentos azul / cian / violeta suaves.
 */
export function PageAmbientBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#3B82F6]/[0.08] blur-3xl" />
      <div className="absolute -right-20 top-32 h-64 w-64 rounded-full bg-[#6366F1]/[0.06] blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-[#38BDF8]/[0.05] blur-3xl" />
    </div>
  )
}
