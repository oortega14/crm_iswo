import { createFileRoute } from '@tanstack/react-router'
import { PublicLandingPage } from '@/components/landings/PublicLandingPage'
import { landingUtmSearchSchema } from '@/lib/landingSearch'

export const Route = createFileRoute('/l/$slug')({
  validateSearch: landingUtmSearchSchema,
  component: LegacyLandingRoute,
})

/** Ruta legacy /l/:slug — fallback en localhost plano (?tenant=). */
function LegacyLandingRoute() {
  const { slug } = Route.useParams()
  return <PublicLandingPage slug={slug} />
}
