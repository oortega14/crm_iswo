import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Editor } from 'grapesjs'

export interface GrapeJsHandle {
  getProjectData: () => Record<string, unknown>
  getHtml: () => string
  getCss:  () => string
}

interface Props {
  initialProjectData?: Record<string, unknown>
}

export const GrapeJsEditor = forwardRef<GrapeJsHandle, Props>(({ initialProjectData }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef    = useRef<Editor | null>(null)

  useImperativeHandle(ref, () => ({
    getProjectData: () => editorRef.current?.getProjectData() ?? {},
    getHtml:        () => editorRef.current?.getHtml()         ?? '',
    getCss:         () => editorRef.current?.getCss()          ?? '',
  }))

  useEffect(() => {
    let editor: Editor | null = null

    ;(async () => {
      const [{ default: grapesjs }, { default: webpagePlugin }] = await Promise.all([
        import('grapesjs'),
        import('grapesjs-preset-webpage'),
        import('grapesjs/dist/css/grapes.min.css'),
      ])

      if (!containerRef.current) return

      editor = grapesjs.init({
        container:      containerRef.current,
        plugins:        [webpagePlugin],
        storageManager: false,
        height:         '100%',
        width:          'auto',
      })

      if (initialProjectData && Object.keys(initialProjectData).length > 0) {
        editor.loadProjectData(initialProjectData as Parameters<Editor['loadProjectData']>[0])
      }

      editorRef.current = editor
    })()

    return () => {
      editor?.destroy()
      editorRef.current = null
    }
  // Solo al montar: initialProjectData se pasa una vez desde la modal ya cargada
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
})

GrapeJsEditor.displayName = 'GrapeJsEditor'
