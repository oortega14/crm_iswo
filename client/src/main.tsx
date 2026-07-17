import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { bootstrapAuth } from '@/lib/authSession'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from '@/stores/auth'
import { ThemeProvider } from '@/components/common/ThemeProvider'
import { Toaster, toast } from '@/components/ui/sonner'
import '@/index.css'

// Contexto estable: evita remontar RouterProvider cuando cambia logo/color del tenant.
const routerContext = {
  queryClient,
  get auth() {
    return useAuthStore.getState()
  },
}

const router = createRouter({
  routeTree,
  context: routerContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  useEffect(() => {
    const failSafe = window.setTimeout(() => {
      useAuthStore.getState().setLoading(false)
    }, 10_000)

    bootstrapAuth().finally(() => {
      window.clearTimeout(failSafe)
    })

    return () => {
      window.clearTimeout(failSafe)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="crm-iswo-theme">
        <RouterProvider router={router} context={routerContext} />
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.addEventListener('auth:session-expired', ((event: Event) => {
  toast.error((event as CustomEvent).detail.message)
  if (window.location.pathname !== '/login') {
    void router.navigate({ to: '/login', replace: true })
  }
}) as EventListener)
