import { lazy, Suspense, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatRailsError } from '@/lib/api'
import { fetchLandingPageDetail, updateLandingPage } from '@/lib/landingPagesApi'
import { getAuthQueryScope, invalidateLandingPagesQueries, queryKeys } from '@/lib/queryClient'
import type { GrapeJsHandle } from './GrapeJsEditor'

const GrapeJsEditor = lazy(() =>
  import('./GrapeJsEditor').then((m) => ({ default: m.GrapeJsEditor }))
)

interface Props {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  landingId:     string
  landingTitle?: string
}

export function LandingVisualEditorModal({ open, onOpenChange, landingId, landingTitle }: Props) {
  const queryClient = useQueryClient()
  const editorRef   = useRef<GrapeJsHandle>(null)

  const authScope = getAuthQueryScope()

  const { data: landingData, isLoading, isFetched } = useQuery({
    queryKey: queryKeys.landingPages.detail(landingId),
    queryFn: () => fetchLandingPageDetail(landingId),
    enabled: open && Boolean(authScope) && !!landingId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const editor = editorRef.current
      const gjsProject = editor?.getProjectData() ?? {}
      const gjsHtml    = editor?.getHtml()         ?? ''
      const gjsCss     = editor?.getCss()           ?? ''
      const existingContent = (landingData?.attributes?.content ?? {}) as Record<string, unknown>
      await updateLandingPage(landingId, {
        content: {
          ...existingContent,
          gjs_project: gjsProject,
          gjs_html: gjsHtml,
          gjs_css: gjsCss,
        },
        styles: (landingData?.attributes?.styles ?? {}) as Record<string, unknown>,
      })
    },
    onSuccess: () => {
      void invalidateLandingPagesQueries(queryClient)
      toast.success('Diseño guardado')
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo guardar el diseño'))
    },
  })

  const initialProjectData =
    (landingData?.attributes?.content as Record<string, unknown> | undefined)?.gjs_project as
      | Record<string, unknown>
      | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[96vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <DialogTitle className="text-sm">
            Editor visual{landingTitle ? ` — ${landingTitle}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading && !isFetched ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner className="size-8" />
                </div>
              }
            >
              <GrapeJsEditor
                key={landingId}
                ref={editorRef}
                initialProjectData={initialProjectData}
              />
            </Suspense>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={isLoading || saveMutation.isPending}
          >
            {saveMutation.isPending && <Spinner className="mr-2" />}
            Guardar diseño
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
